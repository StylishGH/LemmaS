import { NextRequest, NextResponse } from "next/server";
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

    // Telemetria estruturada nos logs e anotações para recuperação de dados
    const nivelFinalDica = isRendicaoNivel5 ? 5 : (Number(nivel_max_dica) || 0);
    const usouDicaFinal = Boolean(dica_socratica_usada || isRendicaoNivel5 || nivelFinalDica > 0);
    const totalDicasFinal = Number(total_dicas_solicitadas) || (isRendicaoNivel5 ? 1 : usouDicaFinal ? 1 : 0);

    const telemetriaTag = usouDicaFinal
      ? `[TELEMETRIA_SOCRATICA: usou_dica=true, nivel_max=${nivelFinalDica}, acertou=${acertou}, total_dicas=${totalDicasFinal}${isRendicaoNivel5 ? ', rendicao=true' : ''}]`
      : `[TELEMETRIA_SOCRATICA: usou_dica=false, acertou=${acertou}]`;

    const anotacoesFormatadas = isDiscursiva
      ? `${telemetriaTag} [VEREDITO:${body.veredito}] ${body.anotacoes || body.feedback_latex || ""}`.trim()
      : (body.anotacoes ? `${telemetriaTag} ${body.anotacoes}`.trim() : telemetriaTag);

    let tentativaId: any = null;
    try {
      const { data: tentativaInserida, error: tentativaErr } = await supabase.from("tentativas").insert({
        questao_id: qId,
        aluno_id: validAlunoId,
        tempo_segundos: Math.max(0, parseInt(String(tempo_segundos), 10) || 0),
        acertou: acertou ? 1 : 0,
        estrategia_usada: estrategiaFormatada,
        tipo_erro: tipoErro,
        confianca_aluno: isRendicaoNivel5 ? 1 : confianca,
        anotacoes: anotacoesFormatadas,
      }).select("id").single();

      if (!tentativaErr && tentativaInserida) {
        tentativaId = tentativaInserida.id;
      }
    } catch (saveErr) {
      console.warn("[Submit Route] Falha ao gravar em public.tentativas:", saveErr);
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
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro interno";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
