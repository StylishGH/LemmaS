import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@/lib/supabase-server";
import { calcularProximoIntervaloSM2 } from "@/lib/sm2";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  try {
    const { id } = await params;
    const qId = parseInt(id, 10);
    const body = await req.json();
    const {
      resposta,
      tempo_segundos = 0,
      confianca = 4,
      aluno_id,
      dica_socratica_usada = false,
      nivel_max_dica = 0,
      total_dicas_solicitadas = 0,
      rendicao_nivel_5 = false,
      justificativa_texto,
      imagem_base64,
      origem = "bancada",
    } = body;
    // 1. Resolve o ID real do aluno a partir da sessão Supabase (cookies)
    let validAlunoId = 9999;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        const { data: dbUser } = await supabase
          .from("usuarios")
          .select("id")
          .eq("email", user.email)
          .maybeSingle();

        if (dbUser?.id) {
          validAlunoId = dbUser.id;
        } else {
          // Provisiona automaticamente o usuário na tabela usuarios
          const nomeUsuario = user.user_metadata?.full_name || user.email.split("@")[0] || "Aluno LEMMAS";
          const { data: novoDbUser } = await supabase
            .from("usuarios")
            .insert({
              nome: nomeUsuario,
              email: user.email,
              senha_hash: "supabase_managed",
              escolaridade: "Ensino Superior",
            })
            .select("id")
            .maybeSingle();

          if (novoDbUser?.id) {
            validAlunoId = novoDbUser.id;
          }
        }
      } else if (aluno_id && !isNaN(parseInt(String(aluno_id), 10))) {
        validAlunoId = parseInt(String(aluno_id), 10);
      }
    } catch {
      if (aluno_id && !isNaN(parseInt(String(aluno_id), 10))) {
        validAlunoId = parseInt(String(aluno_id), 10);
      }
    }

    if (!resposta) {
      return NextResponse.json({ error: "Resposta não informada" }, { status: 400 });
    }

    // Busca a questão e o gabarito oficial
    const { data: questao, error: qError } = await supabase
      .from("questoes")
      .select("id, gabarito, estrategias_esperadas")
      .eq("id", qId)
      .single();

    if (qError || !questao) {
      return NextResponse.json({ error: "Questão não encontrada" }, { status: 404 });
    }

    // Identifica se é questão discursiva avaliada pela IA ou rendição do Nível 5
    const isRendicaoNivel5 = Boolean(rendicao_nivel_5 || resposta === "DICA_5_REVELADA");
    const isDiscursiva = !isRendicaoNivel5 && (body.tipo_questao === "discursiva" || Boolean(body.veredito));
    const gabaritoOficial = (questao.gabarito || "").trim();
    const respostaAluno = String(resposta ?? body.veredito ?? "").trim();
    let acertou = false;
    let tipoErro = body.tipo_erro || "outro";

    if (isRendicaoNivel5) {
      acertou = false;
      tipoErro = "conceitual";
    } else if (isDiscursiva) {
      const veredito = body.veredito;
      if (body.precisa_revisao_humana) {
        return NextResponse.json(
          { error: "Avaliação inconclusiva não pode ser registrada como tentativa definitiva." },
          { status: 400 }
        );
      }
      if (veredito === "sem_desenvolvimento") {
        return NextResponse.json(
          { error: "Veredito 'sem_desenvolvimento' não pode ser registrado como tentativa definitiva." },
          { status: 400 }
        );
      }
      acertou = veredito === "aprovado";
      tipoErro = acertou ? "nenhum" : (veredito === "parcial" ? "conta_sinal" : "conceitual");
    } else {
      acertou = respostaAluno.toUpperCase() === gabaritoOficial.toUpperCase();
      tipoErro = acertou ? "nenhum" : (body.tipo_erro || "outro");
    }

    // Prevenção de duplicatas recentes (janela de idempotência de 4s)
    try {
      const { data: tentativaRecente } = await supabase
        .from("tentativas")
        .select("id, data_hora")
        .eq("questao_id", qId)
        .eq("aluno_id", validAlunoId)
        .order("data_hora", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (tentativaRecente?.data_hora) {
        const diffMs = Date.now() - new Date(tentativaRecente.data_hora).getTime();
        if (diffMs < 4000) {
          return NextResponse.json({
            id: tentativaRecente.id,
            acertou,
            gabarito: gabaritoOficial,
            resposta_enviada: respostaAluno,
            mensagem: "Tentativa recente registrada (idempotente).",
          });
        }
      }
    } catch {
      // Ignora erro na verificação prévia de duplicata
    }

    // Formatação de estratégia usada com telemetria socrática explícita
    let estrategiaFormatada = body.estrategia_usada || null;
    if (isRendicaoNivel5) {
      estrategiaFormatada = "Dica Socrática Nível 5 (Resolução Revelada / Rendição)";
    } else if (isDiscursiva) {
      estrategiaFormatada = body.estrategia_usada
        ? `${body.estrategia_usada} [veredito=${body.veredito}]`
        : `Discursiva [veredito=${body.veredito}]`;
      if (dica_socratica_usada) {
        estrategiaFormatada += ` [Dica Socrática Nível ${nivel_max_dica || 1}]`;
      }
    } else if (dica_socratica_usada) {
      const n = nivel_max_dica || 1;
      if (acertou) {
        estrategiaFormatada = body.estrategia_usada
          ? `${body.estrategia_usada} [Acerto c/ Dica Nível ${n}]`
          : `Acerto com Dica Socrática Nível ${n}`;
      } else {
        estrategiaFormatada = body.estrategia_usada
          ? `${body.estrategia_usada} [Dica Nível ${n} - Revisão]`
          : `Dica Socrática Nível ${n} (Revisão Necessária / Lacuna Conceitual)`;
      }
    }

    // 1. Processamento e upload resiliente de imagem de resolução (Lousa / Foto de Caderno)
    let imagemResolucaoPath: string | null = null;
    let imgHash: string | null = null;
    if (typeof imagem_base64 === "string" && imagem_base64.length > 50) {
      try {
        const cleanB64 = imagem_base64.includes(",") ? imagem_base64.split(",")[1] : imagem_base64;
        const imgBuffer = Buffer.from(cleanB64, "base64");
        imgHash = crypto.createHash("sha256").update(imgBuffer).digest("hex");
        const fileName = `aluno_${validAlunoId}/q${qId}_${imgHash.slice(0, 16)}_${Date.now()}.png`;

        const { data: uploadData, error: uploadErr } = await supabase.storage
          .from("resolucoes")
          .upload(fileName, imgBuffer, {
            contentType: "image/png",
            upsert: true,
          });

        if (!uploadErr && uploadData?.path) {
          const { data: pubUrl } = supabase.storage.from("resolucoes").getPublicUrl(uploadData.path);
          imagemResolucaoPath = pubUrl?.publicUrl || uploadData.path;
        } else {
          // Fallback resiliente: grava o hash criptográfico determinístico SHA-256
          imagemResolucaoPath = `sha256:${imgHash}`;
        }
      } catch (storageErr) {
        console.warn("[Submit Route] Aviso ao tentar upload de resolução no storage:", storageErr);
        if (imgHash) {
          imagemResolucaoPath = `sha256:${imgHash}`;
        }
      }
    }

    // Telemetria estruturada nos logs e anotações para recuperação de dados
    const nivelFinalDica = isRendicaoNivel5 ? 5 : (Number(nivel_max_dica) || 0);
    const usouDicaFinal = Boolean(dica_socratica_usada || isRendicaoNivel5 || nivelFinalDica > 0);
    const totalDicasFinal = Number(total_dicas_solicitadas) || (isRendicaoNivel5 ? 1 : usouDicaFinal ? 1 : 0);

    const telemetriaTag = usouDicaFinal
      ? `[TELEMETRIA_SOCRATICA: usou_dica=true, nivel_max=${nivelFinalDica}, acertou=${acertou}, total_dicas=${totalDicasFinal}${isRendicaoNivel5 ? ', rendicao=true' : ''}]`
      : `[TELEMETRIA_SOCRATICA: usou_dica=false, acertou=${acertou}]`;

    // Preservação canônica da alternativa marcada e da dedução bruta (SFT / TRI / Distratores)
    const respostaTag = `[RESPOSTA:${respostaAluno}]`;
    const rawJustificativaAluno = (justificativa_texto || "").trim();
    const justificativaTag = rawJustificativaAluno ? `[JUSTIFICATIVA_BRUTA:${rawJustificativaAluno}]` : "";

    const anotacoesFormatadas = isDiscursiva
      ? `${respostaTag} ${telemetriaTag} ${justificativaTag} [VEREDITO:${body.veredito}] ${body.anotacoes || body.feedback_latex || ""}`.trim()
      : (body.anotacoes ? `${respostaTag} ${telemetriaTag} ${justificativaTag} ${body.anotacoes}`.trim() : `${respostaTag} ${telemetriaTag} ${justificativaTag}`.trim());

    let tentativaId: any = null;
    const tentativaPayload: Record<string, any> = {
      questao_id: qId,
      aluno_id: validAlunoId,
      tempo_segundos: Math.max(0, parseInt(String(tempo_segundos), 10) || 0),
      acertou: acertou ? 1 : 0,
      estrategia_usada: estrategiaFormatada,
      tipo_erro: tipoErro,
      confianca_aluno: isRendicaoNivel5 ? 1 : confianca,
      anotacoes: anotacoesFormatadas,
      imagem_resolucao_path: imagemResolucaoPath,
    };

    try {
      // 1ª Tentativa: insere com resposta_aluno e texto_resolucao (schema enriquecido)
      const { data: tentativaInserida, error: tentativaErr } = await supabase.from("tentativas").insert({
        ...tentativaPayload,
        resposta_aluno: respostaAluno,
        texto_resolucao: rawJustificativaAluno || null,
      }).select("id").single();

      if (!tentativaErr && tentativaInserida) {
        tentativaId = tentativaInserida.id;
      } else if (tentativaErr) {
        // Fallback resiliente: se a coluna resposta_aluno ainda não existir no schema remoto
        const { data: fallbackInserida, error: fallbackErr } = await supabase.from("tentativas").insert(tentativaPayload).select("id").single();
        if (!fallbackErr && fallbackInserida) {
          tentativaId = fallbackInserida.id;
        } else if (fallbackErr) {
          console.warn("[Submit Route] Falha no fallback de public.tentativas:", fallbackErr);
        }
      }
    } catch (saveErr) {
      console.warn("[Submit Route] Falha ao gravar em public.tentativas:", saveErr);
    }

    // Persistência da avaliação completa da IA na tabela public.avaliacoes_ia (apenas para discursiva com veredito válido)
    if (tentativaId && isDiscursiva && !isRendicaoNivel5 && body.avaliacao_ia) {
      try {
        const avaliacao = typeof body.avaliacao_ia === "object" && body.avaliacao_ia !== null
          ? (body.avaliacao_ia as Record<string, unknown>)
          : {};

        let confiancaVal: number | null = null;
        if (typeof avaliacao.confianca === "number" && !isNaN(avaliacao.confianca)) {
          confiancaVal = Math.max(0, Math.min(1, avaliacao.confianca));
        } else if (avaliacao.confianca_diagnostico === "alta") {
          confiancaVal = 0.95;
        } else if (avaliacao.confianca_diagnostico === "media") {
          confiancaVal = 0.70;
        } else if (avaliacao.confianca_diagnostico === "baixa") {
          confiancaVal = 0.40;
        }

        const nomeModelo = String(avaliacao.modelo || avaliacao.nome_modelo || "mathai_evaluator");
        const provedorModelo = String(avaliacao.provedor || avaliacao.provedor_modelo || "mathai_gateway");
        const versaoPrompt = String(avaliacao.versao_prompt || "v1.0");
        const fallbackLevel = typeof avaliacao.fallback_level === "number" ? Math.max(0, Math.floor(avaliacao.fallback_level)) : 0;
        const latenciaMs = typeof avaliacao.latencia_ms === "number" ? Math.max(0, Math.round(avaliacao.latencia_ms)) : null;

        // Cálculo e enriquecimento estruturado de tokens consumidos
        const tokensInfo = (avaliacao.tokens && typeof avaliacao.tokens === "object")
          ? (avaliacao.tokens as Record<string, number>)
          : {
              prompt: typeof avaliacao.prompt_tokens === "number" ? avaliacao.prompt_tokens : Math.ceil(((typeof questao.estrategias_esperadas === "string" ? questao.estrategias_esperadas : "") + (typeof body.resposta === "string" ? body.resposta : "")).length / 4),
              completion: typeof avaliacao.completion_tokens === "number" ? avaliacao.completion_tokens : Math.ceil(String(avaliacao.feedback_latex || avaliacao.diagnostico || "").length / 4),
              total: 0,
            };
        if (!tokensInfo.total) {
          tokensInfo.total = (tokensInfo.prompt || 0) + (tokensInfo.completion || 0);
        }

        const inputHashFinal = avaliacao.input_hash
          ? String(avaliacao.input_hash)
          : imgHash
          ? imgHash
          : rawJustificativaAluno
          ? crypto.createHash("sha256").update(rawJustificativaAluno).digest("hex")
          : crypto.createHash("sha256").update(`${qId}:${respostaAluno}`).digest("hex");

        const outputEstruturado = {
          ...avaliacao,
          tokens: tokensInfo,
          raw_input_aluno: {
            tipo_questao: isDiscursiva ? "discursiva" : "objetiva",
            resposta_enviada: respostaAluno,
            justificativa_texto: rawJustificativaAluno || null,
            imagem_resolucao_path: imagemResolucaoPath,
            input_hash: inputHashFinal,
            origem: origem || (imagem_base64 ? "lousa" : "texto"),
          },
        };

        const { error: avaliacaoErr } = await supabase.from("avaliacoes_ia").insert({
          tentativa_id: tentativaId,
          provedor_modelo: provedorModelo,
          nome_modelo: nomeModelo,
          versao_modelo: avaliacao.versao_modelo ? String(avaliacao.versao_modelo) : null,
          versao_prompt: versaoPrompt,
          fallback_level: fallbackLevel,
          latencia_ms: latenciaMs,
          input_hash: inputHashFinal,
          output_raw: avaliacao.output_raw ? String(avaliacao.output_raw) : (typeof avaliacao.feedback_latex === "string" ? avaliacao.feedback_latex : null),
          output_estruturado: outputEstruturado,
          confianca: confiancaVal,
        });

        if (avaliacaoErr) {
          console.warn("[Submit Route] Aviso ao gravar em public.avaliacoes_ia:", avaliacaoErr);
        }
      } catch (saveAvaliacaoErr) {
        console.warn("[Submit Route] Falha ao persistir avaliação de IA em avaliacoes_ia:", saveAvaliacaoErr);
      }
    }

    // Persistência da rendição de Nível 5 em public.avaliacoes_ia (auditoria pedagógica e rastreabilidade total)
    if (tentativaId && isRendicaoNivel5) {
      try {
        const promptEstimado = Math.ceil(((questao.estrategias_esperadas || "") + " [Dica 5 Socrática / Rendição]").length / 4);
        const completionEstimado = Math.ceil("Gabarito e resolução oficial revelados via 5ª Dica Socrática. Rendição do estudante.".length / 4);
        const rendicaoOutput = {
          tipo_evento: "rendicao_nivel_5",
          veredito: "rendicao_nivel_5",
          status_resolucao: "rendicao_nivel_5",
          resultado_final_correto: false,
          desenvolvimento_presente: false,
          nivel_max_dica: 5,
          total_dicas_solicitadas: totalDicasFinal,
          diagnostico: "Estudante solicitou a 5ª Dica Socrática (revelação da resolução completa). Tentativa computada como rendição pedagógica.",
          feedback_latex: "Resolução revelada via 5ª Dica Socrática. Questão agendada para revisão prioritária no SM-2.",
          etapas_corretas: [],
          erros_identificados: ["Rendição pedagógica no Nível 5"],
          tokens: {
            prompt: promptEstimado,
            completion: completionEstimado,
            total: promptEstimado + completionEstimado,
          },
        };

        const { error: rendicaoErr } = await supabase.from("avaliacoes_ia").insert({
          tentativa_id: tentativaId,
          provedor_modelo: "mathai_socratic_tutor",
          nome_modelo: "socratic-ladder-polya-level5",
          versao_modelo: "5.0",
          versao_prompt: "v1.0-socratic-ladder",
          fallback_level: 5,
          latencia_ms: 0,
          input_hash: null,
          output_raw: "Resolução oficial revelada via 5ª Dica Socrática (Rendição do estudante). Tentativa zerada no SM-2 para consolidação pedagógica prioritária.",
          output_estruturado: rendicaoOutput,
          confianca: 1.0,
        });

        if (rendicaoErr) {
          console.warn("[Submit Route] Aviso ao gravar rendição em public.avaliacoes_ia:", rendicaoErr);
        }
      } catch (saveRendicaoErr) {
        console.warn("[Submit Route] Falha ao persistir rendição de IA em avaliacoes_ia:", saveRendicaoErr);
      }
    }

    // Registro na tabela pública de telemetria de inferência de IA (ai_inference_logs)
    if (usouDicaFinal) {
      try {
        await supabase.from("ai_inference_logs").insert({
          evaluation_id: `hint_outcome_${qId}_${Date.now()}`,
          tentativa_id: tentativaId,
          task_type: "socratic_outcome",
          provider: "mathai_tutor",
          model_used: "socratic-stepper-polya",
          latency_ms: 0,
          status_code: 200,
          success: true,
          raw_usage: {
            usou_dica_socratica: true,
            nivel_max_dica: nivelFinalDica,
            acertou_com_dica: acertou,
            total_dicas: totalDicasFinal,
            rendicao_nivel_5: isRendicaoNivel5,
            questao_id: qId,
            aluno_id: validAlunoId,
            tipo_questao: isDiscursiva ? "discursiva" : "objetiva",
          },
        });
      } catch (logErr) {
        console.warn("[Submit Route] Aviso ao gravar em ai_inference_logs:", logErr);
      }
    }

    // Busca ciclo SM-2 anterior do aluno para esta questão
    let repeticoesAnt = 0;
    let efAnt = 2.5;
    let intervaloAnt = 1;

    try {
      const { data: sm2Atual } = await supabase
        .from("revisao_espacada")
        .select("*")
        .eq("aluno_id", validAlunoId)
        .eq("item_tipo", "questao")
        .eq("item_id", qId)
        .maybeSingle();

      if (sm2Atual) {
        repeticoesAnt = sm2Atual.repeticoes;
        efAnt = sm2Atual.fator_facilidade;
        intervaloAnt = sm2Atual.intervalo_dias;
      }
    } catch {
      // Fallback para valores padrão
    }

    // Regra explícita de SM-2 para repetição espaçada:
    // - rendição nível 5: nota 1 (penalidade pedagógica, repeticoes=0, intervalo=1 dia para consolidação prioritária)
    // - aprovado / acerto: nota 3 a 5 (incrementa repeticoes e expande intervalo)
    // - parcial: nota 2 (repeticoes=0, intervalo=1 dia)
    // - incorreto: nota 1 (repeticoes=0, intervalo=1 dia)
    const notaSm2 = isRendicaoNivel5
      ? 1
      : isDiscursiva
      ? (body.veredito === "aprovado" ? Math.max(3, Math.min(5, confianca)) : body.veredito === "parcial" ? 2 : 1)
      : (acertou ? Math.max(3, Math.min(5, confianca)) : 1);

    const novoSm2 = calcularProximoIntervaloSM2(
      repeticoesAnt,
      efAnt,
      intervaloAnt,
      acertou,
      notaSm2
    );

    // Upsert resiliente no Supabase
    try {
      await supabase.from("revisao_espacada").upsert(
        {
          aluno_id: validAlunoId,
          item_tipo: "questao",
          item_id: qId,
          repeticoes: novoSm2.repeticoes,
          fator_facilidade: novoSm2.fator_facilidade,
          intervalo_dias: novoSm2.intervalo_dias,
          proxima_revisao: novoSm2.proxima_revisao_data,
          ultima_revisao: new Date().toISOString(),
        },
        { onConflict: "aluno_id,item_tipo,item_id" }
      );
    } catch (sm2Err) {
      console.warn("[Submit Route] Falha ao atualizar revisao_espacada:", sm2Err);
    }

    return NextResponse.json({
      id: tentativaId,
      acertou,
      gabarito: gabaritoOficial,
      resposta_enviada: respostaAluno,
      sm2: novoSm2,
      estrategias_esperadas: questao.estrategias_esperadas,
      imagem_resolucao_path: imagemResolucaoPath,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro interno";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
