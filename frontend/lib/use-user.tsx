"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase";

export interface UserProfile {
  id?: number | string;
  nome: string;
  email: string;
  escolaridade: string;
  faculdade: string;
  semestre: string;
  concursosSelecionados: string[];
  motivacoesSelecionadas: string[];
  conceitosSelecionados?: string[];
  metaQuestoesDia: number;
  streakDias: number;
  focoConcurso: string;
  pedagogicalPreference?: string;
  fotoUrl?: string | null;
  isGuest: boolean;
  emailVerificado: boolean;
  // Dados fiscais, endereço e faturamento (NFS-e)
  cpf?: string;
  celular?: string;
  cep?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  dataNascimento?: string;
  optInNotificacoes?: boolean;
}

export const DEFAULT_GUEST_PROFILE: UserProfile = {
  nome: "Visitante",
  email: "",
  escolaridade: "",
  faculdade: "",
  semestre: "",
  concursosSelecionados: [],
  motivacoesSelecionadas: [],
  conceitosSelecionados: [],
  metaQuestoesDia: 0,
  streakDias: 0,
  focoConcurso: "Matemática Geral",
  pedagogicalPreference: "conceitual",
  fotoUrl: null,
  isGuest: true,
  emailVerificado: false,
  cpf: "",
  celular: "",
  cep: "",
  logradouro: "",
  numero: "",
  complemento: "",
  bairro: "",
  cidade: "",
  estado: "RJ",
  dataNascimento: "",
  optInNotificacoes: true,
};

export function getInitials(name?: string): string {
  if (!name || !name.trim()) return "AL";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Calcula o streak de dias consecutivos com base no histórico de tentativas.
 */
export function calcularStreakDias(tentativas: { data_hora?: string | null }[]): number {
  if (!tentativas || tentativas.length === 0) return 0;

  const datasSet = new Set<string>();
  for (const t of tentativas) {
    if (!t.data_hora) continue;
    const d = new Date(t.data_hora);
    const ano = d.getFullYear();
    const mes = String(d.getMonth() + 1).padStart(2, "0");
    const dia = String(d.getDate()).padStart(2, "0");
    datasSet.add(`${ano}-${mes}-${dia}`);
  }

  if (datasSet.size === 0) return 0;

  const agora = new Date();
  const formatYMD = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  const hojeStr = formatYMD(agora);
  const ontem = new Date(agora);
  ontem.setDate(ontem.getDate() - 1);
  const ontemStr = formatYMD(ontem);

  // Se não estudou hoje nem ontem, o streak quebrou
  if (!datasSet.has(hojeStr) && !datasSet.has(ontemStr)) {
    return 0;
  }

  let cursor = datasSet.has(hojeStr) ? new Date(agora) : new Date(ontem);
  let streak = 0;

  while (true) {
    const cursorStr = formatYMD(cursor);
    if (datasSet.has(cursorStr)) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break;
    }
  }

  return streak;
}

const STORAGE_KEY = "lemmas_user_profile";
export const CUSTOM_AVATAR_KEY = "lemmas_custom_avatar";

/**
 * Heurística resiliente para inferir motivações ativas caso o array `motivacoes_selecionadas`
 * tenha vindo vazio do banco ou legado do onboarding.
 */
export function inferirMotivacoes(
  concursosFoco: string | null | undefined,
  currentMotivacoes: string[] | undefined,
  motivosObj?: any
): string[] {
  if (Array.isArray(currentMotivacoes) && currentMotivacoes.length > 0) {
    return currentMotivacoes;
  }

  // Se vier no padrão do onboarding legado
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

function getCachedProfile(): UserProfile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        return parsed;
      }
    }
  } catch {
    // Falha silenciosa de JSON
  }
  return null;
}

