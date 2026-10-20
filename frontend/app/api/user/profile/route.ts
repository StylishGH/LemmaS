import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

/**
 * Heurística de recuperação de motivações canônicas a partir de `concursos_foco`
 * ou payload legado do onboarding. Garante que os checkboxes do Passo 1 em /perfil
 * nunca fiquem em branco quando o aluno já tem foco definido no banco.
 */
function inferirMotivacoes(
  concursosFoco: string | null | undefined,
  currentMotivacoes: string[] | undefined,
  motivosObj?: any
): string[] {
  if (Array.isArray(currentMotivacoes) && currentMotivacoes.length > 0) {
    return currentMotivacoes;
  }

  // Verifica formato de onboarding legado
  if (motivosObj && typeof motivosObj === "object") {
    const categoria = motivosObj.objetivo_categoria;
    if (categoria === "militar") return ["militares_altodesempenho"];
    if (categoria === "vestibular") return ["enem_vestibulares"];
    if (categoria === "professor") return ["superior_docencia"];
    if (categoria === "profissional") {
      const seg = motivosObj.detalhes_objetivo?.profissional?.segmento;
      if (seg === "dados_ia") return ["data_science_ml"];
      if (seg === "concursos_publicos") return ["concursos_publicos"];
      return ["fundamentos_logica_intuicao"];
    }
  }

  const foco = (concursosFoco || "").trim().toLowerCase();
  if (!foco) return [];

  const detected: string[] = [];
  if (
    foco.includes("fundamento") ||
    foco.includes("lógica") ||
    foco.includes("logica") ||
    foco.includes("intuição") ||
    foco.includes("intuicao")
  ) {
    detected.push("fundamentos_logica_intuicao");
  }
  if (
    foco.includes("militar") ||
    foco.includes("esa") ||
    foco.includes("espcex") ||
    foco.includes("ime") ||
    foco.includes("ita") ||
    foco.includes("afa") ||
    foco.includes("efomm") ||
    foco.includes("epcar") ||
    foco.includes("naval")
  ) {
    detected.push("militares_altodesempenho");
  }
  if (
    foco.includes("superior") ||
    foco.includes("docência") ||
    foco.includes("docencia") ||
    foco.includes("graduação") ||
    foco.includes("licenciatura") ||
    foco.includes("cálculo") ||
    foco.includes("álgebra linear")
  ) {
    detected.push("superior_docencia");
  }
  if (
    foco.includes("dados") ||
    foco.includes("machine learning") ||
    foco.includes("ml") ||
    foco.includes("ciência de dados") ||
    foco.includes("data science")
  ) {
    detected.push("data_science_ml");
  }
  if (
    foco.includes("olimpíada") ||
    foco.includes("olimpiada") ||
    foco.includes("obmep") ||
    foco.includes("obm") ||
    foco.includes("canguru")
  ) {
    detected.push("olimpiadas_mat");
  }
  if (
    foco.includes("enem") ||
    foco.includes("vestibular") ||
    foco.includes("fuvest") ||
    foco.includes("unicamp")
  ) {
    detected.push("enem_vestibulares");
  }
  if (
    foco.includes("concurso") ||
    foco.includes("receita") ||
    foco.includes("banco") ||
    foco.includes("tribunal") ||
    foco.includes("pf") ||
    foco.includes("prf")
  ) {
    detected.push("concursos_publicos");
  }

  return detected.length > 0 ? detected : ["fundamentos_logica_intuicao"];
}

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user?.email) {
      return NextResponse.json({ ok: false, error: "Não autenticado" }, { status: 401 });
    }

    const { data: dbUser, error: dbError } = await supabase
      .from("usuarios")
      .select("*")
      .eq("email", user.email)
      .maybeSingle();

    if (dbError) {
      console.error("[API Profile GET] Erro ao buscar usuário no Supabase:", dbError);
      return NextResponse.json({ ok: false, error: "Erro ao consultar banco de dados" }, { status: 500 });
    }

    let parsedMotivos: Record<string, any> = {};
    if (dbUser?.motivos) {
      try {
        parsedMotivos = typeof dbUser.motivos === "string" ? JSON.parse(dbUser.motivos) : dbUser.motivos;
      } catch (err) {
        console.warn("[API Profile GET] Falha no parse de motivos:", err);
      }
    }

    const motivacoes = inferirMotivacoes(
      dbUser?.concursos_foco,
      parsedMotivos.motivacoes_selecionadas,
      parsedMotivos
    );

    const rawGoogleAvatar = user.user_metadata?.avatar_url || user.user_metadata?.picture || null;
    const googleAvatar = typeof rawGoogleAvatar === "string" && !rawGoogleAvatar.startsWith("data:") ? rawGoogleAvatar : null;

    // Foto do banco (base64 ou URL) tem prioridade absoluta sobre o avatar padrão do Google
    const fotoFinal = parsedMotivos.foto_url !== undefined ? parsedMotivos.foto_url : googleAvatar;

    return NextResponse.json({
      ok: true,
      profile: {
        id: dbUser?.id || user.id,
        nome: dbUser?.nome || user.user_metadata?.full_name || user.email.split("@")[0],
        email: user.email,
        escolaridade: dbUser?.escolaridade || "Ensino Superior",
        faculdade: dbUser?.faculdade || "",
        curso: dbUser?.curso || "",
        concursos_foco: dbUser?.concursos_foco || "",
        cpf: dbUser?.cpf || "",
        celular: dbUser?.celular || "",
        cep: dbUser?.cep || "",
        logradouro: dbUser?.logradouro || "",
        numero: dbUser?.numero || "",
        bairro: dbUser?.bairro || "",
        cidade: dbUser?.cidade || "",
        estado: dbUser?.estado || "RJ",
        verificado: dbUser?.verificado ?? (user.email_confirmed_at ? 1 : 0),
        fotoUrl: fotoFinal,
        motivacoesSelecionadas: motivacoes,
        concursosSelecionados: Array.isArray(parsedMotivos.concursos_selecionados) ? parsedMotivos.concursos_selecionados : [],
        conceitosSelecionados: Array.isArray(parsedMotivos.conceitos_selecionados) ? parsedMotivos.conceitos_selecionados : [],
        pedagogicalPreference: parsedMotivos.pedagogical_preference || "conceitual",
        complemento: parsedMotivos.faturamento?.complemento || "",
        dataNascimento: parsedMotivos.faturamento?.data_nascimento || "",
        optInNotificacoes: parsedMotivos.faturamento?.opt_in_notificacoes ?? true,
      },
    });
  } catch (err: any) {
    console.error("[API Profile GET] Erro inesperado:", err);
    return NextResponse.json({ ok: false, error: err?.message || "Erro interno" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user?.email) {
      return NextResponse.json({ ok: false, error: "Não autenticado" }, { status: 401 });
    }

    const body = await req.json();

    // 1. Busca registro atual para merge seguro de JSON em `motivos`
    const { data: existing, error: readError } = await supabase
      .from("usuarios")
      .select("id, motivos, concursos_foco")
      .eq("email", user.email)
      .maybeSingle();

    if (readError) {
      console.error("[API Profile POST] Erro ao ler usuário atual:", readError);
    }

    let currentMotivos: Record<string, any> = {};
    if (existing?.motivos) {
      try {
        currentMotivos = typeof existing.motivos === "string" ? JSON.parse(existing.motivos) : existing.motivos;
      } catch (err) {
        console.warn("[API Profile POST] Falha no parse dos motivos existentes:", err);
      }
    }

    // 2. Merge de campos no objeto `motivos`
    const mergedMotivos: Record<string, any> = { ...currentMotivos };

    // Tratamento de foto: null explícito remove; string atualiza; undefined preserva
    if (body.fotoUrl !== undefined) {
      mergedMotivos.foto_url = body.fotoUrl;
    }
    if (body.motivacoesSelecionadas !== undefined) {
      mergedMotivos.motivacoes_selecionadas = body.motivacoesSelecionadas;
    }
    if (body.concursosSelecionados !== undefined) {
      mergedMotivos.concursos_selecionados = body.concursosSelecionados;
    }
    if (body.conceitosSelecionados !== undefined) {
      mergedMotivos.conceitos_selecionados = body.conceitosSelecionados;
    }
    if (body.pedagogicalPreference !== undefined) {
      mergedMotivos.pedagogical_preference = body.pedagogicalPreference;
    }

    // Faturamento (dados adicionais que não possuem coluna própria na tabela usuarios)
    if (
      body.complemento !== undefined ||
      body.dataNascimento !== undefined ||
      body.optInNotificacoes !== undefined
    ) {
      mergedMotivos.faturamento = {
        ...(mergedMotivos.faturamento || {}),
        ...(body.complemento !== undefined ? { complemento: body.complemento } : {}),
        ...(body.dataNascimento !== undefined ? { data_nascimento: body.dataNascimento } : {}),
        ...(body.optInNotificacoes !== undefined ? { opt_in_notificacoes: body.optInNotificacoes } : {}),
      };
    }

    // 3. Monta payload para atualizar as colunas reais de `public.usuarios`
    const updatePayload: Record<string, any> = {
      motivos: JSON.stringify(mergedMotivos),
    };

    if (body.nome !== undefined) updatePayload.nome = body.nome;
    if (body.escolaridade !== undefined) updatePayload.escolaridade = body.escolaridade;
    if (body.faculdade !== undefined) updatePayload.faculdade = body.faculdade;
    if (body.focoConcurso !== undefined) updatePayload.concursos_foco = body.focoConcurso;

    // Colunas de dados fiscais e endereço
    if (body.cpf !== undefined) updatePayload.cpf = body.cpf;
    if (body.celular !== undefined) updatePayload.celular = body.celular;
    if (body.cep !== undefined) updatePayload.cep = body.cep;
    if (body.logradouro !== undefined) updatePayload.logradouro = body.logradouro;
    if (body.numero !== undefined) updatePayload.numero = body.numero;
    if (body.bairro !== undefined) updatePayload.bairro = body.bairro;
    if (body.cidade !== undefined) updatePayload.cidade = body.cidade;
    if (body.estado !== undefined) updatePayload.estado = body.estado;

    // 4. Executa UPDATE se existir, ou INSERT se for primeiro acesso
    if (existing?.id) {
      const { error: updateError } = await supabase
        .from("usuarios")
        .update(updatePayload)
        .eq("email", user.email);

      if (updateError) {
        console.error("[API Profile POST] Erro no update do Supabase:", updateError);
        return NextResponse.json({ ok: false, error: updateError.message }, { status: 500 });
      }
    } else {
      const { error: insertError } = await supabase
        .from("usuarios")
        .insert({
          email: user.email,
          nome: body.nome || user.user_metadata?.full_name || user.email.split("@")[0],
          senha_hash: "supabase_managed",
          verificado: user.email_confirmed_at ? 1 : 0,
          ...updatePayload,
        });

      if (insertError) {
        console.error("[API Profile POST] Erro no insert do Supabase:", insertError);
        return NextResponse.json({ ok: false, error: insertError.message }, { status: 500 });
      }
    }

    return NextResponse.json({
      ok: true,
      message: "Perfil atualizado com sucesso",
      savedMotivos: mergedMotivos,
    });
  } catch (err: any) {
    console.error("[API Profile POST] Erro inesperado:", err);
    return NextResponse.json({ ok: false, error: err?.message || "Erro interno" }, { status: 500 });
  }
}
