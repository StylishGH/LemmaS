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
  metaQuestoesDia: number;
  streakDias: number;
  focoConcurso: string;
  fotoUrl?: string | null;
  isGuest: boolean;
}

export const DEFAULT_GUEST_PROFILE: UserProfile = {
  nome: "Visitante",
  email: "",
  escolaridade: "",
  faculdade: "",
  semestre: "",
  concursosSelecionados: [],
  motivacoesSelecionadas: [],
  metaQuestoesDia: 0,
  streakDias: 0,
  focoConcurso: "Matemática Geral",
  fotoUrl: null,
  isGuest: true,
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
const PROFILE_EVENT = "lemmas_profile_updated";

function getCachedProfile(): UserProfile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object" && parsed.email && !parsed.isGuest) {
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
  refresh: (providedUser?: any) => Promise<void>;
}

const UserContext = createContext<UserContextType | null>(null);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const supabase = useMemo(() => createClient(), []);

  // Hidratação síncrona do cache do localStorage: zero delay e zero flicker de visitante
  const [profile, setProfile] = useState<UserProfile>(() => {
    const cached = getCachedProfile();
    return cached || DEFAULT_GUEST_PROFILE;
  });

  const [loading, setLoading] = useState<boolean>(() => {
    const cached = getCachedProfile();
    return cached ? false : true;
  });

  const fetchProfile = useCallback(async (providedUser?: any) => {
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

        let loadedProfile: UserProfile = {
          ...DEFAULT_GUEST_PROFILE,
          id: user.id,
          nome: user.user_metadata?.full_name || user.email.split("@")[0] || "Aluno LEMMAS",
          email: user.email,
          fotoUrl: googleAvatar,
          isGuest: false,
        };

        try {
          const { data: dbUser } = await supabase
            .from("usuarios")
            .select("id, nome, email, escolaridade, faculdade, curso, concursos_foco, motivos")
            .eq("email", user.email)
            .maybeSingle();

          let targetId = dbUser?.id;

          if (dbUser) {
            let fotoDoBanco: string | null = null;
            let concursosSalvos: string[] = [];
            let motivacoesSalvas: string[] = [];

            if (dbUser.motivos) {
              try {
                const parsed = JSON.parse(dbUser.motivos);
                if (parsed?.foto_url) fotoDoBanco = parsed.foto_url;
                if (Array.isArray(parsed?.concursos_selecionados)) concursosSalvos = parsed.concursos_selecionados;
                if (Array.isArray(parsed?.motivacoes_selecionadas)) motivacoesSalvas = parsed.motivacoes_selecionadas;
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
              concursosSelecionados: concursosSalvos.length > 0 ? concursosSalvos : loadedProfile.concursosSelecionados,
              motivacoesSelecionadas: motivacoesSalvas.length > 0 ? motivacoesSalvas : loadedProfile.motivacoesSelecionadas,
            };
          } else if (user.email) {
            const { data: novoDbUser } = await supabase
              .from("usuarios")
              .insert({
                nome: loadedProfile.nome,
                email: user.email,
                senha_hash: "supabase_managed",
                escolaridade: "Ensino Superior",
              })
              .select("id, nome, email, escolaridade, faculdade, curso, concursos_foco")
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
        return;
      }

      // Sessão deslogada
      if (typeof window !== "undefined") {
        localStorage.removeItem(STORAGE_KEY);
      }
      setProfile(DEFAULT_GUEST_PROFILE);
    } catch {
      const cached = getCachedProfile();
      if (!cached) {
        setProfile(DEFAULT_GUEST_PROFILE);
      }
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
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

    const handleCustomEvent = () => {
      fetchProfile();
    };

    if (typeof window !== "undefined") {
      window.addEventListener(PROFILE_EVENT, handleCustomEvent);
      window.addEventListener("storage", handleCustomEvent);
    }

    return () => {
      subscription.unsubscribe();
      if (typeof window !== "undefined") {
        window.removeEventListener(PROFILE_EVENT, handleCustomEvent);
        window.removeEventListener("storage", handleCustomEvent);
      }
    };
  }, [fetchProfile, supabase]);

  const saveProfile = async (updated: Partial<UserProfile>) => {
    const next = { ...profile, ...updated };
    setProfile(next);

    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      window.dispatchEvent(new Event(PROFILE_EVENT));
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

        const updatePayload: Record<string, any> = {
          nome: next.nome,
          escolaridade: next.escolaridade,
          faculdade: next.faculdade,
          concursos_foco: next.focoConcurso,
          motivos: JSON.stringify(parsed),
        };

        await supabase
          .from("usuarios")
          .update(updatePayload)
          .eq("email", next.email);

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
      window.dispatchEvent(new Event(PROFILE_EVENT));
    }
    setProfile(DEFAULT_GUEST_PROFILE);
  };

  const value = {
    profile,
    isAuthenticated: !profile.isGuest && Boolean(profile.email),
    loading,
    initials: getInitials(profile.nome),
    saveProfile,
    logout,
    refresh: fetchProfile,
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
    };
  }
  return context;
}
