import { NextRequest, NextResponse } from "next/server";
import { generateGeminiContent } from "@/lib/gemini";
import { generateNvidiaContent, getNvidiaApiKeys } from "@/lib/nvidia";
import { safeParseJsonWithLatex } from "@/lib/json-safe";

const BACKEND_URL = (process.env.LEMMAS_BACKEND_URL || "https://mathai-7i7r.onrender.com").replace(/\/$/, "");

export const maxDuration = 30;

interface BackendEvaluationPayload {
  [key: string]: unknown;
  veredito?: string;
  status_resolucao?: string;
  desenvolvimento_presente?: boolean;
  resultado_final_correto?: boolean;
  etapas_corretas?: unknown[];
  passos?: unknown[];
  erros_identificados?: unknown[];
  linha_do_erro?: string | null;
  feedback_latex?: string;
  precisa_revisao_humana?: boolean;
  diagnostico?: string;
  model_name?: string;
  model_provider?: string;
  confianca_diagnostico?: string;
}

const PROMPT_SISTEMA_AVALIADOR = `Você é o Avaliador Cognitivo e Tutor de Resoluções Matemáticas do LEMMAS (MathAI Engine), especializado em avaliação passo a passo e resolução axiomática de alto nível (IME, ITA, EsPCEx, AFA, EFOMM, OBM, ENEM).

PRINCÍPIO EPISTÊMICO FUNDAMENTAL: EVIDÊNCIA ANTES DE INFERÊNCIA
- Avalie o desenvolvimento matemático a partir do encadeamento lógico de passos, e NÃO apenas pela resposta final.
- Analise estritamente aquilo que está explicitamente escrito, justificado ou desenhado.
- Se houver imagem ou rascunho anexado, realize a transcrição OCR das equações manuscritas.
- Identifique o primeiro ponto em que o procedimento deixa de ser matematicamente válido.
- Uma resolução curta como $5 * 7 / 2 = 17,5$ pode demonstrar todo o procedimento necessário. Não exija texto longo artificialmente.
- Transcreva fielmente também resultados intermediários e finais. Nunca substitua algarismos para fazer a conta bater.
- Se houver ambiguidade visual (por exemplo 5/8), retorne "ocr_ambiguo": true e "precisa_revisao_humana": true. Dúvida de leitura não é erro matemático confirmado.

VEREDITO CATEGORIAL OBRIGATÓRIO (veredito):
Deve ser EXATAMENTE um dos quatro valores:
1. "aprovado": Desenvolvimento matemático válido e completo, com justificativa suficiente e resultado correto.
2. "parcial": Desenvolvimento matemático relevante e essencialmente correto, mas com deslize pontual de cálculo aritmético, erro de sinal ou etapa incompleta.
3. "sem_desenvolvimento": O estudante apresentou apenas o resultado final (ex: "B", "42", "x=5"), texto genérico ou rascunho sem etapas verificáveis.
4. "incorreto": Tentativa de desenvolvimento que apresenta erro conceitual, algébrico ou lógico invalidando a demonstração.

CLASSIFICAÇÃO DO STATUS (status_resolucao):
- "correto": raciocínio matematicamente válido e resposta compatível.
- "erro_conta_sinal": raciocínio correto com erro numérico ou de sinal aritmético.
- "erro_algebraico": manipulação algébrica inválida, simplificação incorreta ou cancelamento proibido.
- "erro_conceitual": aplicação incorreta de teorema, lema, definição ou hipótese.
- "erro_interpretacao": leitura incorreta do enunciado ou dados.
- "incompleto": resolução interrompida ou sem elementos suficientes.

ALTERNATIVA IDENTIFICADA (alternativa_identificada):
- Se a questão for objetiva (múltipla escolha com A, B, C, D, E) e você identificar que a dedução manuscrita/texto chega ou conclui expressamente uma alternativa, indique a letra maiúscula ("A", "B", "C", "D" ou "E"). Caso contrário ou em discursivas puras, retorne null.

REGRAS MANDATÓRIAS DE LATEX E FORMATAÇÃO:
- Em TODOS os campos de texto do JSON ("feedback_latex", "diagnostico", "dica_proximo_passo", "transcricao_latex", "etapas_corretas", "erros_identificados"), use os delimitadores $...$ (inline) ou $$...$$ (bloco destacado) EXCLUSIVAMENTE para símbolos, números, incógnitas e fórmulas matemáticas.
- É TERMINANTEMENTE PROIBIDO colocar texto em português, explicações ou frases inteiras dentro de $...$ ou $$...$$, pois o KaTeX apaga todos os espaços entre palavras dentro de $.
- Todo texto explicativo em português DEVE estar fora de $, com espaços normais, intercalando apenas as variáveis pontuais entre $.
- NUNCA use \\( ou \\[. Use sempre $ e $$.
- Em português brasileiro: \\sen para seno e \\tg para tangente.
- IMPORTANTE: No JSON de resposta, escape barras invertidas de comandos LaTeX como \\\\ (ex: \\\\forall, \\\\in, \\\\frac, \\\\to) para manter conformidade com JSON válido.

FORMATO DE RESPOSTA OBRIGATÓRIO (JSON PURO):
{
  "veredito": "aprovado | parcial | sem_desenvolvimento | incorreto",
  "desenvolvimento_presente": true,
  "resultado_final_correto": true,
  "alternativa_identificada": "A | B | C | D | E | null",
  "etapas_corretas": ["Passo 1: ... em $...$", "Passo 2: ..."],
  "erros_identificados": ["Erro identificado: ... em $...$"],
  "feedback_latex": "Veredito curto e direto (1 a 2 frases sintetizando a validação ou a falha principal, SEM repetir passo a passo as contas que já constam em etapas_corretas ou no gabarito), com expressões em $...$",
  "precisa_revisao_humana": false,
  "transcricao_latex": "equação ou desenvolvimento transcrito em LaTeX delimitado por $...$ ou $$...$$",
  "passos": ["Passo 1: ...", "Passo 2: ..."],
  "estrategia_identificada": "nome da estratégia observada",
  "status_resolucao": "correto | erro_conta_sinal | erro_algebraico | erro_conceitual | erro_interpretacao | incompleto",
  "diagnostico": "parecer pedagógico explicando como o estudante pensou e onde ocorreu a falha, ou demonstração passo a passo completa da questão com equações em $...$",
  "metodo_alternativo": "método alternativo ou null",
  "linha_do_erro": "descrição exata da linha ou passagem onde surgiu o erro com expressões em $...$, ou null se correto",
  "dica_proximo_passo": "lema fundamental, princípio determinante ou pergunta reflexiva com equações em $...$",
  "confianca_diagnostico": "alta | media | baixa"
}`;

