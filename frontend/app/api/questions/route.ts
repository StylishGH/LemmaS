import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

const FALLBACK_QUESTOES = [
  {
    id: 1234,
    banca: "ESA",
    ano: 2026,
    materia: "Álgebra",
    topico: "Funções",
    subtopico: "Funções Quadráticas",
    dificuldade: "Média",
    tipo: "objetiva",
    enunciado: "Durante um exercício no Campo de Instrução da Escola de Sargentos das Armas, um robô deve caminhar da origem até A(1,1) e ajustar sua trajetória sobre um arco parabólico f(x) = ax² + bx + c (para x > 1) passando por B(2,0) e C(4,4). Nesse caso, a² + b² + c² + m² é igual a:\n\n(A) 32\n(B) 34\n(C) 36\n(D) 38\n(E) 40",
    gabarito: "B"
  },
  {
    id: 1253,
    banca: "EFOMM",
    ano: 2025,
    materia: "Álgebra Linear",
    topico: "Matrizes",
    subtopico: "Operadores e Identidade",
    dificuldade: "Difícil",
    tipo: "objetiva",
    enunciado: "Sejam alfa e lambda pertencentes aos reais, I a matriz identidade de ordem n e J a matriz com todas entradas iguais a 1, de ordem n. Qual o resultado do produto das matrizes B e x, tal que vale a igualdade A + B = alfa * I + J com as propriedades P1: A*x = lambda*x e P2: a soma de xi = 0?\n\n(A) (α + 1 - λ) x\n(B) (α + λ) x\n(C) (α - λ) x\n(D) α x\n(E) λ x",
    gabarito: "C"
  },
  {
    id: 1526,
    banca: "CEDERJ",
    ano: 2021,
    materia: "Álgebra Linear",
    topico: "Diagonalização",
    subtopico: "Autovalores e Autovetores",
    dificuldade: "Média",
    tipo: "objetiva",
    enunciado: "Uma matriz A de ordem n x n é dita diagonalizável se admite n autovetores linearmente independentes. Analise a matriz B = [[1, 1], [0, 1]]. É correto afirmar que:\n\n(A) B é diagonalizável com autovalor duplo.\n(B) B NÃO é diagonalizável: mult. algébrica 2 e geométrica 1.\n(C) B é diagonalizável pois det(B) = 1.\n(D) B NÃO é diagonalizável pois não possui autovalores reais.",
    gabarito: "B"
  }
];

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const banca = searchParams.get("banca");
    const materia = searchParams.get("materia");
    const topico = searchParams.get("topico");
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "15", 10);
    const offset = (page - 1) * limit;

    let query = supabase
      .from("questoes")
      .select("id, materia, topico, subtopico, dificuldade, banca, ano, enunciado, gabarito, tipo", { count: "exact" });

    if (banca && banca !== "Todas") {
      query = query.ilike("banca", `%${banca}%`);
    }
    if (materia && materia !== "Todas") {
      query = query.ilike("materia", `%${materia}%`);
    }
    if (topico && topico !== "Todos") {
      query = query.or(`topico.ilike.%${topico}%,materia.ilike.%${topico}%,subtopico.ilike.%${topico}%`);
    }
    if (search && search.trim() !== "") {
      query = query.ilike("enunciado", `%${search.trim()}%`);
    }

    query = query.order("id", { ascending: true }).range(offset, offset + limit - 1);

    const { data, count, error } = await query;

    if (error) {
      console.warn("Aviso do Supabase no /api/questions, usando fallback defensivo:", error.message);
      return NextResponse.json({
        questoes: FALLBACK_QUESTOES,
        total: 288,
        page,
        limit,
        total_pages: Math.ceil(288 / limit),
        is_fallback: true,
      });
    }

    return NextResponse.json({
      questoes: data || [],
      total: count || 0,
      page,
      limit,
      total_pages: count ? Math.ceil(count / limit) : 0,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    console.error("Exceção no /api/questions:", message);
    return NextResponse.json({
      questoes: FALLBACK_QUESTOES,
      total: 288,
      page: 1,
      limit: 15,
      total_pages: 20,
      is_fallback: true,
    });
  }
}
