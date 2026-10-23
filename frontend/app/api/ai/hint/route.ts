import { NextRequest, NextResponse } from "next/server";
import {
  computeContentHash,
  computeCacheKey,
  resolveStableExerciseId,
  getCachedHint,
} from "@/lib/hint-cache";
import { autoWrapLatexExpressions } from "@/lib/math-parser";
import { generateGeminiContent } from "@/lib/gemini";
import { generateNvidiaContent } from "@/lib/nvidia";
import { generateOmniRouteContent } from "@/lib/omniroute";

// Node.js process types for process.env
/// <reference types="node" />

// Limite máximo de execução na Vercel (Edge/Serverless Function)
export const maxDuration = 30;

const BACKEND_URL = (process.env.LEMMAS_BACKEND_URL || "https://mathai-7i7r.onrender.com").replace(/\/$/, "");

function sanitizeAuthorOrTopic(topico: string, materia?: string): string {
  if (!topico) return materia || "Matemática";
  const isAuthorOrCountry = /mold[aá]via|denis|sidorov|olympiad|author|contest|[a-z]+,\s*[a-z]+/i.test(topico);
  return isAuthorOrCountry ? (materia || "Matemática") : topico;
}

function cleanRawSolution(raw: string): string {
  if (!raw) return "";
  return raw
    .replace(/\[asy\][\s\S]*?\[\/asy\]/gi, "")
    .replace(/<img[^>]*>/gi, "")
    .replace(/!\[.*?\]\(.*?\)/gi, "")
    .trim();
}

