import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
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

    // Tenta identificar o usuário autenticado na sessão de cookies
    let targetAlunoId = 9999;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        const { data: dbUser } = await supabase
          .from("usuarios")
          .select("id")
          .eq("email", user.email)
          .maybeSingle();

        if (dbUser?.id) {
          targetAlunoId = dbUser.id;
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
            targetAlunoId = novoDbUser.id;
          }
        }
      } else if (alunoIdParam && !isNaN(parseInt(alunoIdParam, 10))) {
        targetAlunoId = parseInt(alunoIdParam, 10);
      }
    } catch {
      if (alunoIdParam && !isNaN(parseInt(alunoIdParam, 10))) {
        targetAlunoId = parseInt(alunoIdParam, 10);
      }
    }

    queryTentativas = queryTentativas.eq("aluno_id", targetAlunoId);
    queryRevisoes = queryRevisoes.eq("aluno_id", targetAlunoId);

    const [{ count: exactTotalResolvidas }, { count: exactTotalAcertos }, { data: tentativasRaw }, { data: revisoesRaw }] = await Promise.all([
      supabase.from("tentativas").select("*", { count: "exact", head: true }).eq("aluno_id", targetAlunoId),
      supabase.from("tentativas").select("*", { count: "exact", head: true }).eq("aluno_id", targetAlunoId).eq("acertou", 1),
      queryTentativas.limit(100),
      queryRevisoes.limit(20),
    ]);

    const tentativas = (tentativasRaw as any[]) || [];
    const totalResolvidas = exactTotalResolvidas ?? tentativas.length;
    const totalAcertos = exactTotalAcertos ?? tentativas.filter((t) => t.acertou === 1).length;
    const taxaAcerto = totalResolvidas > 0 
      ? Number(((totalAcertos / totalResolvidas) * 100).toFixed(1)) 
      : 0;

    // 1. Tempo médio real com proteção contra outliers (teto de 900s / 15 min por questão)
    let tempoMedioStr = "0s";
    if (totalResolvidas > 0) {
      const somaTempo = tentativas.reduce((acc, t) => {
        const rawSec = t.tempo_segundos || 0;
        // Aplica teto de 900s (15 min) para evitar distorções causadas por abas esquecidas abertas
        const cappedSec = Math.min(Math.max(0, rawSec), 900);
        return acc + cappedSec;
      }, 0);
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

    // Função para normalizar matéria e tópico (evita rótulos genéricos como 'Matemática / Geral')
    const normalizarMateriaETopico = (materiaRaw?: string, topicoRaw?: string): { materia: string; topico: string } => {
      let m = (materiaRaw || "").trim();
      let t = (topicoRaw || "").trim();

      const mNorm = m.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
      const tNorm = t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

      // Normaliza matéria genérica
      if (!m || mNorm === "matematica" || mNorm === "geral" || mNorm === "matematica geral") {
        if (tNorm.includes("funcao") || tNorm.includes("algebra") || tNorm.includes("polinomio")) {
          m = "Álgebra";
        } else if (tNorm.includes("geometria") || tNorm.includes("triangulo") || tNorm.includes("circulo")) {
          m = "Geometria";
        } else if (tNorm.includes("trigonometria")) {
          m = "Trigonometria";
        } else if (tNorm.includes("calculo") || tNorm.includes("integral") || tNorm.includes("derivada") || tNorm.includes("linear")) {
          m = "Cálculo";
        } else if (tNorm.includes("combinatoria") || tNorm.includes("probabilidade") || tNorm.includes("logica")) {
          m = "Probabilidade e Combinatória";
        } else if (tNorm.includes("fracao") || tNorm.includes("fracoes") || tNorm.includes("numero") || tNorm.includes("aritmetica")) {
          m = "Matemática Básica";
        } else {
          m = "Matemática Básica";
        }
      }

      // Normaliza tópico genérico
      if (!t || tNorm === "geral" || tNorm === mNorm || tNorm === "matematica") {
        t = "Conceitos Fundamentais";
      }

      return { materia: m, topico: t };
    };

    // Revisões SM-2 reais enriquecidas com questões
    const revisoesIds = (revisoesRaw || []).map((r: any) => r.item_id).filter(Boolean);
    const questoesRevisaoMap: Record<number, { materia: string; topico: string; lema_id?: number | null; lema_codigo?: string | null }> = {};

    if (revisoesIds.length > 0) {
      const { data: questoesRevisao } = await supabase
        .from("questoes")
        .select("id, materia, topico, lema_id, lema_codigo")
        .in("id", revisoesIds);

      if (questoesRevisao) {
        questoesRevisao.forEach((q: any) => {
          const norm = normalizarMateriaETopico(q.materia, q.topico);
          questoesRevisaoMap[q.id] = {
            ...norm,
            lema_id: q.lema_id,
            lema_codigo: q.lema_codigo,
          };
        });
      }
    }

    const hojeIsoStr = agora.toISOString().split("T")[0];
    const amanha = new Date(agora);
    amanha.setDate(amanha.getDate() + 1);
    const amanhaIsoStr = amanha.toISOString().split("T")[0];

    const revisoes = ((revisoesRaw as any[]) || []).map((r) => {
      const qInfo = questoesRevisaoMap[r.item_id] || {
        ...normalizarMateriaETopico(undefined, undefined),
        lema_id: null,
        lema_codigo: null,
      };
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
        lema_id: qInfo.lema_id,
        lema_codigo: qInfo.lema_codigo,
        repeticoes: r.repeticoes || 1,
        intervalo_dias: r.intervalo_dias || 1,
        status,
        cor,
      };
    });

    // 2. Padrões de erro reais (distribuídos pelo tempo e natureza do erro)
    const erros = tentativas.filter((t) => t.acertou === 0);
    let pConta = 0;
    let pInterpretacao = 0;
    let pLacuna = 0;

    if (erros.length > 0) {
      let nConta = 0;
      let nInterp = 0;
      let nLacuna = 0;

      erros.forEach((e) => {
        const tSec = e.tempo_segundos || 0;
        const tipoErroExpl = (e.tipo_erro || "").toLowerCase();

        // 1. Prioriza classificação explícita se houver
        if (tipoErroExpl === "conta_sinal" || tipoErroExpl.includes("calculo") || tipoErroExpl.includes("algebra") || tipoErroExpl.includes("sinal")) {
          nConta++;
        } else if (tipoErroExpl === "interpretacao" || tipoErroExpl.includes("enunciado") || tipoErroExpl.includes("leitura")) {
          nInterp++;
        } else if (tipoErroExpl === "conceitual" || tipoErroExpl.includes("axioma") || tipoErroExpl.includes("teorema") || tipoErroExpl.includes("lacuna")) {
          nLacuna++;
        } else {
          // 2. Distribuição comportamental temporal estrita:
          // Se errou rápido (< 35s): Interpretação do Enunciado (resposta precipitada)
          if (tSec < 35) {
            nInterp++;
          }
          // Se errou após muito tempo (> 180s): Conta, Álgebra & Sinal (muito cálculo, desvio aritmético)
          else if (tSec > 180) {
            nConta++;
          }
          // Caso intermediário (35s a 180s): Lacuna Conceitual / Teorema
          else {
            nLacuna++;
          }
        }
      });

      pConta = Math.round((nConta / erros.length) * 100);
      pInterpretacao = Math.round((nInterp / erros.length) * 100);
      pLacuna = Math.max(0, 100 - pConta - pInterpretacao);
    }

    // 3. Radar de Domínio Matemático (6 eixos canônicos com agrupamento de matérias do banco)
    const mapearMateriaParaEixo = (materiaRaw?: string, topicoRaw?: string): "Álgebra" | "Geometria" | "Trigonometria" | "Cálculo" | "Combinatória" | "Aritmética" => {
      const norm = (str?: string) => (str || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
      const m = norm(materiaRaw);
      const t = norm(topicoRaw);

      // Cálculo & Álgebra Linear: Cálculo, Álgebra Linear, Cálculo 1, Cálculo 3, Limites, Derivadas, Integrais
      if (
        m.includes("calculo") || m.includes("algebra linear") || m.includes("limite") || m.includes("derivada") || m.includes("integral") ||
        t.includes("calculo") || t.includes("algebra linear") || t.includes("integral") || t.includes("derivada")
      ) {
        return "Cálculo";
      }

      // Trigonometria: Trigonometria
      if (m.includes("trigonometria") || t.includes("trigono")) {
        return "Trigonometria";
      }

      // Geometria: Geometria Plana, Geometria Espacial, Geometria Analítica, Geometria
      if (m.includes("geometria") || t.includes("geometria") || m.includes("analitica")) {
        return "Geometria";
      }

      // Combinatória: Probabilidade e Combinatória, Análise Combinatória, Probabilidade, Estatística, Lógica
      if (
        m.includes("combinatoria") || m.includes("probabilidade") || m.includes("estatistica") || m.includes("logica") ||
        t.includes("combinatoria") || t.includes("probabilidade") || t.includes("estatistica") || t.includes("logica")
      ) {
        return "Combinatória";
      }

      // Álgebra: Álgebra, Funções, Polinômios e Complexos
      if (
        m.includes("algebra") || m.includes("funcoes") || m.includes("polinomios") || m.includes("complexos") ||
        t.includes("funcao") || t.includes("polinomio") || t.includes("complexo")
      ) {
        return "Álgebra";
      }

      // Aritmética: Matemática Básica, Teoria dos Números, Aritmética, Geral, Matemática
      if (
        m.includes("matematica basica") || m.includes("teoria dos numeros") || m.includes("aritmetica") ||
        m === "geral" || m === "matematica" || m === "matematica geral" ||
        t.includes("fracao") || t.includes("fracoes") || t.includes("aritmetica") || t.includes("numero")
      ) {
        return "Aritmética";
      }

      return "Aritmética";
    };

    const materiasAlvo = ["Álgebra", "Geometria", "Trigonometria", "Cálculo", "Combinatória", "Aritmética"] as const;
    const radarData: Record<string, number> = {};

    materiasAlvo.forEach((eixo) => {
      const matsTentativas = tentativas.filter((t) => {
        const q = Array.isArray(t.questoes) ? t.questoes[0] : t.questoes;
        return mapearMateriaParaEixo(q?.materia, q?.topico) === eixo;
      });

      if (matsTentativas.length > 0) {
        const acertosMat = matsTentativas.filter((t) => t.acertou === 1).length;
        radarData[eixo] = Math.round((acertosMat / matsTentativas.length) * 100);
      } else {
        radarData[eixo] = 0;
      }
    });

    // 4. Conselho da MathAI Engine adaptativo e coerente com a taxa de acerto
    let conselhoIa = "Comece seu treino com questões da EFOMM, CEDERJ ou ESA para calibrar seu nível inicial no LEMMAS Core.";
    if (totalResolvidas > 0) {
      if (taxaAcerto <= 60) {
        // Encontra o eixo com mais dificuldades entre os que tiveram tentativas
        let piorEixo = "";
        let menorTaxa = 101;
        materiasAlvo.forEach((eixo) => {
          const mats = tentativas.filter((t) => {
            const q = Array.isArray(t.questoes) ? t.questoes[0] : t.questoes;
            return mapearMateriaParaEixo(q?.materia, q?.topico) === eixo;
          });
          if (mats.length > 0) {
            const tx = (mats.filter((t) => t.acertou === 1).length / mats.length) * 100;
            if (tx < menorTaxa) {
              menorTaxa = tx;
              piorEixo = eixo;
            }
          }
        });

        const pendentesCount = revisoes.length;
        const pendentesMsg = pendentesCount > 0 
          ? ` e priorize os ${pendentesCount} lema(s) pendente(s) na Fila SM-2.` 
          : ".";

        conselhoIa = `Aproveitamento em fase de calibração (${taxaAcerto}%). Recomendamos focar em ${piorEixo || "fundamentos"} com rascunho passo a passo na Lousa antes de assinalar${pendentesMsg}`;
      } else {
        conselhoIa = `Sua precisão atual está consolidada (${taxaAcerto}%). Mantenha o rigor axiomático no passo a passo e resolva os lemas agendados no SM-2 para sustentar a curva de retenção.`;
      }
    }

    // Cálculo de Streak Consecutivo real baseado em tentativas
    const datasSet = new Set<string>();
    tentativas.forEach((t) => {
      if (t.data_hora) {
        const d = new Date(t.data_hora);
        if (!isNaN(d.getTime())) {
          datasSet.add(d.toISOString().split("T")[0]);
        }
      }
    });

    let streakDias = 0;
    if (datasSet.size > 0) {
      const hojeYmd = agora.toISOString().split("T")[0];
      const ontemYmd = ontemData.toISOString().split("T")[0];
      if (datasSet.has(hojeYmd) || datasSet.has(ontemYmd)) {
        let cursor = datasSet.has(hojeYmd) ? new Date(agora) : new Date(ontemData);
        while (true) {
          const cYmd = cursor.toISOString().split("T")[0];
          if (datasSet.has(cYmd)) {
            streakDias++;
            cursor.setDate(cursor.getDate() - 1);
          } else {
            break;
          }
        }
      }
    }

    return NextResponse.json({
      total_resolvidas: totalResolvidas,
      total_acertos: totalAcertos,
      taxa_acerto: taxaAcerto,
      tempo_medio: tempoMedioStr,
      streak_dias: streakDias,
      // Sem fallback fixo: se a contagem do banco falhar, null — nunca um total antigo.
      total_questoes_banco: totalQuestions ?? null,
      historico,
      revisoes,
      diagnostico_erros: {
        total_erros: erros.length,
        conta: pConta,
        interpretacao: pInterpretacao,
        lacuna: pLacuna,
      },
      radar: radarData,
      conselho_ia: conselhoIa,
    });
  } catch (err: unknown) {
    return NextResponse.json({
      total_resolvidas: 0,
      total_acertos: 0,
      taxa_acerto: 0,
      tempo_medio: "0s",
      streak_dias: 0,
      total_questoes_banco: null,
      historico: [],
      revisoes: [],
      diagnostico_erros: { total_erros: 0, conta: 0, interpretacao: 0, lacuna: 0 },
      radar: { "Álgebra": 0, "Geometria": 0, "Trigonometria": 0, "Cálculo": 0, "Combinatória": 0, "Aritmética": 0 },
      conselho_ia: "Comece seu treino com questões da EFOMM, CEDERJ ou ESA para calibrar seu nível inicial no LEMMAS Core.",
    });
  }
}
