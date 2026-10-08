"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";

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
  nome: "Estudante Convidado",
  email: "",
  escolaridade: "Ensino Superior (Graduação em Matemática)",
  faculdade: "UFF - Universidade Federal Fluminense",
  semestre: "1º Semestre",
  concursosSelecionados: [
    "ESA (Sargentos do Exército)",
    "EsPCEx / AMAN (Oficiais do Exército)"
  ],
  motivacoesSelecionadas: ["concurso_militar", "data_science"],
  metaQuestoesDia: 15,
  streakDias: 1,
  focoConcurso: "ESA / EsPCEx",
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

const STORAGE_KEY = "lemmas_user_profile";
const PROFILE_EVENT = "lemmas_profile_updated";

export function useUserProfile() {
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_GUEST_PROFILE);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async () => {
    try {
      // 1. Tenta checar sessão no Supabase Auth
      const { data: { user } } = await supabase.auth.getUser();

      if (user && user.email) {
        // Usuário autenticado
        let loadedProfile: UserProfile = {
          ...DEFAULT_GUEST_PROFILE,
          id: user.id,
          nome: user.user_metadata?.full_name || user.email.split("@")[0] || "Aluno LEMMAS",
          email: user.email,
          isGuest: false,
        };

        // Tenta buscar metadados na tabela usuarios
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
          // Fallback silencioso para user_metadata
        }

        setProfile(loadedProfile);
        setLoading(false);
        return;
      }

      // 2. Se não autenticado, carrega do localStorage (perfil de visitante local)
      if (typeof window !== "undefined") {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            setProfile({ ...DEFAULT_GUEST_PROFILE, ...parsed, isGuest: true });
            setLoading(false);
            return;
          } catch {
            // Se JSON inválido, segue com default
          }
        }
      }

      setProfile(DEFAULT_GUEST_PROFILE);
    } catch {
      setProfile(DEFAULT_GUEST_PROFILE);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();

    const handleCustomEvent = () => {
      fetchProfile();
    };

    if (typeof window !== "undefined") {
      window.addEventListener(PROFILE_EVENT, handleCustomEvent);
      window.addEventListener("storage", handleCustomEvent);
    }

    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener(PROFILE_EVENT, handleCustomEvent);
        window.removeEventListener("storage", handleCustomEvent);
      }
    };
  }, [fetchProfile]);

  const saveProfile = async (updated: Partial<UserProfile>) => {
    const next = { ...profile, ...updated };
    setProfile(next);

    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      window.dispatchEvent(new Event(PROFILE_EVENT));
    }

    // Se estiver autenticado, tenta salvar no Supabase também
    if (!profile.isGuest && profile.email) {
      try {
        await supabase
          .from("usuarios")
          .update({
            nome: next.nome,
            escolaridade: next.escolaridade,
            faculdade: next.faculdade,
            concursos_foco: next.focoConcurso,
          })
          .eq("email", profile.email);
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

  return {
    profile,
    loading,
    initials: getInitials(profile.nome),
    saveProfile,
    logout,
    refresh: fetchProfile,
  };
}
