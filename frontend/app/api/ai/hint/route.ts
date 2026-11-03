import { NextRequest, NextResponse } from "next/server";
import {
  computeContentHash,
  computeCacheKey,
  resolveStableExerciseId,
  getCachedHint,
  saveCachedHint,
} from "@/lib/hint-cache";
import { autoWrapLatexExpressions } from "@/lib/math-parser";
import { generateGeminiContent } from "@/lib/gemini";
import { generateNvidiaContent, getNvidiaApiKeys } from "@/lib/nvidia";
import { safeParseJsonWithLatex } from "@/lib/json-safe";

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
    const { stableId, numericId } = resolveStableExerciseId(exercise_id || id || questao_id, contentHash);
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
        console.warn("[Tutor Socrático] Erro na consulta de cache local, prosseguindo:", cacheLookupErr);
      }
    }

    // 1. Backend FastAPI (timeout curto de 3.5s para evitar congelamento em cold-start do Render)
    if (authorization?.startsWith("Bearer ")) {
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
            subtopico: subtopico || null,
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
          signal: AbortSignal.timeout(3500),
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
        console.warn("[Tutor Socrático] Backend não retornou dica no prazo (3.5s), acionando inferência direta.");
      } catch (fetchErr: unknown) {
        console.warn("[Tutor Socrático] Timeout/erro no backend FastAPI (3.5s), acionando inferência direta:", fetchErr instanceof Error ? fetchErr.message : fetchErr);
      }
    }

    // 2. Inferência Direta Resiliente (Gemini Cascade -> NVIDIA NIM Nemotron)
    const PROMPT_SISTEMA_HINT = `Você é o Tutor Socrático do LEMMAS (MathAI Engine).
Gere uma dica pedagógica do NÍVEL ${level} (1 a 5) para a questão matemática abaixo.

NÍVEIS DE DICA:
1. Simbologia/Notação — Identificar símbolos, definir termos, esclarecer notação sem entregar a conta
2. Primeiro Passo no Rascunho — Indicar a primeira manipulação algébrica ou construção geométrica
3. Encadeamento Dedutivo Intermediário — Conectar passos e mostrar como avançar na dedução
4. Pulo do Gato/Pegadinha de Banca — Revelar o insight decisivo ou armadilha comum da questão
5. Resolução Oficial Definitiva — Demonstração completa passo a passo com conclusão explícita

REGRAS MANDATÓRIAS DE LATEX E FORMATAÇÃO:
- Use LaTeX delimitado por $...$ (inline) ou $$...$$ (bloco) EXCLUSIVAMENTE para símbolos, variáveis, números e expressões matemáticas.
- NUNCA coloque texto explicativo em português ou frases inteiras dentro de $...$ ou $$...$$ (pois o KaTeX remove espaços entre palavras dentro de $).
- Para trigonometria brasileira: \\sen para seno, \\tg para tangente.
- Escape contrabarras no JSON como \\\\ (ex: \\\\frac, \\\\sqrt, \\\\sen).
- Retorne EXCLUSIVAMENTE o objeto JSON especificado.

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
${subtopico ? `SUBTÓPICO: ${subtopico}` : ""}
${body.justificativa || body.rascunho || tentativas_anteriores ? `\nRASCUNHO/TENTATIVA DO ESTUDANTE:\n${body.justificativa || body.rascunho || tentativas_anteriores}` : ""}

PREFERÊNCIA PEDAGÓGICA: ${pref}
${foco_concurso ? `FOCO CONCURSO: ${foco_concurso}` : ""}
${motivacoes && motivacoes.length > 0 ? `MOTIVAÇÕES: ${motivacoes.join(", ")}` : ""}

INSTRUÇÃO: Gere a dica do nível ${level} conforme a pedagogia socrática. Retorne apenas o JSON.`;

    // 2.1 Gemini (primário - rápido, ~1.8s via gemini-3-flash-preview)
    try {
      const geminiRes = await generateGeminiContent({
        prompt: hintPrompt,
        systemInstruction: PROMPT_SISTEMA_HINT,
        jsonOutput: true,
        temperature: 0.15,
        maxTokens: 1536,
        timeoutMs: 9000,
      });

      const parsed = safeParseJsonWithLatex(geminiRes.text);
      const hintText = parsed?.hint_text || parsed?.dica || parsed?.hint;
      if (hintText && typeof hintText === "string") {
        const formattedHint = autoWrapLatexExpressions(hintText);
        if (use_cache && !isIndividualized) {
          saveCachedHint({
            cacheKey,
            exerciseId: stableId,
            questaoId: numericId,
            level,
            pedagogicalPreference: pref,
            contentHash,
            hintText: formattedHint,
            modelUsed: geminiRes.model,
            provider: "google",
          }).catch(() => {});
        }
        return NextResponse.json({
          nivel: parsed.level || parsed.nivel || level,
          dica: formattedHint,
          modelo: geminiRes.model,
          provedor: "google",
          confianca: 0.95,
          cached: false,
          cache_key: cacheKey,
        });
      }
    } catch (geminiErr) {
      console.warn("[Tutor Socrático] Gemini indisponível, acionando NVIDIA NIM:", geminiErr instanceof Error ? geminiErr.message : geminiErr);
    }

    // 2.2 NVIDIA NIM (secundário - Nemotron 3 Nano Omni / 3.5 Lightning, <1.0s)
    if (getNvidiaApiKeys().length > 0) {
      try {
        const nvidiaRes = await generateNvidiaContent({
          prompt: `${hintPrompt}\n\nIMPORTANTE: Retorne EXCLUSIVAMENTE o objeto JSON válido.`,
          systemInstruction: PROMPT_SISTEMA_HINT,
          temperature: 0.15,
          maxTokens: 1536,
          timeoutMs: 9000,
        });

        const parsed = safeParseJsonWithLatex(nvidiaRes.text);
        const hintText = parsed?.hint_text || parsed?.dica || parsed?.hint;
        if (hintText && typeof hintText === "string") {
          const formattedHint = autoWrapLatexExpressions(hintText);
          if (use_cache && !isIndividualized) {
            saveCachedHint({
              cacheKey,
              exerciseId: stableId,
              questaoId: numericId,
              level,
              pedagogicalPreference: pref,
              contentHash,
              hintText: formattedHint,
              modelUsed: nvidiaRes.model,
              provider: "nvidia-nemotron",
            }).catch(() => {});
          }
          return NextResponse.json({
            nivel: parsed.level || parsed.nivel || level,
            dica: formattedHint,
            modelo: nvidiaRes.model,
            provedor: "nvidia-nemotron",
            confianca: 0.95,
            cached: false,
            cache_key: cacheKey,
          });
        }
      } catch (nvidiaErr) {
        console.warn("[Tutor Socrático] Fallback NVIDIA NIM falhou:", nvidiaErr instanceof Error ? nvidiaErr.message : nvidiaErr);
      }
    }

    // 3. Se Nível 5 e houver solução comentada válida no banco, entrega como último recurso honesto
    if (level === 5 && cleanedSolucao && cleanedSolucao.length > 25) {
      return NextResponse.json({
        nivel: 5,
        dica: autoWrapLatexExpressions(cleanedSolucao),
        modelo: "Gabarito Comentado Oficial",
        provedor: "lemmas-repertorio",
        confianca: 1.0,
        cached: false,
        cache_key: cacheKey,
      });
    }

    // 4. Falha real de todos os provedores cognitivos (HTTP 503 sem mascarar com texto estático)
    return NextResponse.json(
      {
        error: "O serviço de tutoria socrática está temporariamente indisponível. Todos os provedores cognitivos estão sobrecarregados.",
        status: "unavailable",
      },
      { status: 503 }
    );
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro interno no Tutor Socrático" },
      { status: 500 }
    );
  }
}
