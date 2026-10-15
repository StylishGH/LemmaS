import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { calcularProximoIntervaloSM2 } from "@/lib/sm2";

interface EnviarSimuladoRequest {
  simuladoId?: string | null;
  questionIds?: number[];
  respostasDoUsuario: Record<number, string>; // questionId -> resposta (A, B, C, D, E)
  tempoGastoSegundos: number;
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();

    // 1. Resolve usuário e ID numérico (BIGINT) correspondente na tabela usuarios
    let validAlunoId = 9999;
    let authUserId: string | null = null;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        authUserId = user.id;
        if (user.email) {
          const { data: dbUser } = await supabase
            .from("usuarios")
            .select("id")
            .eq("email", user.email)
            .maybeSingle();

          if (dbUser?.id) {
            validAlunoId = dbUser.id;
          } else {
            // Provisiona usuário automaticamente na tabela usuarios se não existir
            const nomeUsuario = user.user_metadata?.full_name || user.email.split("@")[0] || "Aluno LEMMAS";
            const { data: novoDbUser, error: insertUserError } = await supabase
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
            } else if (insertUserError) {
              console.warn("Aviso ao provisionar usuario para simulado:", insertUserError.message);
            }
          }
        }
      }
    } catch (authErr) {
      console.warn("Aviso na resolução de auth em enviar simulado:", authErr);
    }

    const body: EnviarSimuladoRequest = await req.json();
    const { simuladoId, questionIds: providedQuestionIds, respostasDoUsuario, tempoGastoSegundos = 0 } = body;

    if (!respostasDoUsuario) {
      return NextResponse.json({ error: "Respostas do simulado não informadas" }, { status: 400 });
    }

    // 2. Determina quais IDs de questões compõem o simulado
    let targetQuestionIds: number[] = [];
    if (Array.isArray(providedQuestionIds) && providedQuestionIds.length > 0) {
      targetQuestionIds = providedQuestionIds.map((id) => Number(id)).filter(Boolean);
    } else {
      targetQuestionIds = Object.keys(respostasDoUsuario).map((id) => Number(id)).filter(Boolean);
    }

    if (targetQuestionIds.length === 0) {
      return NextResponse.json({ error: "Nenhuma questão informada para este simulado" }, { status: 400 });
    }

    // 3. Busca metadados e gabaritos oficiais das questões
    const { data: questionsRaw, error: questionsError } = await supabase
      .from("questoes")
      .select("id, gabarito, materia, topico, banca, ano, dificuldade, tipo")
      .in("id", targetQuestionIds);

    if (questionsError || !questionsRaw || questionsRaw.length === 0) {
      return NextResponse.json({ error: "Erro ao buscar questões do simulado no banco" }, { status: 500 });
    }

    // Preserva a ordem original dos questionIds
    const questionsMap = new Map<number, any>();
    questionsRaw.forEach((q) => questionsMap.set(q.id, q));
    const questions = targetQuestionIds.map((id) => questionsMap.get(id)).filter(Boolean);

    // 4. Processa cada resposta, computa métricas e prepara gravações
    const resultados = [];
    const tentativasParaInserir = [];
    let acertos = 0;
    let erros = 0;
    let emBranco = 0;

    const totalRespondidas = questions.filter((q) => Boolean(respostasDoUsuario[q.id])).length;
    const tempoPorQuestao = totalRespondidas > 0 
      ? Math.max(1, Math.floor(tempoGastoSegundos / totalRespondidas)) 
      : 0;

    for (const question of questions) {
      const respostaAluno = respostasDoUsuario[question.id];
      const gabaritoOficial = (question.gabarito || "").trim().toUpperCase();

      if (!respostaAluno) {
        emBranco++;
        resultados.push({
          questao_id: question.id,
          acertou: false,
          em_branco: true,
          resposta_enviada: null,
          gabarito: gabaritoOficial,
        });
        continue;
      }

      const respostaUpper = String(respostaAluno).trim().toUpperCase();

      if (!gabaritoOficial) {
        // Gabarito ausente no banco: não pontua como acerto nem penaliza como erro
        resultados.push({
          questao_id: question.id,
          acertou: false,
          gabarito_ausente: true,
          resposta_enviada: respostaUpper,
          gabarito: null,
        });
        continue;
      }

      const acertou = respostaUpper === gabaritoOficial;

      if (acertou) acertos++;
      else erros++;

      // Prepara tentativa para a tabela tentativas (aluno_id numérico BIGINT)
      tentativasParaInserir.push({
        questao_id: question.id,
        aluno_id: validAlunoId,
        tempo_segundos: tempoPorQuestao,
        acertou: acertou ? 1 : 0,
        tipo_erro: acertou ? "nenhum" : "simulado_incorreto",
        estrategia_usada: "Modo Simulado",
        confianca_aluno: 4,
        anotacoes: simuladoId ? `Simulado ${simuladoId}` : "Simulado Cronometrado",
      });

      // Atualiza repetição espaçada SM-2 para a questão resolvida
      try {
        const { data: sm2Atual } = await supabase
          .from("revisao_espacada")
          .select("*")
          .eq("aluno_id", validAlunoId)
          .eq("item_tipo", "questao")
          .eq("item_id", question.id)
          .maybeSingle();

        const repeticoesAnt = sm2Atual ? sm2Atual.repeticoes : 0;
        const efAnt = sm2Atual ? sm2Atual.fator_facilidade : 2.5;
        const intervaloAnt = sm2Atual ? sm2Atual.intervalo_dias : 1;

        const novoSm2 = calcularProximoIntervaloSM2(
          repeticoesAnt,
          efAnt,
          intervaloAnt,
          acertou,
          4
        );

        await supabase.from("revisao_espacada").upsert(
          {
            aluno_id: validAlunoId,
            item_tipo: "questao",
            item_id: question.id,
            repeticoes: novoSm2.repeticoes,
            fator_facilidade: novoSm2.fator_facilidade,
            intervalo_dias: novoSm2.intervalo_dias,
            proxima_revisao: novoSm2.proxima_revisao_data,
            ultima_revisao: new Date().toISOString(),
          },
          { onConflict: "aluno_id,item_tipo,item_id" }
        );

        resultados.push({
          questao_id: question.id,
          acertou,
          em_branco: false,
          resposta_enviada: respostaUpper,
          gabarito: gabaritoOficial,
          sm2: novoSm2,
        });
      } catch (sm2Err) {
        console.warn("Aviso ao atualizar SM-2 no simulado:", sm2Err);
        resultados.push({
          questao_id: question.id,
          acertou,
          em_branco: false,
          resposta_enviada: respostaUpper,
          gabarito: gabaritoOficial,
        });
      }
    }

    // 5. Grava todas as tentativas no Supabase
    if (tentativasParaInserir.length > 0) {
      const { error: attemptError } = await supabase
        .from("tentativas")
        .insert(tentativasParaInserir);

      if (attemptError) {
        console.error("Erro crítico ao gravar tentativas do simulado:", attemptError);
      }
    }

    // 6. Atualiza ou insere o registro do simulado na tabela simulados (se usuário autenticado)
    if (authUserId) {
      try {
        const idFinalSimulado = simuladoId || crypto.randomUUID();
        const bancasPresentes = Array.from(
          new Set(questions.map((q) => q.banca).filter(Boolean))
        ) as string[];

        await supabase.from("simulados").upsert(
          {
            id: idFinalSimulado,
            aluno_id: authUserId,
            bancas: bancasPresentes.length > 0 ? bancasPresentes : ["Geral"],
            total_questoes: questions.length,
            tempo_total_segundos: tempoGastoSegundos,
            com_tempo: true,
            status: "finalizado",
            acertos,
            erros,
            em_branco: emBranco,
            tempo_gasto_segundos: tempoGastoSegundos,
            finalizado_em: new Date().toISOString(),
          },
          { onConflict: "id" }
        );
      } catch (simuladoSaveErr) {
        console.warn("Aviso ao persistir registro em simulados:", simuladoSaveErr);
      }
    }

    const taxa = questions.length > 0 ? Math.round((acertos / questions.length) * 100) : 0;

    return NextResponse.json({
      success: true,
      resultado: {
        simuladoId: simuladoId || null,
        totalQuestoes: questions.length,
        acertos,
        erros,
        emBranco,
        taxaAcerto: taxa,
        tempoGastoSegundos,
        resultados,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro interno ao processar envio do simulado";
    console.error("Erro crítico ao enviar simulado:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}