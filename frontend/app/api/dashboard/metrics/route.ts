import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const alunoIdParam = searchParams.get("aluno_id");

    // Total de questões cadastradas no banco
    const { count: totalQuestions } = await supabase
      .from("questoes")
      .select("*", { count: "exact", head: true });

    // Determina o ID do aluno
    let queryTentativas = supabase
      .from("tentativas")
      .select(`
        id,
        questao_id,
        aluno_id,
        data_hora,
        tempo_segundos,
        acertou,
        estrategia_usada,
        tipo_erro,
        confianca_aluno,
        questoes (
          id,
          materia,
          topico,
          gabarito
        )
      `)
      .order("data_hora", { ascending: false });

    let queryRevisoes = supabase
      .from("revisao_espacada")
      .select(`
        id,
        aluno_id,
        item_id,
        repeticoes,
        intervalo_dias,
        fator_facilidade,
        proxima_revisao,
        ultima_revisao
      `);

    if (alunoIdParam && !isNaN(parseInt(alunoIdParam, 10))) {
      const alunoId = parseInt(alunoIdParam, 10);
      queryTentativas = queryTentativas.eq("aluno_id", alunoId);
      queryRevisoes = queryRevisoes.eq("aluno_id", alunoId);
    } else {
      // Por padrão em desenvolvimento/visitante, busca tentativas do usuário neutro 9999 se existirem
      queryTentativas = queryTentativas.eq("aluno_id", 9999);
      queryRevisoes = queryRevisoes.eq("aluno_id", 9999);
    }

    const [{ data: tentativasRaw }, { data: revisoesRaw }] = await Promise.all([
      queryTentativas.limit(50),
      queryRevisoes.limit(20),
    ]);

    const tentativas = (tentativasRaw as any[]) || [];
    const totalResolvidas = tentativas.length;
    const totalAcertos = tentativas.filter((t) => t.acertou === 1).length;
    const taxaAcerto = totalResolvidas > 0 
      ? Number(((totalAcertos / totalResolvidas) * 100).toFixed(1)) 
      : 0;

    // Tempo médio real
    let tempoMedioStr = "0s";
    if (totalResolvidas > 0) {
      const somaTempo = tentativas.reduce((acc, t) => acc + (t.tempo_segundos || 0), 0);
      const mediaSegundos = Math.round(somaTempo / totalResolvidas);
      const minutos = Math.floor(mediaSegundos / 60);
      const segundos = mediaSegundos % 60;
      tempoMedioStr = minutos > 0 
        ? `${minutos}m ${segundos.toString().padStart(2, "0")}s` 
        : `${segundos}s`;
    }

    // Histórico recente formatado com detecção precisa de Hoje/Ontem
    const agora = new Date();
    const hojeDataStr = agora.toDateString();
    const ontemData = new Date(agora);
    ontemData.setDate(ontemData.getDate() - 1);
    const ontemDataStr = ontemData.toDateString();

    const historico = tentativas.slice(0, 5).map((t) => {
      const q = Array.isArray(t.questoes) ? t.questoes[0] : t.questoes;
      const dataObj = t.data_hora ? new Date(t.data_hora) : new Date();
      const horaStr = dataObj.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
      
      let momentoStr = dataObj.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
      if (dataObj.toDateString() === hojeDataStr) {
        momentoStr = `Hoje ${horaStr}`;
      } else if (dataObj.toDateString() === ontemDataStr) {
        momentoStr = `Ontem ${horaStr}`;
      }

      const tempoMin = Math.floor((t.tempo_segundos || 0) / 60);
      const tempoSec = (t.tempo_segundos || 0) % 60;
      const tempoFmt = tempoMin > 0 ? `${tempoMin}m ${tempoSec}s` : `${tempoSec}s`;

      return {
        id: t.id,
        data: momentoStr,
        questao: `Lema #${t.questao_id} · ${q?.materia || "Matemática"} • ${q?.topico || "Tópico Geral"}`,
        gabarito: q?.gabarito || "—",
        resultado: t.acertou === 1,
        tempo: tempoFmt,
        estrategia: t.estrategia_usada || (t.acertou === 1 ? "Resolução Direta" : "Revisão Necessária"),
        confianca: `${t.confianca_aluno || 4}/5`,
      };
    });

    // Revisões SM-2 reais enriquecidas com questões
    const revisoesIds = (revisoesRaw || []).map((r: any) => r.item_id).filter(Boolean);
    const questoesRevisaoMap: Record<number, { materia: string; topico: string }> = {};

    if (revisoesIds.length > 0) {
      const { data: questoesRevisao } = await supabase
        .from("questoes")
        .select("id, materia, topico")
        .in("id", revisoesIds);

      if (questoesRevisao) {
        questoesRevisao.forEach((q: any) => {
          questoesRevisaoMap[q.id] = { materia: q.materia, topico: q.topico };
        });
      }
    }

    const hojeIsoStr = agora.toISOString().split("T")[0];
    const amanha = new Date(agora);
    amanha.setDate(amanha.getDate() + 1);
    const amanhaIsoStr = amanha.toISOString().split("T")[0];

    const revisoes = ((revisoesRaw as any[]) || []).map((r) => {
      const qInfo = questoesRevisaoMap[r.item_id] || { materia: "Matemática", topico: "Geral" };
      let status = "Hoje";
      let cor = "text-rose-500 bg-rose-500/10 border-rose-500/20";

      if (r.proxima_revisao) {
        if (r.proxima_revisao === hojeIsoStr) {
          status = "Hoje";
          cor = "text-rose-500 bg-rose-500/10 border-rose-500/20";
        } else if (r.proxima_revisao === amanhaIsoStr) {
          status = "Amanhã";
          cor = "text-amber-500 bg-amber-500/10 border-amber-500/20";
        } else if (r.proxima_revisao > amanhaIsoStr) {
          const dias = Math.ceil(
            (new Date(r.proxima_revisao).getTime() - agora.getTime()) / (1000 * 60 * 60 * 24)
          );
          status = `Em ${Math.max(2, dias)} dias`;
          cor = "text-emerald-500 bg-emerald-500/10 border-emerald-500/20";
        } else {
          status = "Atrasada";
          cor = "text-red-600 bg-red-600/10 border-red-600/20";
        }
      }

      return {
        questao_id: r.item_id,
        materia: qInfo.materia,
        topico: qInfo.topico,
        repeticoes: r.repeticoes || 1,
        intervalo_dias: r.intervalo_dias || 1,
        status,
        cor,
      };
    });

    // Padrões de erro reais (baseados em tentativas com erro)
    const erros = tentativas.filter((t) => t.acertou === 0);
    let pConta = 0;
    let pInterpretacao = 0;
    let pLacuna = 0;

    if (erros.length > 0) {
      const nConta = erros.filter((e) => /conta|algebra|sinal|aritm/i.test(e.tipo_erro || "")).length;
      const nInterp = erros.filter((e) => /interp|leitura|enunc/i.test(e.tipo_erro || "")).length;
      const nLacuna = erros.length - nConta - nInterp;
      pConta = Math.round((nConta / erros.length) * 100);
      pInterpretacao = Math.round((nInterp / erros.length) * 100);
      pLacuna = Math.max(0, 100 - pConta - pInterpretacao);
    }

    // Radar por matéria
    const materiasAlvo = ["Álgebra", "Geometria", "Trigonometria", "Cálculo", "Combinatória", "Aritmética"];
    const radarData: Record<string, number> = {};

    materiasAlvo.forEach((mat) => {
      const matNormalizada = mat.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
      const matsTentativas = tentativas.filter((t) => {
        const q = Array.isArray(t.questoes) ? t.questoes[0] : t.questoes;
        const materiaNome = (q?.materia || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
        return materiaNome.includes(matNormalizada);
      });

      if (matsTentativas.length > 0) {
        const acertosMat = matsTentativas.filter((t) => t.acertou === 1).length;
        radarData[mat] = Math.round((acertosMat / matsTentativas.length) * 100);
      } else {
        // Se ainda não resolveu dessa matéria, marca 0
        radarData[mat] = 0;
      }
    });

    return NextResponse.json({
      total_resolvidas: totalResolvidas,
      total_acertos: totalAcertos,
      taxa_acerto: taxaAcerto,
      tempo_medio: tempoMedioStr,
      total_questoes_banco: totalQuestions ?? 288,
      historico,
      revisoes,
      diagnostico_erros: {
        total_erros: erros.length,
        conta: pConta,
        interpretacao: pInterpretacao,
        lacuna: pLacuna,
      },
      radar: radarData,
    });
  } catch (err: unknown) {
    return NextResponse.json({
      total_resolvidas: 0,
      total_acertos: 0,
      taxa_acerto: 0,
      tempo_medio: "0s",
      total_questoes_banco: 288,
      historico: [],
      revisoes: [],
      diagnostico_erros: { total_erros: 0, conta: 0, interpretacao: 0, lacuna: 0 },
      radar: { "Álgebra": 0, "Geometria": 0, "Trigonometria": 0, "Cálculo": 0, "Combinatória": 0, "Aritmética": 0 }
    });
  }
}