export async function POST(req: NextRequest) {
  try {
    const authorization = req.headers.get("authorization");
    const body = await req.json();
    const { enunciado, gabarito, imagem_base64, modo } = body;
    const confirmed = body.transcricao_confirmada;
    if (confirmed !== undefined && (typeof confirmed !== "string" || !confirmed.trim() || confirmed.length > 8000)) {
      return NextResponse.json({ error: "Transcrição inválida." }, { status: 400 });
    }
    const justificativa = confirmed !== undefined ? confirmed : body.justificativa;
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

    const rawJustificativa = (justificativa || "").trim();
    const hasImage = Boolean(cleanImage) && confirmed === undefined;

    // Detecta se a chamada é um pedido de explicação/resolução passo a passo
    const isExplanation = Boolean(
      modo === "explicar" ||
      (confirmed === undefined && /expli(?:que|cação)|resolução axiomática|passo a passo completo/i.test(rawJustificativa))
    );

    // Validação de entrada sem desenvolvimento matemático (Apenas resposta final no modo avaliação)
    const isSingleFinalAnswer = [
      /^\s*\(?[a-eA-E]\)?\s*$/,
      /^\s*(?:resposta|gabarito|letra|opção|opcao)?\s*(?:é|e|:)?\s*\(?[a-eA-E]\)?\s*$/i,
      /^\s*-?\d+(?:[.,]\d+)?\s*$/,
      /^\s*(?:resposta|gabarito|resultado)?\s*(?:é|e|:)?\s*-?\d+(?:[.,]\d+)?\s*$/i,
      /^\s*[a-zA-Z]\s*=\s*-?\d+(?:[.,]\d+)?\s*$/,
      /^\s*(?:acho que é|deu|resultado final:?|afirmo que)\s*.*$/i,
    ].some((p) => p.test(rawJustificativa));

    if (!isExplanation && !hasImage && (!rawJustificativa || isSingleFinalAnswer)) {
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

    // Final gate shared by FastAPI and direct-provider fallbacks.
    const finalize = async (evaluation: Record<string, any>) => {
      if (isExplanation) return NextResponse.json(evaluation);
      let check = evaluation.arithmetic_check;
      if (!check) {
        try {
          const verified = await fetch(BACKEND_URL + "/api/tutor/verify-arithmetic", {
            method: "POST",
            headers: { "Content-Type": "application/json", ...(authorization ? { Authorization: authorization } : {}) },
            body: JSON.stringify({ transcription: confirmed ?? evaluation.transcricao_latex ?? "" }),
            signal: AbortSignal.timeout(3500), cache: "no-store",
          });
          if (verified.ok) {
            const candidate = await verified.json();
            if (["consistent", "conflict", "unsupported"].includes(candidate.status)) check = candidate;
          }
        } catch { /* Verification failure stays explicit, never means approval. */ }
      }
      evaluation.ocr_ambiguo = evaluation.ocr_ambiguo === true;
      evaluation.arithmetic_check = check ?? { status: "unavailable", checks: [] };
      const needsReview = ((hasImage && confirmed === undefined) || confirmed !== undefined) && (
        (hasImage && check?.status === "conflict") || (hasImage && !check) || (hasImage && evaluation.ocr_ambiguo === true) || evaluation.ocr_review_required === true
      );
      if (needsReview) {
        const message = check ? "A leitura do manuscrito precisa de confirmação. Confira a transcrição; sua tentativa e seu rascunho foram preservados." : "Não foi possível conferir a leitura agora. Confira a transcrição ou tente novamente; sua tentativa foi preservada.";
        Object.assign(evaluation, { precisa_revisao_humana: true, ocr_review_required: true,
          feedback_latex: message, diagnostico: message, status_resolucao: "incompleto", resultado_final_correto: false });
      } else if (check?.status === "conflict") {
        evaluation.resultado_final_correto = false;
        if (evaluation.veredito === "aprovado") Object.assign(evaluation, {
          veredito: "parcial", status_resolucao: "erro_conta_sinal",
          feedback_latex: "Há uma igualdade numérica inconsistente no desenvolvimento confirmado. Revise a conta antes de concluir.",
        });
      }
      return NextResponse.json(evaluation);
    };

    // 1. No modo de avaliação, tenta o Backend FastAPI (tolerância curta de 4.0s para não bloquear o fallback direto)
    if (!isExplanation && authorization?.startsWith("Bearer ")) {
      try {
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
          Authorization: authorization,
        };

        const response = await fetch(BACKEND_URL + "/api/tutor/evaluate", {
          method: "POST",
          headers,
          body: JSON.stringify({
            enunciado,
            gabarito: gabarito || "",
            justificativa_texto: justificativa || "",
            imagem_base64: cleanImage,
            mime_type: mimeType,
            transcricao_confirmada: confirmed,
          }),
          signal: AbortSignal.timeout(6500),
          cache: "no-store",
        });

        if (response.ok) {
          const raw = await response.text();
          let data: BackendEvaluationPayload;
          try {
            data = safeParseJsonWithLatex<BackendEvaluationPayload>(raw);
          } catch {
            data = { detail: raw.slice(0, 500) };
          }
          // Só retorna se o backend de fato produziu um veredito válido (e não um fallback inconclusivo por falha de chave antiga no Render)
          if (
            (data.veredito || data.status_resolucao) &&
            data.model_provider !== "fallback" &&
            (!data.precisa_revisao_humana || data.ocr_review_required === true)
          ) {
            const rawVeredito =
              data.veredito ||
              (data.status_resolucao === "correto"
                ? "aprovado"
                : data.status_resolucao === "erro_conta_sinal"
                  ? "parcial"
                  : "incorreto");
            return finalize({
              ...data,
              ocr_ambiguo: data.ocr_ambiguo === true,
              veredito: rawVeredito,
              desenvolvimento_presente:
                data.desenvolvimento_presente ?? (rawVeredito !== "sem_desenvolvimento"),
              resultado_final_correto:
                data.resultado_final_correto ?? (rawVeredito === "aprovado"),
              alternativa_identificada: data.alternativa_identificada || data.alternativa || null,
              etapas_corretas: data.etapas_corretas || data.passos || [],
              erros_identificados:
                data.erros_identificados || (data.linha_do_erro ? [data.linha_do_erro] : []),
              feedback_latex:
                data.feedback_latex ||
                data.diagnostico ||
                "Avaliação discursiva concluída com sucesso.",
              precisa_revisao_humana: Boolean(data.precisa_revisao_humana),
              status_resolucao:
                data.status_resolucao || (rawVeredito === "aprovado" ? "correto" : "incompleto"),
              diagnostico:
                data.diagnostico ||
                data.feedback_latex ||
                "Não foi possível produzir um diagnóstico detalhado.",
              modelo: data.model_name || "MathAI Engine",
              provedor: data.model_provider || "fastapi-backend",
              confianca: data.confianca_diagnostico || "alta",
              tokens: (data as any).tokens || {
                prompt: Math.ceil(((enunciado || "") + (justificativa || "")).length / 4),
                completion: Math.ceil(
                  String(data.feedback_latex || data.diagnostico || "").length / 4
                ),
                total: Math.ceil(
                  ((enunciado || "") +
                    (justificativa || "") +
                    String(data.feedback_latex || "")).length / 4
                ),
              },
            });
          }
        }
      } catch (error) {
        console.warn(
          "[Avaliador Cognitivo] Timeout/indisponibilidade no backend FastAPI (4s), acionando inferência multimodal direta:",
          error instanceof Error ? error.message : "erro desconhecido"
        );
      }
    }

    if (confirmed !== undefined) cleanImage = undefined;

    // 2. Montagem do prompt para inferência de alta precisão (Texto + Visão Multimodal OCR)
    const prompt = isExplanation
      ? `Você é o Professor e Tutor de Matemática do LEMMAS (MathAI Engine).
Apresente a resolução comentada detalhada e explicação axiomática passo a passo para a seguinte questão:

ENUNCIADO DA QUESTÃO:
${enunciado}

GABARITO OFICIAL:
${gabarito || "Não informado"}

CONTEXTO / DÚVIDA DO ESTUDANTE:
${rawJustificativa}

INSTRUÇÕES PEDAGÓGICAS E FORMATAÇÃO:
1. No campo "diagnostico": Demonstração axiomática completa passo a passo, clara e didática. TODAS as expressões, variáveis ou equações DEVEM estar rigorosamente delimitadas por $...$ ou $$...$$.
2. No campo "dica_proximo_passo": Lema fundamental, teorema ou princípio teórico determinante aplicado na questão.
3. No campo "erros_identificados": Análise pedagógica do distrator ou pegadinha da alternativa assinalada pelo estudante, demonstrando por que ela está incorreta ou induz ao erro.
4. No campo "feedback_latex": Resumo conceitual intuitivo da questão e do método de resolução.
5. No campo "passos" / "etapas_corretas": As 3 a 5 etapas essenciais da resolução.
6. Retorne EXCLUSIVAMENTE o objeto JSON no formato especificado.`
      : `Analise detalhadamente a resolução do estudante para a seguinte questão:

ENUNCIADO DA QUESTÃO:
${enunciado}

GABARITO OFICIAL:
${gabarito || "Não informado"}

DESENVOLVIMENTO FORNECIDO PELO ESTUDANTE:
${rawJustificativa ? `Justificativa/Dedução em texto:\n${rawJustificativa}` : "(Sem texto digitado; consulte a imagem/rascunho anexado)"}
${hasImage ? "\n(Foi anexada uma imagem com o rascunho/caligrafia da resolução. Realize a transcrição OCR fiel das equações manuscritas no campo 'transcricao_latex' e avalie os passos matemáticos)." : ""}

INSTRUÇÕES:
1. Se houver imagem, transcreva fielmente as passagens matemáticas manuscritas para LaTeX no campo "transcricao_latex".
2. Identifique os passos corretos e eventuais falhas (erros de conta, sinal, álgebra ou conceito).
3. Atribua o veredito estrito: "aprovado", "parcial", "sem_desenvolvimento" ou "incorreto".
4. No campo "feedback_latex", escreva um veredito curto e direto (máximo de 1 a 2 frases sintetizando a validação ou o erro central) em LaTeX ($...$), SEM narrar novamente passo a passo as contas que já estão listadas em "etapas_corretas".
5. Retorne EXCLUSIVAMENTE o objeto JSON no formato especificado.`;

    // 2.1. Inferência Primária via Gemini REST API (Multimodal com OCR e KaTeX)
    try {
      const geminiRes = await generateGeminiContent({
        prompt,
        systemInstruction: PROMPT_SISTEMA_AVALIADOR,
        jsonOutput: true,
        inlineImage: cleanImage
          ? {
              mimeType,
              base64Data: cleanImage,
            }
          : undefined,
        temperature: 0.15,
        maxTokens: 2048,
        timeoutMs: 12000,
      });

      const parsed = safeParseJsonWithLatex(geminiRes.text);
      if (parsed) {
        const rawVeredito = isExplanation
          ? "aprovado"
          : (parsed.veredito || (parsed.status_resolucao === "correto" ? "aprovado" : "incorreto"));

        return finalize({
          ocr_ambiguo: parsed.ocr_ambiguo === true,
          veredito: rawVeredito,
          desenvolvimento_presente: isExplanation ? true : (parsed.desenvolvimento_presente ?? (rawVeredito !== "sem_desenvolvimento")),
          resultado_final_correto: isExplanation ? true : (parsed.resultado_final_correto ?? (rawVeredito === "aprovado")),
          alternativa_identificada: parsed.alternativa_identificada || parsed.alternativa || null,
          etapas_corretas: parsed.etapas_corretas || parsed.passos || [],
          erros_identificados: parsed.erros_identificados || (parsed.linha_do_erro ? [parsed.linha_do_erro] : []),
          feedback_latex: parsed.feedback_latex || parsed.diagnostico || (isExplanation ? "Resolução comentada pela MathAI Engine." : "Avaliação matemática concluída com sucesso."),
          precisa_revisao_humana: isExplanation ? false : Boolean(parsed.precisa_revisao_humana),
          transcricao_latex: parsed.transcricao_latex || "",
          passos: parsed.passos || parsed.etapas_corretas || [],
          estrategia_identificada: parsed.estrategia_identificada || (isExplanation ? "Resolução Axiomática" : "Raciocínio Analítico"),
          status_resolucao: isExplanation ? "correto" : (parsed.status_resolucao || (rawVeredito === "aprovado" ? "correto" : "incompleto")),
          diagnostico: parsed.diagnostico || parsed.feedback_latex || "Demonstração matemática analisada pela MathAI Engine.",
          metodo_alternativo: parsed.metodo_alternativo || null,
          linha_do_erro: parsed.linha_do_erro || null,
          dica_proximo_passo: parsed.dica_proximo_passo || null,
          confianca_diagnostico: parsed.confianca_diagnostico || "alta",
          modelo: geminiRes.model,
          provedor: "google",
          tokens: geminiRes.tokens || {
            prompt: Math.ceil((prompt || "").length / 4),
            completion: Math.ceil((geminiRes.text || "").length / 4),
            total: Math.ceil(((prompt || "") + (geminiRes.text || "")).length / 4),
          },
        });
      }
    } catch (geminiErr) {
      console.warn("[Avaliador Cognitivo] Gemini indisponível, acionando NVIDIA NIM:", geminiErr instanceof Error ? geminiErr.message : geminiErr);
    }

    // 2.2. Inferência de Resiliência via NVIDIA NIM (Suporta Texto via Nemotron e Imagem via Nemotron Super VL)
    if (getNvidiaApiKeys().length > 0) {
      try {
        const nvidiaRes = await generateNvidiaContent({
          prompt: `${prompt}\n\nIMPORTANTE: Retorne EXCLUSIVAMENTE o objeto JSON válido, sem texto introdutório ou blocos markdown de fechamento fora do JSON.`,
          systemInstruction: PROMPT_SISTEMA_AVALIADOR,
          inlineImage: cleanImage
            ? {
                mimeType,
                base64Data: cleanImage,
              }
            : undefined,
          temperature: 0.15,
          maxTokens: 2048,
          timeoutMs: 12000,
        });

        const parsed = safeParseJsonWithLatex(nvidiaRes.text);
        if (parsed) {
          const rawVeredito = isExplanation
            ? "aprovado"
            : (parsed.veredito || (parsed.status_resolucao === "correto" ? "aprovado" : "incorreto"));

          return finalize({
            ocr_ambiguo: parsed.ocr_ambiguo === true,
            veredito: rawVeredito,
            desenvolvimento_presente: isExplanation ? true : (parsed.desenvolvimento_presente ?? (rawVeredito !== "sem_desenvolvimento")),
            resultado_final_correto: isExplanation ? true : (parsed.resultado_final_correto ?? (rawVeredito === "aprovado")),
            alternativa_identificada: parsed.alternativa_identificada || parsed.alternativa || null,
            etapas_corretas: parsed.etapas_corretas || parsed.passos || [],
            erros_identificados: parsed.erros_identificados || (parsed.linha_do_erro ? [parsed.linha_do_erro] : []),
            feedback_latex: parsed.feedback_latex || parsed.diagnostico || (isExplanation ? "Resolução comentada pela MathAI Engine." : "Avaliação matemática concluída com sucesso."),
            precisa_revisao_humana: isExplanation ? false : Boolean(parsed.precisa_revisao_humana),
            transcricao_latex: parsed.transcricao_latex || "",
            passos: parsed.passos || parsed.etapas_corretas || [],
            estrategia_identificada: parsed.estrategia_identificada || (isExplanation ? "Resolução Axiomática" : "Raciocínio Analítico"),
            status_resolucao: isExplanation ? "correto" : (parsed.status_resolucao || (rawVeredito === "aprovado" ? "correto" : "incompleto")),
            diagnostico: parsed.diagnostico || parsed.feedback_latex || "Demonstração matemática analisada pela MathAI Engine.",
            metodo_alternativo: parsed.metodo_alternativo || null,
            linha_do_erro: parsed.linha_do_erro || null,
            dica_proximo_passo: parsed.dica_proximo_passo || null,
            confianca_diagnostico: parsed.confianca_diagnostico || "alta",
            modelo: nvidiaRes.model,
            provedor: "nvidia-nemotron",
            tokens: nvidiaRes.tokens || {
              prompt: Math.ceil((prompt || "").length / 4),
              completion: Math.ceil((nvidiaRes.text || "").length / 4),
              total: Math.ceil(((prompt || "") + (nvidiaRes.text || "")).length / 4),
            },
          });
        }
      } catch (nvidiaErr) {
        console.warn("[Avaliador Cognitivo] Fallback NVIDIA NIM falhou:", nvidiaErr instanceof Error ? nvidiaErr.message : nvidiaErr);
      }
    }

    // 3. Falha real de todos os provedores cognitivos (HTTP 503 sem mascarar com contingência determinística)
    return NextResponse.json(
      {
        error: "O serviço de avaliação da MathAI Engine está temporariamente indisponível. Todos os provedores cognitivos falharam.",
        status: "unavailable",
      },
      { status: 503 }
    );
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro interno no MathAI Engine" },
      { status: 500 }
    );
  }
}
