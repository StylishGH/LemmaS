import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

interface SimuladoRequest {
  ids?: number[];
  bancas?: string[];
  quantidade?: number;
  comTempo?: boolean;
  tempoTotalSegundos?: number;
  tempoPorQuestaoSegundos?: number;
}

interface SimuladoResponse {
  simuladoId: string;
  questions: Array<{
    id: number;
    enunciado: string;
    gabarito: string;
    alternativas?: Record<string, string>;
    materia: string;
    topico: string;
    banca?: string;
    ano?: number;
    figura_path?: string | null;
  }>;
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();

    // Obtém usuário se houver sessão ativa
    let authUserId: string | null = null;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        authUserId = user.id;
      }
    } catch {}

    const body: SimuladoRequest = await req.json();
    const { ids, bancas, quantidade = 10, comTempo = true, tempoTotalSegundos, tempoPorQuestaoSegundos } = body;

    let questions: any[] = [];

    // Prioridade 1: Buscar pelos IDs fornecidos diretamente
    if (Array.isArray(ids) && ids.length > 0) {
      const { data, error } = await supabase
        .from("questoes")
        .select("id, enunciado, gabarito, alternativas, materia, topico, banca, ano, figura_path, tipo, dificuldade")
        .in("id", ids);

      if (error || !data || data.length === 0) {
        return NextResponse.json({ error: "Nenhuma questão encontrada para os IDs fornecidos" }, { status: 404 });
      }

      // Mantém a ordem dos IDs solicitados
      const map = new Map<number, any>();
      data.forEach((q) => map.set(q.id, q));
      questions = ids.map((id) => map.get(id)).filter(Boolean);
    } 
    // Prioridade 2: Buscar por bancas
    else if (Array.isArray(bancas) && bancas.length > 0) {
      const { data, error } = await supabase
        .from("questoes")
        .select("id, enunciado, gabarito, alternativas, materia, topico, banca, ano, figura_path, tipo, dificuldade")
        .in("banca", bancas)
        .order("id", { ascending: true })
        .limit(Math.max(1, quantidade));

      if (error || !data || data.length === 0) {
        return NextResponse.json({ error: "Nenhuma questão encontrada para essas bancas" }, { status: 404 });
      }
      questions = data;
    } else {
      return NextResponse.json({ error: "Informe ao menos uma lista de IDs ou bancas para o simulado" }, { status: 400 });
    }

    const simuladoId = crypto.randomUUID();
    const totalTime = tempoTotalSegundos || (tempoPorQuestaoSegundos ? tempoPorQuestaoSegundos * questions.length : 3600);

    // Se o usuário estiver autenticado, cria o registro inicial na tabela simulados
    if (authUserId) {
      const bancasEncontradas = Array.from(new Set(questions.map((q) => q.banca).filter(Boolean))) as string[];
      try {
        await supabase
          .from("simulados")
          .insert({
            id: simuladoId,
            aluno_id: authUserId,
            bancas: bancasEncontradas.length > 0 ? bancasEncontradas : ["Geral"],
            total_questoes: questions.length,
            tempo_total_segundos: totalTime,
            com_tempo: comTempo,
            status: "em_andamento",
            criado_em: new Date().toISOString(),
          });
      } catch (insertSimuladoErr) {
        console.warn("Aviso ao registrar simulado em andamento:", insertSimuladoErr);
      }
    }

    const questionsForClient = questions.map((q) => ({
      id: q.id,
      enunciado: q.enunciado,
      gabarito: q.gabarito,
      alternativas: q.alternativas,
      materia: q.materia,
      topico: q.topico,
      banca: q.banca,
      ano: q.ano,
      figura_path: q.figura_path,
    }));

    return NextResponse.json({
      simuladoId,
      questions: questionsForClient,
    } as SimuladoResponse);

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro interno ao criar simulado";
    console.error("Erro ao criar simulado:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}