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
  focoConcurso: "",
  isGuest: true,
};

export function getInitials(name?: string): string {
  if (!name || !name.trim()) return "";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
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
        let loadedProfile: UserProfile = {
          ...DEFAULT_GUEST_PROFILE,
          id: user.id,
          nome: user.user_metadata?.full_name || user.email.split("@")[0] || "Aluno LEMMAS",
          email: user.email,
          isGuest: false,
        };

        try {
          const { data: dbUser } = await supabase
            .from("usuarios")
            .select("id, nome, email, escolaridade, faculdade, curso, concursos_foco")
            .eq("email", user.email)
            .maybeSingle();

          if (dbUser) {
            loadedProfile = {
              ...loadedProfile,
              id: dbUser.id,
              nome: dbUser.nome || loadedProfile.nome,
              escolaridade: dbUser.escolaridade || loadedProfile.escolaridade,
              faculdade: dbUser.faculdade || loadedProfile.faculdade,
              focoConcurso: dbUser.concursos_foco || loadedProfile.focoConcurso,
            };
          }
        } catch {
          // Mantém loadedProfile de user_metadata
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
        await supabase
          .from("usuarios")
          .update({
            nome: next.nome,
            escolaridade: next.escolaridade,
            faculdade: next.faculdade,
            concursos_foco: next.focoConcurso,
          })
          .eq("email", next.email);
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
      initials: "",
      saveProfile: async () => {},
      logout: async () => {},
      refresh: async () => {},
    };
  }
  return context;
}
