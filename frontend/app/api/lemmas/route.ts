import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import fs from "fs";
import path from "path";

// Cache em memória no servidor para latência < 1ms
interface LemmaRecord {
  id: number;
  codigo: string;
  titulo: string;
  materia: string;
  topico: string;
  nivel: string;
  formula_latex: string;
  gatilho_reconhecimento: string;
  intuicao_prova?: string;
  questoes_vinculadas_count: number;
}

let cachedLemmasList: LemmaRecord[] | null = null;
const cachedLemmasByCode = new Map<string, LemmaRecord>();
const cachedLemmasById = new Map<number, LemmaRecord>();

function getLocalCatalogBackup(): LemmaRecord[] {
  try {
    const localPath = path.resolve(process.cwd(), "..", "data", "repertorio", "catalogo_2000_lemmas.json");
    if (fs.existsSync(localPath)) {
      const raw = fs.readFileSync(localPath, "utf-8");
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.map((item, idx) => ({
          id: idx + 1,
          codigo: item.codigo || `LEMA-${String(idx + 1).padStart(4, "0")}`,
          titulo: item.titulo || "Lema Canônico",
          materia: item.materia || "Álgebra",
          topico: item.topico || "Geral",
          nivel: item.nivel || "Militar/Vestibular",
          formula_latex: item.formula_latex || "",
          gatilho_reconhecimento: item.gatilho_reconhecimento || "",
          intuicao_prova: item.intuicao_prova || "",
          questoes_vinculadas_count: item.questoes_vinculadas_count || 0,
        }));
      }
    }
  } catch (err) {
    console.warn("Aviso ao ler backup local de lemas:", err);
  }
  return [];
}

async function populateCache(supabase: any) {
  if (cachedLemmasList && cachedLemmasList.length > 0) return;

  try {
    const { data, error } = await supabase
      .from("lemmas")
      .select("id, codigo, titulo, materia, topico, nivel, formula_latex, gatilho_reconhecimento, intuicao_prova, questoes_vinculadas_count")
      .order("id", { ascending: true })
      .limit(2500);

    if (error || !data || data.length === 0) {
      console.warn("Supabase public.lemmas vazio ou inacessível, utilizando catálogo local como fallback.", error);
      cachedLemmasList = getLocalCatalogBackup();
    } else {
      cachedLemmasList = data as LemmaRecord[];
    }
  } catch (err) {
    console.warn("Erro ao buscar public.lemmas no Supabase:", err);
    cachedLemmasList = getLocalCatalogBackup();
  }

  if (cachedLemmasList) {
    cachedLemmasByCode.clear();
    cachedLemmasById.clear();
    for (const l of cachedLemmasList) {
      cachedLemmasByCode.set(l.codigo.toUpperCase(), l);
      cachedLemmasById.set(l.id, l);
      // Indexa também pelo número numérico (ex: "8" ou "008" ou "0008")
      const numMatch = l.codigo.match(/\d+/);
      if (numMatch) {
        const num = parseInt(numMatch[0], 10);
        cachedLemmasByCode.set(`LEMA-${num}`, l);
        cachedLemmasByCode.set(String(num), l);
      }
    }
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const codigo = searchParams.get("codigo");
  const idParam = searchParams.get("id");
  const materia = searchParams.get("materia");
  const search = searchParams.get("search");
  const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 2000);

  const supabase = createClient();
  await populateCache(supabase);

  // 1. Busca por código específico (ex: "LEMA-0008" ou "LEMA-8" ou "8")
  if (codigo) {
    const cleanCode = codigo.trim().toUpperCase();
    let lema = cachedLemmasByCode.get(cleanCode);
    if (!lema) {
      // Tenta formatar com padding LEMA-XXXX
      const numOnly = cleanCode.replace(/\D/g, "");
      if (numOnly) {
        const padded = `LEMA-${numOnly.padStart(4, "0")}`;
        lema = cachedLemmasByCode.get(padded) || cachedLemmasByCode.get(numOnly);
      }
    }
    if (lema) {
      return NextResponse.json({ lema });
    }
    return NextResponse.json({ error: "Lema não encontrado", codigo }, { status: 404 });
  }

  // 2. Busca por ID numérico
  if (idParam) {
    const idNum = parseInt(idParam, 10);
    const lema = cachedLemmasById.get(idNum);
    if (lema) {
      return NextResponse.json({ lema });
    }
    return NextResponse.json({ error: "Lema não encontrado para o ID", id: idParam }, { status: 404 });
  }

  // 3. Listagem com filtros
  let result = cachedLemmasList || [];

  if (materia) {
    const matLower = materia.toLowerCase();
    result = result.filter((l) => l.materia.toLowerCase().includes(matLower));
  }

  if (search) {
    const sLower = search.toLowerCase();
    result = result.filter(
      (l) =>
        l.titulo.toLowerCase().includes(sLower) ||
        l.codigo.toLowerCase().includes(sLower) ||
        l.topico.toLowerCase().includes(sLower) ||
        l.gatilho_reconhecimento.toLowerCase().includes(sLower)
    );
  }

  return NextResponse.json({
    total: result.length,
    lemmas: result.slice(0, limit),
  });
}
