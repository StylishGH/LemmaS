"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Flame, Search, ExternalLink, Target } from "lucide-react";
import { useUserProfile } from "@/lib/use-user";

const routeNames: Record<string, string> = {
  "/": "Painel & Metacognição",
  "/dashboard": "Painel & Metacognição",
  "/questoes": "Banco de Questões & Lemas",
  "/resolver": "Resolver & Simulado",
  "/opinioes": "Segunda Opinião",
  "/perfil": "Meu Perfil",
  "/sobre": "Sobre o LEMMAS",
};

export default function AppHeader() {
  const pathname = usePathname();
  const { profile, initials } = useUserProfile();
  const currentTitle = routeNames[pathname] || "Workspace";

  return (
    <header className="h-16 border-b border-[var(--border-subtle)] bg-[var(--bg-card)] sticky top-0 z-30 px-6 md:px-10 flex items-center justify-between transition-colors">
      <div className="flex items-center gap-4">
        {/* BREADCRUMB DINÂMICO EDITORIAL */}
        <div className="flex items-center gap-2 text-xs font-medium text-[var(--ink-muted)]">
          <Link href="/" className="font-serif-math text-[var(--marker-blue)] dark:text-[var(--marker-amber)] hover:underline font-bold tracking-wide transition-colors">
            LEMMAS
          </Link>
          <span className="text-[var(--ink-muted)]">/</span>
          <span className="text-[var(--ink-primary)] font-semibold">{currentTitle}</span>
        </div>

        {/* BARRA DE BUSCA RÁPIDA ESTILO ACADÊMICO */}
        <div className="hidden sm:flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-xs text-[var(--ink-muted)] w-64 hover:border-[var(--border-default)] transition-colors">
          <Search className="w-3.5 h-3.5 text-[var(--marker-blue)] dark:text-[var(--marker-amber)] opacity-75" />
          <Link href="/questoes" className="flex-1 text-[var(--ink-muted)] hover:text-[var(--ink-primary)]">
            Buscar teoremas, questões...
          </Link>
          <kbd className="ml-auto text-[10px] bg-[var(--bg-subtle)] px-1.5 py-0.5 rounded text-[var(--ink-secondary)] font-mono">
            ⌘K
          </kbd>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* LINK PARA A LANDING PAGE */}
        <Link
          href="/landing"
          target="_blank"
          className="hidden lg:flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] hover:bg-[var(--bg-elevated)] transition-colors"
          title="Sobre o LEMMAS · Manifesto e Roadmap"
        >
          <span>Sobre o LEMMAS</span>
          <ExternalLink className="w-3 h-3 opacity-70" />
        </Link>

        {/* STREAK DIÁRIO */}
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--marker-amber-dim)] border border-[var(--marker-amber-border)] text-xs font-bold text-[var(--marker-amber)]" title={`Streak de Estudo Diário: ${profile.streakDias} ${profile.streakDias === 1 ? "dia" : "dias"}`}>
          <Flame className={`w-3.5 h-3.5 ${profile.streakDias > 0 ? "text-[var(--marker-amber)]" : "opacity-50 text-[var(--marker-amber)]"}`} />
          <span className="font-mono tabular-nums">{profile.streakDias} {profile.streakDias === 1 ? "dia" : "dias"}</span>
        </div>

        {/* FOCO CONCURSO */}
        <div className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--marker-amber-dim)] border border-[var(--marker-amber-border)] text-xs font-semibold text-[var(--marker-amber)] max-w-[220px] truncate shrink-0">
          <Target className="w-3.5 h-3.5 text-[var(--marker-amber)] shrink-0" />
          <span className="truncate">Foco: {profile.focoConcurso || "Matemática Geral"}</span>
        </div>

        {/* PERFIL AVATAR */}
        <Link
          href="/perfil"
          className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-500 to-amber-700 text-white font-bold text-xs flex items-center justify-center shadow-sm hover:scale-105 border border-amber-400/40 transition-transform overflow-hidden"
          title={profile.isGuest ? "Perfil de Visitante (Local)" : `Meu Perfil (${profile.nome})`}
        >
          {profile.fotoUrl ? (
            <img src={profile.fotoUrl} alt={profile.nome} className="w-full h-full object-cover" />
          ) : (
            initials
          )}
        </Link>
      </div>
    </header>
  );
}