export async function POST(req: NextRequest) {
  try {
    const authorization = req.headers.get("authorization");
    if (!authorization?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Sessão ausente. Entre novamente no Lemmas." }, { status: 401 });
    }

    const body = await req.json();
    const {
      exercise_id,
      id,
      questao_id,
      enunciado,
      materia,
      topico = "Matemática",
      subtopico,
      gabarito,
      solucao,
      nivel = 1,
      pedagogicalPreference,
      pedagogical_preference,
      foco_concurso,
      motivacoes,
      tentativas_anteriores,
      use_cache = true,
    } = body;

    if (!enunciado || typeof enunciado !== "string") {
      return NextResponse.json({ error: "Enunciado é obrigatório." }, { status: 400 });
    }

    const level = Math.min(5, Math.max(1, Number(nivel) || 1));
    const pref = pedagogical_preference || pedagogicalPreference || "conceitual";
    const cleanTopico = sanitizeAuthorOrTopic(topico, materia);
    const cleanedSolucao = cleanRawSolution(solucao || "");
    const cleanedGabarito = cleanRawSolution(gabarito || "");

    // 0. Resolução de ID estável e cálculo da chave lógica de cache
    const contentHash = computeContentHash(enunciado, cleanedSolucao, cleanedGabarito);
    const { stableId } = resolveStableExerciseId(exercise_id || id || questao_id, contentHash);
    const cacheKey = computeCacheKey(stableId, level, pref, contentHash);

    // Regra Crítica: Dicas individualizadas com rascunho ou histórico de erros não usam nem poluem o cache base
    const isIndividualized = Boolean(tentativas_anteriores || body.justificativa || body.rascunho);

    // 0.1 Consulta rápida ao Cache Persistente no Supabase (se habilitado e requisição for dica-base)
    if (use_cache && !isIndividualized) {
      try {
        const cached = await getCachedHint(cacheKey);
        if (cached && cached.hint_text) {
          return NextResponse.json({
            nivel: level,
            dica: autoWrapLatexExpressions(cached.hint_text),
            modelo: cached.model_used || "socratic-engine",
            provedor: cached.provider || "supabase-cache",
            confianca: 0.99,
            cached: true,
            cache_key: cacheKey,
          });
        }
      } catch (cacheLookupErr) {
        console.warn("[Tutor Socrático] Erro na consulta de cache local, prosseguindo para o Backend:", cacheLookupErr);
      }
    }

    // 1. Backend FastAPI (timeout curto 8s para evitar sequestro do maxDuration da Vercel)
        try {
          const response = await fetch(BACKEND_URL + "/api/tutor/hint", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: authorization,
            },
            body: JSON.stringify({
              exercise_id: stableId,
              enunciado,
              level,
              materia: materia || "Matemática",
              topico: cleanTopico,
              gabarito: cleanedGabarito,
              solucao: cleanedSolucao,
              estrategias_esperadas: [],
              pedagogical_preference: pref,
              pedagogicalPreference: pref,
              foco_concurso: foco_concurso || null,
              motivacoes: Array.isArray(motivacoes) ? motivacoes : [],
              use_cache,
              tentativas_anteriores: tentativas_anteriores || null,
              justificativa_texto: body.justificativa || body.rascunho || null,
            }),
            signal: AbortSignal.timeout(8000),
            cache: "no-store",
          });

          if (response.ok) {
            const data = await response.json();
            if (data.hint_text) {
              return NextResponse.json({
                nivel: data.level || level,
                dica: autoWrapLatexExpressions(data.hint_text),
                modelo: data.model_used || "fastapi-tutor",
                provedor: data.provider || "backend",
                confianca: 0.95,
                cached: data.cached || false,
                cache_key: data.cache_key || cacheKey,
              });
            }
          }
          // Se backend falhou, cai para fallback direto
          console.warn("[Tutor Socrático] Backend falhou ou timeout (8s), acionando fallback Gemini direto");
        } catch (fetchErr: unknown) {
          console.warn("[Tutor Socrático] Erro ou timeout na conexão com backend FastAPI (8s), acionando fallback:", fetchErr);
        }

        // 2. Fallback Primário: Gemini REST API (Tutor Socrático - dicas socráticas)
        const PROMPT_SISTEMA_HINT = `Você é o Tutor Socrático do LEMMAS (MathAI Engine).
    Gere uma dica pedagógica do NÍVEL ${level} (1 a 5) para a questão matemática abaixo.

    NÍVEIS DE DICA:
    1. Simbologia/Notação — Identificar símbolos, definir termos, esclarecer notação
    2. Primeiro Passo no Rascunho — Indicar a primeira manipulação ou construção geométrica
    3. Encadeamento Dedutivo Intermediário — Conectar passos, mostrar como avançar
    4. Pulo do Gato/Pegadinha de Banca — Revelar o insight decisivo ou armadilha comum
    5. Resolução Oficial Definitiva — Demonstração completa passo a passo (após confirmação do estudante)

    REGRAS:
    - Use LaTeX delimitado por $...$ (inline) ou $$...$$ (bloco) para TODAS as expressões matemáticas
    - NUNCA coloque texto explicativo em português dentro de $...$
    - Para trigonometria brasileira: \\sen para seno, \\tg para tangente
    - Retorne EXCLUSIVAMENTE o objeto JSON especificado

    FORMATO DE RESPOSTA OBRIGATÓRIO (JSON PURO):
    {
      "hint_text": "Dica socrática completa com LaTeX em $...$ e $$...$$",
      "level": ${level},
      "is_valid_commented_solution": ${level === 5 ? "true" : "false"}
    }`;

        const hintPrompt = `Questão para Dica Socrática (Nível ${level}):

    ENUNCIADO:
    ${enunciado}

    ${cleanedGabarito ? `GABARITO: ${cleanedGabarito}` : ""}
    ${cleanedSolucao ? `SOLUÇÃO OFICIAL: ${cleanedSolucao}` : ""}
    MATÉRIA: ${materia || "Matemática"}
    TÓPICO: ${cleanTopico}
    ${body.justificativa || body.rascunho ? `\nRASCUNHO/JUSTIFICATIVA DO ESTUDANTE:\n${body.justificativa || body.rascunho}` : ""}

    PREFERÊNCIA PEDAGÓGICA: ${pref}
    ${foco_concurso ? `FOCO CONCURSO: ${foco_concurso}` : ""}
    ${motivacoes && motivacoes.length > 0 ? `MOTIVAÇÕES: ${motivacoes.join(", ")}` : ""}

    INSTRUÇÃO: Gere a dica do nível ${level} conforme a pedagogia socrática.`;

        // 2. OmniRoute (Azure) — gateway com fallback interno (NVIDIA → Gemini → Llama)
        // Chamado ANTES do Gemini/NVIDIA diretos para não travar esperando a NVIDIA demorar
        if (process.env.OMNIROUTE_API_KEY) {
          try {
            const omniRes = await generateOmniRouteContent({
              prompt: `${hintPrompt}\n\nIMPORTANTE: Retorne EXCLUSIVAMENTE o objeto JSON válido.`,
              systemInstruction: PROMPT_SISTEMA_HINT,
              temperature: 0.15,
              maxTokens: 1024,
              timeoutMs: 12000, // timeout curto: se travar, cai para o próximo
            });

            const parsed = JSON.parse(omniRes.text);
            if (parsed && parsed.hint_text) {
              return NextResponse.json({
                nivel: parsed.level || level,
                dica: autoWrapLatexExpressions(parsed.hint_text),
                modelo: omniRes.model,
                provedor: "omniroute-azure",
                ia_usada: "OmniRoute (Azure) - MathAI",
                confianca: 0.9,
                cached: false,
                cache_key: cacheKey,
              });
            }
          } catch (omniErr) {
            console.warn("[Tutor Socrático] Fallback OmniRoute falhou:", omniErr);
          }
        }

        // 2.1 Gemini (primário - rápido, <1.5s)
        try {
          const geminiRes = await generateGeminiContent({
            prompt: hintPrompt,
            systemInstruction: PROMPT_SISTEMA_HINT,
            jsonOutput: true,
            temperature: 0.15,
            maxTokens: 1024,
            timeoutMs: 10000, // reduziu de 14000 para 10000
          });

          const parsed = JSON.parse(geminiRes.text);
          if (parsed && parsed.hint_text) {
            return NextResponse.json({
              nivel: parsed.level || level,
              dica: autoWrapLatexExpressions(parsed.hint_text),
              modelo: geminiRes.model,
              provedor: "gemini-flash-lite",
              confianca: 0.9,
              cached: false,
              cache_key: cacheKey,
            });
          }
        } catch (geminiErr) {
          console.warn("[Tutor Socrático] Gemini indisponível, acionando NVIDIA NIM:", geminiErr);
        }

        // 2.2 NVIDIA NIM (secundário - Nemotron Reasoning)
        if (process.env.NVIDIA_API_KEY) {
          try {
            const nvidiaRes = await generateNvidiaContent({
              prompt: `${hintPrompt}\n\nIMPORTANTE: Retorne EXCLUSIVAMENTE o objeto JSON válido.`,
              systemInstruction: PROMPT_SISTEMA_HINT,
              temperature: 0.15,
              maxTokens: 1024,
              timeoutMs: 10000, // reduziu de 14000 para 10000
            });

            const parsed = JSON.parse(nvidiaRes.text);
            if (parsed && parsed.hint_text) {
              return NextResponse.json({
                nivel: parsed.level || level,
                dica: autoWrapLatexExpressions(parsed.hint_text),
                modelo: nvidiaRes.model,
                provedor: "nvidia-nemotron",
                confianca: 0.9,
                cached: false,
                cache_key: cacheKey,
              });
            }
          } catch (nvidiaErr) {
            console.warn("[Tutor Socrático] Fallback NVIDIA NIM falhou:", nvidiaErr);
          }
        }

        // 2.3 OmniRoute (Azure) — gateway com fallback interno (NVIDIA → Gemini → Llama)
        if (process.env.OMNIROUTE_API_KEY) {
          try {
            const omniRes = await generateOmniRouteContent({
              prompt: `${hintPrompt}\n\nIMPORTANTE: Retorne EXCLUSIVAMENTE o objeto JSON válido.`,
              systemInstruction: PROMPT_SISTEMA_HINT,
              temperature: 0.15,
              maxTokens: 1024,
              timeoutMs: 18000,
            });

            const parsed = JSON.parse(omniRes.text);
            if (parsed && parsed.hint_text) {
              return NextResponse.json({
                nivel: parsed.level || level,
                dica: autoWrapLatexExpressions(parsed.hint_text),
                modelo: omniRes.model,
                provedor: "omniroute-azure",
                ia_usada: "OmniRoute (Azure) - MathAI",
                confianca: 0.9,
                cached: false,
                cache_key: cacheKey,
              });
            }
          } catch (omniErr) {
            console.warn("[Tutor Socrático] Fallback OmniRoute falhou:", omniErr);
          }
        }

        // 3. Fallback Determinístico (Uptime 100% garantido)
        const fallbackHints: Record<number, string> = {
          1: "Identifique os símbolos e notações matemáticas no enunciado. O que cada letra representa? Quais são as grandezas conhecidas e desconhecidas?",
          2: "Escreva o primeiro passo no rascunho: qual teorema, definição ou propriedade se aplica diretamente às hipóteses dadas?",
          3: "Conecte o passo anterior ao seguinte: como a conclusão parcial leva naturalmente à próxima etapa da demonstração?",
          4: "Observe a pegadinha: há alguma condição implícita, sinal trocado ou caso especial que a banca costuma explorar neste tópico?",
          5: `Gabarito oficial: $${cleanedGabarito || "ver enunciado"}$. Resolução completa: 1) Organize os dados. 2) Aplique o teorema fundamental. 3) Execute os cálculos. 4) Verifique a consistência dimensional e sinal. 5) Conclua.`,
        };

        return NextResponse.json({
          nivel: level,
          dica: autoWrapLatexExpressions(fallbackHints[level] || fallbackHints[1]),
          modelo: "LEMMAS Core Determinístico",
          provedor: "lemmas-contingency",
          confianca: 0.7,
          cached: false,
          cache_key: cacheKey,
        });
      } catch (err: unknown) {
        return NextResponse.json(
          { error: err instanceof Error ? err.message : "Erro interno no Tutor Socrático" },
          { status: 500 }
        );
      }
    }
