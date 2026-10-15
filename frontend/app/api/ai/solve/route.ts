import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = (process.env.LEMMAS_BACKEND_URL || "https://mathai-7i7r.onrender.com").replace(/\/$/, "");

export async function POST(req: NextRequest) {
  try {
    const authorization = req.headers.get("authorization");
    const body = await req.json();
    const { enunciado, gabarito, justificativa, imagem_base64 } = body;
    if (!enunciado || typeof enunciado !== "string") {
      return NextResponse.json({ error: "Enunciado é obrigatório." }, { status: 400 });
    }

    let mimeType = "image/png";
    let cleanImage = imagem_base64 || undefined;
    if (typeof imagem_base64 === "string" && imagem_base64.startsWith("data:")) {
      const match = imagem_base64.match(/^data:([^;]+);base64,(.*)$/);
      if (match) {
        mimeType = match[1];
        cleanImage = match[2];
      }
    }

    // 1. Autoridade Única: Backend FastAPI (Render / Local) com tolerância a cold start (45s)
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (authorization?.startsWith("Bearer ")) {
        headers["Authorization"] = authorization;
      }

      const response = await fetch(BACKEND_URL + "/api/tutor/evaluate", {
        method: "POST",
        headers,
        body: JSON.stringify({
          enunciado,
          gabarito: gabarito || "",
          justificativa_texto: justificativa || "",
          imagem_base64: cleanImage,
          mime_type: mimeType,
        }),
        signal: AbortSignal.timeout(45000), // Tolerância estendida a cold-start
        cache: "no-store",
      });

      if (response.ok) {
        const raw = await response.text();
        let data: Record<string, any>;
        try {
          data = JSON.parse(raw);
        } catch {
          data = { detail: raw.slice(0, 500) };
        }
        const rawVeredito = data.veredito || (data.status_resolucao === "correto" ? "aprovado" : data.status_resolucao === "erro_conta_sinal" ? "parcial" : "incorreto");
        return NextResponse.json({
          ...data,
          veredito: rawVeredito,
          desenvolvimento_presente: data.desenvolvimento_presente ?? (rawVeredito !== "sem_desenvolvimento"),
          resultado_final_correto: data.resultado_final_correto ?? (rawVeredito === "aprovado"),
          etapas_corretas: data.etapas_corretas || data.passos || [],
          erros_identificados: data.erros_identificados || (data.linha_do_erro ? [data.linha_do_erro] : []),
          feedback_latex: data.feedback_latex || data.diagnostico || "Avaliação discursiva concluída com sucesso.",
          precisa_revisao_humana: Boolean(data.precisa_revisao_humana),
          status_resolucao: data.status_resolucao || (rawVeredito === "aprovado" ? "correto" : "incompleto"),
          diagnostico: data.diagnostico || data.feedback_latex || "Não foi possível produzir um diagnóstico detalhado.",
          modelo: data.model_name || "MathAI Engine",
          provedor: data.model_provider || "lemmas",
          confianca: data.confianca_diagnostico || "alta",
        });
      }
    } catch (backendErr) {
      console.warn("[MathAI Proxy] Backend FastAPI indisponível ou timeout, acionando contingência determinística:", backendErr);
    }

    // 2. Contingência quando o backend FastAPI estiver indisponível
    // REGRA MANDATÓRIA: O fallback da rota frontend NÃO produz vereditos matemáticos definitivos
    // ("aprovado" ou "incorreto") quando o backend avaliador estiver indisponível!
    const rawJustificativa = (justificativa || "").trim();
    const hasImage = Boolean(cleanImage);

    // Detecção estruturada de desenvolvimento matemático
    const isSingleFinalAnswer = [
      /^\s*\(?[a-eA-E]\)?\s*$/,
      /^\s*(?:resposta|gabarito|letra|opção|opcao)?\s*(?:é|e|:)?\s*\(?[a-eA-E]\)?\s*$/i,
      /^\s*-?\d+(?:[.,]\d+)?\s*$/,
      /^\s*(?:resposta|gabarito|resultado)?\s*(?:é|e|:)?\s*-?\d+(?:[.,]\d+)?\s*$/i,
      /^\s*[a-zA-Z]\s*=\s*-?\d+(?:[.,]\d+)?\s*$/i,
      /^\s*(?:acho que é|deu|resultado final:?|afirmo que)\s*.*$/i,
    ].some((p) => p.test(rawJustificativa));

    const cleanLower = rawJustificativa.toLowerCase();
    const hasDeduction = [
      "=>", "->", "\\implies", "\\iff", "\\therefore", "\\because",
      "logo", "portanto", "como", "seja", "temos", "onde", "donde", "segue que"
    ].some((m) => cleanLower.includes(m));

    const hasMathSymbols = [
      "\\sqrt", "\\frac", "\\sum", "\\int", "\\lim", "\\det", "\\log",
      "\\sen", "\\cos", "\\tg", "\\equiv", "\\pmod", "\\binom", "\\le", "\\ge", "\\neq",
      "det(", "sen(", "cos(", "tg(", "log(", "sqrt("
    ].some((s) => rawJustificativa.includes(s));

    const hasGeom = [
      "segment", "circle", "line", "point", "midpoint", "polygon",
      "perpendicular", "bisector", "intersect", "tangent"
    ].some((g) => cleanLower.includes(g));

    const opMatches = rawJustificativa.match(/[=+\-*/\\^<>]/g) || [];
    const lines = rawJustificativa.split("\n").map((l: string) => l.trim()).filter(Boolean);
    const hasEquations = rawJustificativa.includes("=") && /[xyznkacfP]/.test(rawJustificativa);

    const hasDevelopment = hasImage || hasDeduction || hasMathSymbols || hasGeom || (lines.length >= 2 && opMatches.length >= 2) || (hasEquations && opMatches.length >= 2);

    // Caso 1: Aluno forneceu apenas resposta final, rascunho em branco ou texto sem matemática
    if (!hasDevelopment || isSingleFinalAnswer || (!hasImage && rawJustificativa.length === 0)) {
      return NextResponse.json({
        veredito: "sem_desenvolvimento",
        desenvolvimento_presente: false,
        resultado_final_correto: false,
        etapas_corretas: [],
        erros_identificados: ["Ausência de passos, deduções e operações intermediárias verificáveis."],
        feedback_latex: "Você indicou apenas o resultado final ou enviou um texto curto. Em questões discursivas é obrigatório demonstrar o raciocínio matemático (na Lousa, GeoGebra ou Foto/Dedução) para validar os pontos.",
        precisa_revisao_humana: false,
        status_resolucao: "incompleto",
        diagnostico: "Você indicou o resultado final, mas em questões discursivas é obrigatório demonstrar o raciocínio (na Lousa, GeoGebra ou Foto/Dedução) para validar os pontos.",
        dica_proximo_passo: "Apresente o passo a passo matemático na Bancada de Resolução.",
        estrategia_identificada: "Apenas Resultado Final",
        modelo: "LEMMAS Core Determinístico",
        provedor: "lemmas-autonomous",
        confianca: "alta",
      });
    }

    // Caso 2: Aluno forneceu desenvolvimento real, mas o motor backend está temporariamente indisponível
    // Retorno honesto inconclusivo: preserva o rascunho e não inventa nota/veredito definitivo
    return NextResponse.json({
      veredito: "sem_desenvolvimento",
      desenvolvimento_presente: true,
      resultado_final_correto: false,
      etapas_corretas: [],
      erros_identificados: [],
      feedback_latex: "O motor de avaliação cognitiva da MathAI Engine está temporariamente indisponível para emitir um veredito definitivo. Seu rascunho e desenvolvimento foram mantidos intactos na Bancada. Por favor, reenvie a avaliação em instantes.",
      precisa_revisao_humana: true,
      status_resolucao: "inconclusivo",
      diagnostico: "Avaliação discursiva inconclusiva devido à contingência temporária do serviço de inferência. Nenhuma penalidade ou pontuação incorreta foi atribuída ao estudante.",
      dica_proximo_passo: "Mantenha seu rascunho na tela e clique em reenviar avaliação assim que a conexão restabelecer.",
      estrategia_identificada: "Desenvolvimento Sob Análise",
      modelo: "LEMMAS Contingência Inconclusiva",
      provedor: "lemmas-proxy",
      confianca: "baixa",
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro desconhecido no MathAI Engine" },
      { status: 500 }
    );
  }
}
