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
        const emailConfirmadoNoAuth = isUserEmailVerified(user);

        let loadedProfile: UserProfile = {
          ...DEFAULT_GUEST_PROFILE,
          ...(cached || {}),
          id: user.id,
          nome: user.user_metadata?.full_name || user.user_metadata?.name || cached?.nome || user.email.split("@")[0] || "Aluno LEMMAS",
          email: user.email,
          fotoUrl: googleAvatar || cached?.fotoUrl || null,
          isGuest: false,
          emailVerificado: emailConfirmadoNoAuth,
        };

        try {
          const { data: dbUser } = await supabase
            .from("usuarios")
            .select("id, nome, email, escolaridade, faculdade, curso, concursos_foco, motivos, verificado")
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
            let fotoDoBanco: string | null = null;
            let concursosSalvos: string[] = [];
            let motivacoesSalvas: string[] = [];
            let conceitosSalvos: string[] = [];
            let pedPrefSalva: string | undefined = undefined;

            if (dbUser.motivos) {
              try {
                const parsed = JSON.parse(dbUser.motivos);
                if (parsed?.foto_url) fotoDoBanco = parsed.foto_url;
                if (Array.isArray(parsed?.concursos_selecionados)) concursosSalvos = parsed.concursos_selecionados;
                if (Array.isArray(parsed?.motivacoes_selecionadas)) motivacoesSalvas = parsed.motivacoes_selecionadas;
                if (Array.isArray(parsed?.conceitos_selecionados)) conceitosSalvos = parsed.conceitos_selecionados;
                if (parsed?.pedagogical_preference) pedPrefSalva = parsed.pedagogical_preference;
              } catch {}
            }

            loadedProfile = {
              ...loadedProfile,
              id: dbUser.id,
              nome: dbUser.nome || loadedProfile.nome,
              escolaridade: dbUser.escolaridade || loadedProfile.escolaridade,
              faculdade: dbUser.faculdade || loadedProfile.faculdade,
              focoConcurso: dbUser.concursos_foco || loadedProfile.focoConcurso,
              fotoUrl: fotoDoBanco || googleAvatar || loadedProfile.fotoUrl,
              concursosSelecionados: concursosSalvos.length > 0 ? concursosSalvos : (loadedProfile.concursosSelecionados || []),
              motivacoesSelecionadas: motivacoesSalvas.length > 0 ? motivacoesSalvas : (loadedProfile.motivacoesSelecionadas || []),
              conceitosSelecionados: conceitosSalvos.length > 0 ? conceitosSalvos : (loadedProfile.conceitosSelecionados || []),
              pedagogicalPreference: pedPrefSalva || loadedProfile.pedagogicalPreference || "conceitual",
              emailVerificado: estaVerificado,
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
    }

    if (!next.isGuest && next.email) {
      try {
        let parsed: Record<string, any> = {};
        try {
          const { data: dbUser } = await supabase
            .from("usuarios")
            .select("motivos")
            .eq("email", next.email)
            .maybeSingle();

          if (dbUser?.motivos) {
            try {
              parsed = JSON.parse(dbUser.motivos);
            } catch {}
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

        const updatePayload: Record<string, any> = {
          nome: next.nome,
          escolaridade: next.escolaridade,
          faculdade: next.faculdade,
          concursos_foco: next.focoConcurso,
          motivos: JSON.stringify(parsed),
        };

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
