import { NextRequest, NextResponse } from "next/server";
import {
  computeContentHash,
  computeCacheKey,
  resolveStableExerciseId,
  getCachedHint,
} from "@/lib/hint-cache";
import { autoWrapLatexExpressions } from "@/lib/math-parser";

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

    try {
      const response = await fetch(`${BACKEND_URL}/api/tutor/hint`, {
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
        signal: AbortSignal.timeout(19000),
        cache: "no-store",
      });

      if (!response.ok) {
        console.warn("[Tutor Socrático] Backend respondeu com erro:", response.status);
        return NextResponse.json(
          { error: "O Tutor Socrático está temporariamente indisponível. Tente novamente em instantes." },
          { status: response.status === 503 ? 503 : 502 }
        );
      }

      const data = await response.json();
      if (!data.hint_text) {
        console.error("[Tutor Socrático] Backend retornou uma dica vazia.");
        return NextResponse.json(
          { error: "O serviço de tutoria retornou uma resposta incompleta." },
          { status: 502 }
        );
      }

      return NextResponse.json({
        nivel: data.level || level,
        dica: autoWrapLatexExpressions(data.hint_text),
        modelo: data.model_used || "fastapi-tutor",
        provedor: data.provider || "backend",
        confianca: 0.95,
        cached: data.cached || false,
        cache_key: data.cache_key || cacheKey,
      });
    } catch (backendErr) {
      console.error("[Tutor Socrático] Falha ou timeout na chamada ao backend:", backendErr);
      return NextResponse.json(
        { error: "Não foi possível conectar ao serviço cognitivo. Tente novamente em instantes." },
        { status: 503 }
      );
    }
  } catch (err) {
    console.error("[Tutor Socrático] Erro ao processar a solicitação:", err);
    return NextResponse.json(
      { error: "Erro interno ao processar a dica socrática." },
      { status: 500 }
    );
  }
}
