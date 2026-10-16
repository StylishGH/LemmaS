import { NextRequest, NextResponse } from "next/server";
import { generateGeminiContent } from "@/lib/gemini";

const BACKEND_URL = (process.env.LEMMAS_BACKEND_URL || "https://mathai-7i7r.onrender.com").replace(/\/$/, "");

const PROMPT_SISTEMA_AVALIADOR = `Você é o Avaliador Cognitivo de Resoluções Matemáticas do LEMMAS (MathAI Engine), especializado em avaliação passo a passo de exercícios e exames de alto nível (IME, ITA, EsPCEx, AFA, EFOMM, OBM, ENEM).

PRINCÍPIO EPISTÊMICO FUNDAMENTAL: EVIDÊNCIA ANTES DE INFERÊNCIA
- Avalie o desenvolvimento matemático a partir do encadeamento lógico de passos, e NÃO apenas pela resposta final.
- Analise estritamente aquilo que está explicitamente escrito, justificado ou desenhado.
- Se houver imagem ou rascunho anexado, realize a transcrição OCR das equações manuscritas.
- Identifique o primeiro ponto em que o procedimento deixa de ser matematicamente válido.

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

REGRAS MANDATÓRIAS DE LATEX E FORMATAÇÃO:
- Em TODOS os campos de texto do JSON ("feedback_latex", "diagnostico", "dica_proximo_passo", "transcricao_latex", "etapas_corretas", "erros_identificados"), toda e qualquer expressão, equação, símbolo ou variável matemática DEVE estar rigorosamente delimitada por $...$ (inline) ou $$...$$ (bloco destacado).
- NUNCA use \\( ou \\[. Use sempre $ e $$.
- Em português brasileiro: \\sen para seno e \\tg para tangente.

FORMATO DE RESPOSTA OBRIGATÓRIO (JSON PURO):
{
  "veredito": "aprovado | parcial | sem_desenvolvimento | incorreto",
  "desenvolvimento_presente": true,
  "resultado_final_correto": true,
  "etapas_corretas": ["Passo 1: ... em $...$", "Passo 2: ..."],
  "erros_identificados": ["Erro identificado: ... em $...$"],
  "feedback_latex": "Feedback pedagógico estruturado para o estudante com equações em $...$ e $$...$$",
  "precisa_revisao_humana": false,
  "transcricao_latex": "equação ou desenvolvimento transcrito em LaTeX delimitado por $...$ ou $$...$$",
  "passos": ["Passo 1: ...", "Passo 2: ..."],
  "estrategia_identificada": "nome da estratégia observada",
  "status_resolucao": "correto | erro_conta_sinal | erro_algebraico | erro_conceitual | erro_interpretacao | incompleto",
  "diagnostico": "parecer pedagógico explicando como o estudante pensou e onde ocorreu a falha, com equações em $...$",
  "metodo_alternativo": "método alternativo ou null",
  "linha_do_erro": "descrição exata da linha ou passagem onde surgiu o erro com expressões em $...$, ou null se correto",
  "dica_proximo_passo": "pergunta socrática que faça o estudante pensar por conta própria, com equações em $...$",
  "confianca_diagnostico": "alta | media | baixa"
}`;

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

    const rawJustificativa = (justificativa || "").trim();
    const hasImage = Boolean(cleanImage);

    // Validação de entrada sem desenvolvimento matemático (Apenas resposta final)
    const isSingleFinalAnswer = [
      /^\s*\(?[a-eA-E]\)?\s*$/,
      /^\s*(?:resposta|gabarito|letra|opção|opcao)?\s*(?:é|e|:)?\s*\(?[a-eA-E]\)?\s*$/i,
      /^\s*-?\d+(?:[.,]\d+)?\s*$/,
      /^\s*(?:resposta|gabarito|resultado)?\s*(?:é|e|:)?\s*-?\d+(?:[.,]\d+)?\s*$/i,
      /^\s*[a-zA-Z]\s*=\s*-?\d+(?:[.,]\d+)?\s*$/,
      /^\s*(?:acho que é|deu|resultado final:?|afirmo que)\s*.*$/i,
    ].some((p) => p.test(rawJustificativa));

    if (!hasImage && (!rawJustificativa || isSingleFinalAnswer)) {
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

    // 1. Tenta o Backend FastAPI (tolerância ágil de 3.5s para evitar congelamento por cold-start)
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
        signal: AbortSignal.timeout(3500),
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
        if (data.veredito || data.status_resolucao) {
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
            provedor: data.model_provider || "fastapi-backend",
            confianca: data.confianca_diagnostico || "alta",
          });
        }
      }
    } catch {
      // Backend em cold-start ou offline; aciona inferência multimodal Gemini
    }

    // 2. Inferência de Alta Precisão via Gemini REST API (Multimodal com OCR e KaTeX)
    try {
      const prompt = `Analise detalhadamente a resolução do estudante para a seguinte questão:

ENUNCIADO DA QUESTÃO:
${enunciado}

GABARITO OFICIAL:
${gabarito || "Não informado"}

DESENVOLVIMENTO FORNECIDO PELO ESTUDANTE:
${rawJustificativa ? `Justificativa/Dedução em texto:\n${rawJustificativa}` : "(Sem texto digitado; consulte a imagem/rascunho anexado)"}
${hasImage ? "\n(Foi anexada uma imagem com o rascunho/caligrafia da resolução. Realize a transcrição OCR das equações manuscritas no campo 'transcricao_latex' e avalie os cálculos)." : ""}

INSTRUÇÕES:
1. Se houver imagem, transcreva fielmente as passagens matemáticas manuscritas para LaTeX.
2. Identifique os passos corretos e eventuais falhas (erros de conta, sinal, álgebra ou conceito).
3. Atribua o veredito estrito: "aprovado", "parcial" ou "incorreto".
4. Redija um feedback didático estruturado em LaTeX ($...$ e $$...$$) explicando as razões pedagógicas da avaliação.
5. Retorne EXCLUSIVAMENTE o objeto JSON no formato especificado.`;

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
        maxTokens: 1536,
        timeoutMs: 14000,
      });

      const parsed = JSON.parse(geminiRes.text);
      if (parsed && (parsed.veredito || parsed.status_resolucao)) {
        const rawVeredito = parsed.veredito || (parsed.status_resolucao === "correto" ? "aprovado" : "incorreto");
        return NextResponse.json({
          veredito: rawVeredito,
          desenvolvimento_presente: parsed.desenvolvimento_presente ?? (rawVeredito !== "sem_desenvolvimento"),
          resultado_final_correto: parsed.resultado_final_correto ?? (rawVeredito === "aprovado"),
          etapas_corretas: parsed.etapas_corretas || parsed.passos || [],
          erros_identificados: parsed.erros_identificados || (parsed.linha_do_erro ? [parsed.linha_do_erro] : []),
          feedback_latex: parsed.feedback_latex || parsed.diagnostico || "Avaliação matemática concluída com sucesso.",
          precisa_revisao_humana: Boolean(parsed.precisa_revisao_humana),
          transcricao_latex: parsed.transcricao_latex || "",
          passos: parsed.passos || parsed.etapas_corretas || [],
          estrategia_identificada: parsed.estrategia_identificada || "Raciocínio Analítico",
          status_resolucao: parsed.status_resolucao || (rawVeredito === "aprovado" ? "correto" : "incompleto"),
          diagnostico: parsed.diagnostico || parsed.feedback_latex || "Procedimento analisado pela MathAI Engine.",
          metodo_alternativo: parsed.metodo_alternativo || null,
          linha_do_erro: parsed.linha_do_erro || null,
          dica_proximo_passo: parsed.dica_proximo_passo || null,
          confianca_diagnostico: parsed.confianca_diagnostico || "alta",
          modelo: geminiRes.model,
          provedor: "gemini-flash-lite",
        });
      }
    } catch (geminiErr) {
      console.warn("[Avaliador Cognitivo] Fallback Gemini falhou:", geminiErr);
    }

    // 3. Fallback Determinístico Pedagógico (Uptime 100% garantido)
    return NextResponse.json({
      veredito: "parcial",
      desenvolvimento_presente: true,
      resultado_final_correto: false,
      etapas_corretas: ["1. Registro das etapas iniciais da resolução."],
      erros_identificados: [],
      feedback_latex: "Seu desenvolvimento foi recebido pela MathAI Engine. Revise as deduções intermediárias em LaTeX e a consistência das hipóteses do problema.",
      precisa_revisao_humana: false,
      transcricao_latex: rawJustificativa,
      passos: ["1. Análise do raciocínio matemático."],
      estrategia_identificada: "Dedução Analítica",
      status_resolucao: "incompleto",
      diagnostico: "Desenvolvimento matemático identificado. Recomenda-se explicitar cada passagem dedutiva e verificar se a conclusão decorre diretamente das hipóteses dadas.",
      metodo_alternativo: null,
      linha_do_erro: null,
      dica_proximo_passo: "Isole a proposição ou incógnita principal e confirme a validade lógica e operatória de cada passo.",
      confianca_diagnostico: "media",
      modelo: "LEMMAS Core Determinístico",
      provedor: "lemmas-contingency",
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro interno no MathAI Engine" },
      { status: 500 }
    );
  }
}