export interface UserContextType {
  profile: UserProfile;
  isAuthenticated: boolean;
  loading: boolean;
  initials: string;
  saveProfile: (updated: Partial<UserProfile>) => Promise<void>;
  logout: () => Promise<void>;
  refresh: (providedUser?: any) => Promise<UserProfile | null>;
  reenviarEmailVerificacao: () => Promise<{ success: boolean; error?: string }>;
  validarCodigoVerificacao: (codigo: string) => Promise<{ success: boolean; error?: string }>;
}

const UserContext = createContext<UserContextType | null>(null);

export function isUserEmailVerified(user: any): boolean {
  if (!user) return false;
  if (user.email_confirmed_at || user.confirmed_at) return true;
  const isGoogleOrOAuth = Boolean(
    user.app_metadata?.provider === "google" ||
    (Array.isArray(user.app_metadata?.providers) && user.app_metadata.providers.includes("google")) ||
    user.user_metadata?.email_verified === true ||
    (Array.isArray(user.identities) && user.identities.some((id: any) => id.provider === "google" || id.identity_data?.email_verified === true))
  );
  return isGoogleOrOAuth;
}

export function UserProvider({ children }: { children: React.ReactNode }) {
  const supabase = useMemo(() => createClient(), []);

  // Start with guest profile and loading state true
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_GUEST_PROFILE);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchProfile = useCallback(async (providedUser?: any): Promise<UserProfile | null> => {
    try {
      let user = providedUser;
      if (!user) {
        const { data } = await supabase.auth.getUser();
        user = data?.user;
      }

      if (user && user.email) {
        const rawGoogleAvatar = user.user_metadata?.avatar_url || user.user_metadata?.picture || null;
        // Descarta data: base64 do metadata para impedir que cookies inflem
        const googleAvatar = typeof rawGoogleAvatar === "string" && !rawGoogleAvatar.startsWith("data:") ? rawGoogleAvatar : null;

        if (user.user_metadata?.avatar_url && typeof user.user_metadata.avatar_url === "string" && user.user_metadata.avatar_url.startsWith("data:")) {
          try {
            await supabase.auth.updateUser({ data: { avatar_url: null } });
          } catch {}
        }

        const cached = getCachedProfile();
        let cachedCustomAvatar: string | null = null;
        if (typeof window !== "undefined") {
          try {
            cachedCustomAvatar = localStorage.getItem(CUSTOM_AVATAR_KEY);
          } catch {}
        }

        // Prioridade estrita do avatar:
        // Foto customizada persistida (base64 ou URL) NUNCA é descartada pelo Google Avatar
        const initialAvatar =
          cachedCustomAvatar ||
          (cached?.fotoUrl && cached.fotoUrl !== googleAvatar ? cached.fotoUrl : null) ||
          googleAvatar ||
          null;

        const emailConfirmadoNoAuth = isUserEmailVerified(user);

        let loadedProfile: UserProfile = {
          ...DEFAULT_GUEST_PROFILE,
          ...(cached || {}),
          id: user.id,
          nome: user.user_metadata?.full_name || user.user_metadata?.name || cached?.nome || user.email.split("@")[0] || "Aluno LEMMAS",
          email: user.email,
          fotoUrl: initialAvatar,
          isGuest: false,
          emailVerificado: emailConfirmadoNoAuth,
        };

        try {
          const { data: dbUser } = await supabase
            .from("usuarios")
            .select("id, nome, email, escolaridade, faculdade, curso, concursos_foco, motivos, verificado, cpf, celular, cep, logradouro, numero, bairro, cidade, estado")
            .eq("email", user.email)
            .maybeSingle();

          let targetId = dbUser?.id;
          const estaVerificado = emailConfirmadoNoAuth || Boolean(dbUser?.verificado === 1);
          loadedProfile.emailVerificado = estaVerificado;

          // Se o email está confirmado no Auth/Google mas a tabela usuarios ainda tem verificado=0, sincroniza
          if (estaVerificado && dbUser && dbUser.verificado !== 1) {
            try {
              await supabase
                .from("usuarios")
                .update({ verificado: 1 })
                .eq("email", user.email);
            } catch (syncErr) {
              console.warn("Aviso ao sincronizar verificado=1 no Postgres:", syncErr);
            }
          }

          if (dbUser) {
            let fotoDoBanco: string | null | undefined = undefined;
            let concursosSalvos: string[] = [];
            let motivacoesSalvas: string[] = [];
            let conceitosSalvos: string[] = [];
            let pedPrefSalva: string | undefined = undefined;
            let parsedFaturamento: Record<string, any> = {};

            if (dbUser.motivos) {
              try {
                const parsed = typeof dbUser.motivos === "string" ? JSON.parse(dbUser.motivos) : dbUser.motivos;
                if (parsed && typeof parsed === "object") {
                  if (parsed.foto_url !== undefined) {
                    fotoDoBanco = parsed.foto_url;
                    if (typeof window !== "undefined") {
                      if (parsed.foto_url) {
                        localStorage.setItem(CUSTOM_AVATAR_KEY, parsed.foto_url);
                      } else if (parsed.foto_url === null) {
                        localStorage.removeItem(CUSTOM_AVATAR_KEY);
                      }
                    }
                  }
                  if (Array.isArray(parsed.concursos_selecionados)) concursosSalvos = parsed.concursos_selecionados;
                  if (Array.isArray(parsed.motivacoes_selecionadas)) motivacoesSalvas = parsed.motivacoes_selecionadas;
                  if (Array.isArray(parsed.conceitos_selecionados)) conceitosSalvos = parsed.conceitos_selecionados;
                  if (parsed.pedagogical_preference) pedPrefSalva = parsed.pedagogical_preference;
                  if (parsed.faturamento && typeof parsed.faturamento === "object") {
                    parsedFaturamento = parsed.faturamento;
                  }
                }
              } catch (parseErr) {
                console.warn("Aviso no parse de motivos do usuário:", parseErr);
              }
            }

            // Resolução robusta de objetivos ativos:
            // Se `motivacoesSalvas` estiver vazio (ex: usuário veio de onboarding),
            // recupera via heurística a partir de `concursos_foco`.
            const motivacoesRecuperadas = inferirMotivacoes(
              dbUser.concursos_foco,
              motivacoesSalvas,
              dbUser.motivos
            );

            // Resolução do avatar: banco explícito > cache local customizado > Google Avatar
            let resolvedFoto: string | null = null;
            if (fotoDoBanco !== undefined) {
              resolvedFoto = fotoDoBanco;
            } else if (cachedCustomAvatar) {
              resolvedFoto = cachedCustomAvatar;
            } else if (googleAvatar) {
              resolvedFoto = googleAvatar;
            }

            loadedProfile = {
              ...loadedProfile,
              id: dbUser.id,
              nome: dbUser.nome || loadedProfile.nome,
              escolaridade: dbUser.escolaridade || loadedProfile.escolaridade,
              faculdade: dbUser.faculdade || loadedProfile.faculdade,
              focoConcurso: dbUser.concursos_foco || loadedProfile.focoConcurso,
              fotoUrl: resolvedFoto,
              concursosSelecionados: concursosSalvos.length > 0 ? concursosSalvos : (loadedProfile.concursosSelecionados || []),
              motivacoesSelecionadas: motivacoesRecuperadas.length > 0 ? motivacoesRecuperadas : (loadedProfile.motivacoesSelecionadas || []),
              conceitosSelecionados: conceitosSalvos.length > 0 ? conceitosSalvos : (loadedProfile.conceitosSelecionados || []),
              pedagogicalPreference: pedPrefSalva || loadedProfile.pedagogicalPreference || "conceitual",
              emailVerificado: estaVerificado,
              cpf: dbUser.cpf || loadedProfile.cpf || "",
              celular: dbUser.celular || loadedProfile.celular || "",
              cep: dbUser.cep || loadedProfile.cep || "",
              logradouro: dbUser.logradouro || loadedProfile.logradouro || "",
              numero: dbUser.numero || loadedProfile.numero || "",
              bairro: dbUser.bairro || loadedProfile.bairro || "",
              cidade: dbUser.cidade || loadedProfile.cidade || "",
              estado: dbUser.estado || loadedProfile.estado || "RJ",
              complemento: parsedFaturamento.complemento || loadedProfile.complemento || "",
              dataNascimento: parsedFaturamento.data_nascimento || loadedProfile.dataNascimento || "",
              optInNotificacoes: parsedFaturamento.opt_in_notificacoes ?? loadedProfile.optInNotificacoes ?? true,
            };
          } else if (user.email) {
            const { data: novoDbUser } = await supabase
              .from("usuarios")
              .insert({
                nome: loadedProfile.nome,
                email: user.email,
                senha_hash: "supabase_managed",
                escolaridade: "Ensino Superior",
                verificado: estaVerificado ? 1 : 0,
              })
              .select("id, nome, email, escolaridade, faculdade, curso, concursos_foco, verificado")
              .maybeSingle();

            if (novoDbUser) {
              targetId = novoDbUser.id;
              loadedProfile = {
                ...loadedProfile,
                id: novoDbUser.id,
                nome: novoDbUser.nome || loadedProfile.nome,
                escolaridade: novoDbUser.escolaridade || loadedProfile.escolaridade,
                faculdade: novoDbUser.faculdade || loadedProfile.faculdade,
                focoConcurso: novoDbUser.concursos_foco || loadedProfile.focoConcurso,
                emailVerificado: estaVerificado,
              };
            }
          }

          // Calcula streak factual consultando as datas das tentativas
          if (targetId) {
            const { data: tentativasDatas } = await supabase
              .from("tentativas")
              .select("data_hora")
              .eq("aluno_id", targetId)
              .order("data_hora", { ascending: false })
              .limit(100);

            if (tentativasDatas && tentativasDatas.length > 0) {
              loadedProfile.streakDias = calcularStreakDias(tentativasDatas);
            }
          }
        } catch (dbErr) {
          console.warn("Aviso na sincronização do perfil com Postgres:", dbErr);
        }

        setProfile(loadedProfile);
        if (typeof window !== "undefined") {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(loadedProfile));
        }
        setLoading(false);
        return loadedProfile;
      }

      // Sessão sem usuário autenticado (modo local/visitante)
      const cached = getCachedProfile();
      if (cached) {
        setProfile(cached);
      } else {
        setProfile(DEFAULT_GUEST_PROFILE);
      }
    } catch {
      const cached = getCachedProfile();
      if (cached) {
        setProfile(cached);
      } else {
        setProfile(DEFAULT_GUEST_PROFILE);
      }
    } finally {
      setLoading(false);
    }
    return null;
  }, [supabase]);

  useEffect(() => {
    // Carrega cache imediatamente para UX instantânea sem piscar tela
    const cached = getCachedProfile();
    if (cached) {
      setProfile(cached);
      setLoading(false);
    }
    // SEMPRE dispara revalidação em segundo plano (SWR) para garantir sincronização com Supabase Auth e Postgres
    fetchProfile();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" || event === "USER_UPDATED" || event === "TOKEN_REFRESHED") {
        setTimeout(() => {
          fetchProfile(session?.user);
        }, 0);
      } else if (event === "SIGNED_OUT") {
        if (typeof window !== "undefined") {
          localStorage.removeItem(STORAGE_KEY);
        }
        setProfile(DEFAULT_GUEST_PROFILE);
      }
    });

    const handleStorageEvent = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (parsed && typeof parsed === "object") {
            setProfile(parsed);
          }
        } catch {}
      }
    };

    if (typeof window !== "undefined") {
      window.addEventListener("storage", handleStorageEvent);
    }

    return () => {
      subscription.unsubscribe();
      if (typeof window !== "undefined") {
        window.removeEventListener("storage", handleStorageEvent);
      }
    };
  }, [fetchProfile, supabase]);

  const saveProfile = async (updated: Partial<UserProfile>) => {
    const next = { ...profile, ...updated };
    setProfile(next);

    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));

      if (updated.fotoUrl !== undefined) {
        if (updated.fotoUrl) {
          localStorage.setItem(CUSTOM_AVATAR_KEY, updated.fotoUrl);
        } else {
          localStorage.removeItem(CUSTOM_AVATAR_KEY);
        }
      }
    }

    if (!next.isGuest && next.email) {
      // 1. Tenta salvar via rota de API dedicada (SSR Server Supabase com cookies autenticados)
      try {
        const res = await fetch("/api/user/profile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nome: next.nome,
            escolaridade: next.escolaridade,
            faculdade: next.faculdade,
            focoConcurso: next.focoConcurso,
            fotoUrl: next.fotoUrl,
            concursosSelecionados: next.concursosSelecionados,
            motivacoesSelecionadas: next.motivacoesSelecionadas,
            conceitosSelecionados: next.conceitosSelecionados,
            pedagogicalPreference: next.pedagogicalPreference,
            cpf: next.cpf,
            celular: next.celular,
            cep: next.cep,
            logradouro: next.logradouro,
            numero: next.numero,
            complemento: next.complemento,
            bairro: next.bairro,
            cidade: next.cidade,
            estado: next.estado,
            dataNascimento: next.dataNascimento,
            optInNotificacoes: next.optInNotificacoes,
          }),
        });

        if (res.ok) {
          return;
        }
      } catch (apiErr) {
        console.warn("Aviso na chamada da API /api/user/profile, usando fallback direto no Supabase Client:", apiErr);
      }

      // 2. Fallback direto no Supabase Client
      try {
        let parsed: Record<string, any> = {};
        try {
          const { data: dbUser } = await supabase
            .from("usuarios")
            .select("motivos")
            .eq("email", next.email)
            .maybeSingle();

          if (dbUser?.motivos) {
            parsed = typeof dbUser.motivos === "string" ? JSON.parse(dbUser.motivos) : dbUser.motivos;
          }
        } catch {}

        if (next.fotoUrl !== undefined) {
          parsed.foto_url = next.fotoUrl;
        }
        if (next.concursosSelecionados !== undefined) {
          parsed.concursos_selecionados = next.concursosSelecionados;
        }
        if (next.motivacoesSelecionadas !== undefined) {
          parsed.motivacoes_selecionadas = next.motivacoesSelecionadas;
        }
        if (next.pedagogicalPreference !== undefined) {
          parsed.pedagogical_preference = next.pedagogicalPreference;
        }
        if (next.conceitosSelecionados !== undefined) {
          parsed.conceitos_selecionados = next.conceitosSelecionados;
        }
        if (
          next.complemento !== undefined ||
          next.dataNascimento !== undefined ||
          next.optInNotificacoes !== undefined
        ) {
          parsed.faturamento = {
            ...(parsed.faturamento || {}),
            ...(next.complemento !== undefined ? { complemento: next.complemento } : {}),
            ...(next.dataNascimento !== undefined ? { data_nascimento: next.dataNascimento } : {}),
            ...(next.optInNotificacoes !== undefined ? { opt_in_notificacoes: next.optInNotificacoes } : {}),
          };
        }

        const updatePayload: Record<string, any> = {
          nome: next.nome,
          escolaridade: next.escolaridade,
          faculdade: next.faculdade,
          concursos_foco: next.focoConcurso,
          motivos: JSON.stringify(parsed),
        };

        if (next.cpf) updatePayload.cpf = next.cpf;
        if (next.celular) updatePayload.celular = next.celular;
        if (next.cep) updatePayload.cep = next.cep;
        if (next.logradouro) updatePayload.logradouro = next.logradouro;
        if (next.numero) updatePayload.numero = next.numero;
        if (next.bairro) updatePayload.bairro = next.bairro;
        if (next.cidade) updatePayload.cidade = next.cidade;
        if (next.estado) updatePayload.estado = next.estado;

        const { error: upsertErr } = await supabase
          .from("usuarios")
          .upsert({
            email: next.email,
            ...updatePayload,
            senha_hash: "supabase_managed",
          }, { onConflict: "email" });

        if (upsertErr) {
          console.warn("Aviso no upsert de perfil no Supabase, tentando update:", upsertErr);
          await supabase
            .from("usuarios")
            .update(updatePayload)
            .eq("email", next.email);
        }

        // NUNCA grave data: URLs (base64) no Supabase Auth user_metadata para não inflar o JWT/cookies além do limite de 32KB do Vercel
        if (next.fotoUrl && typeof next.fotoUrl === "string" && !next.fotoUrl.startsWith("data:")) {
          await supabase.auth.updateUser({
            data: { avatar_url: next.fotoUrl },
          });
        } else if (next.fotoUrl === null) {
          await supabase.auth.updateUser({
            data: { avatar_url: null },
          });
        }
      } catch (err) {
        console.error("Erro ao sincronizar perfil no Supabase:", err);
      }
    }
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.warn("Erro ao fazer logout:", e);
    }
    if (typeof window !== "undefined") {
      localStorage.removeItem(STORAGE_KEY);
    }
    setProfile(DEFAULT_GUEST_PROFILE);
  };

  const reenviarEmailVerificacao = async (): Promise<{ success: boolean; error?: string }> => {
    if (!profile.email) {
      return { success: false, error: "Nenhum e-mail vinculado à sessão atual." };
    }
    try {
      const redirectUri = typeof window !== "undefined"
        ? `${window.location.origin}/auth/callback?next=/questoes`
        : "/auth/callback?next=/questoes";

      const { error } = await supabase.auth.resend({
        type: "signup",
        email: profile.email.trim(),
        options: {
          emailRedirectTo: redirectUri,
        },
      });

      if (error) {
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || "Erro ao reenviar e-mail de confirmação." };
    }
  };

  const validarCodigoVerificacao = async (codigo: string): Promise<{ success: boolean; error?: string }> => {
    const tokenLimpo = codigo.trim();
    if (!tokenLimpo || tokenLimpo.length < 6) {
      return { success: false, error: "Digite o código de 6 dígitos recebido no seu e-mail." };
    }
    if (!profile.email) {
      return { success: false, error: "Nenhum e-mail vinculado para validação." };
    }

    try {
      let res = await supabase.auth.verifyOtp({
        email: profile.email.trim(),
        token: tokenLimpo,
        type: "signup",
      });

      if (res.error) {
        res = await supabase.auth.verifyOtp({
          email: profile.email.trim(),
          token: tokenLimpo,
          type: "email",
        });
      }

      if (res.error) {
        return { success: false, error: res.error.message };
      }

      // Sincroniza verificado = 1 no Postgres
      try {
        await supabase
          .from("usuarios")
          .update({ verificado: 1 })
          .eq("email", profile.email.trim());
      } catch (dbErr) {
        console.warn("Aviso ao atualizar verificado=1 pós-OTP:", dbErr);
      }

      await fetchProfile(res.data?.user);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || "Código inválido ou expirado." };
    }
  };

  const value = {
    profile,
    isAuthenticated: !profile.isGuest && Boolean(profile.email),
    loading,
    initials: getInitials(profile.nome),
    saveProfile,
    logout,
    refresh: fetchProfile,
    reenviarEmailVerificacao,
    validarCodigoVerificacao,
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUserProfile() {
  const context = useContext(UserContext);
  if (!context) {
    return {
      profile: DEFAULT_GUEST_PROFILE,
      isAuthenticated: false,
      loading: false,
      initials: "AL",
      saveProfile: async () => {},
      logout: async () => {},
      refresh: async () => {},
      reenviarEmailVerificacao: async () => ({ success: false, error: "Contexto indisponível." }),
      validarCodigoVerificacao: async () => ({ success: false, error: "Contexto indisponível." }),
    };
  }
  return context;
}
