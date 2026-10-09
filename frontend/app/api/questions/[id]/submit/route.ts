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
    const { resposta, tempo_segundos = 0, confianca = 4, aluno_id } = body;
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

    const gabaritoOficial = (questao.gabarito || "").trim().toUpperCase();
    const respostaAluno = String(resposta).trim().toUpperCase();
    const acertou = respostaAluno === gabaritoOficial;

    // Registra tentativa no Supabase
    await supabase.from("tentativas").insert({
      questao_id: qId,
      aluno_id: validAlunoId,
      tempo_segundos: Math.max(0, parseInt(String(tempo_segundos), 10) || 0),
      acertou: acertou ? 1 : 0,
      estrategia_usada: body.estrategia_usada || null,
      tipo_erro: acertou ? "nenhum" : (body.tipo_erro || "outro"),
      confianca_aluno: confianca,
      anotacoes: body.anotacoes || null,
    });

    // Busca ciclo SM-2 anterior do aluno para esta questão
    const { data: sm2Atual } = await supabase
      .from("revisao_espacada")
      .select("*")
      .eq("aluno_id", validAlunoId)
      .eq("item_tipo", "questao")
      .eq("item_id", qId)
      .maybeSingle();

    const repeticoesAnt = sm2Atual ? sm2Atual.repeticoes : 0;
    const efAnt = sm2Atual ? sm2Atual.fator_facilidade : 2.5;
    const intervaloAnt = sm2Atual ? sm2Atual.intervalo_dias : 1;

    const novoSm2 = calcularProximoIntervaloSM2(
      repeticoesAnt,
      efAnt,
      intervaloAnt,
      acertou,
      confianca
    );

    // Upsert no Supabase
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

    return NextResponse.json({
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
