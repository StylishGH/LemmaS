"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Flame, Search, ExternalLink } from "lucide-react";

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
  const currentTitle = routeNames[pathname] || "Workspace";

  return (
    <header className="h-16 border-b border-slate-200/80 dark:border-amber-500/15 bg-white/85 dark:bg-[#0e0d16]/85 backdrop-blur-md sticky top-0 z-30 px-6 md:px-10 flex items-center justify-between transition-colors">
      <div className="flex items-center gap-4">
        {/* BREADCRUMB DINÂMICO EDITORIAL */}
        <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-zinc-400">
          <Link href="/" className="font-serif-math text-amber-600 dark:text-[#d9b452] hover:underline font-bold tracking-wide transition-colors">
            LEMMAS
          </Link>
          <span className="text-slate-400 dark:text-zinc-600">/</span>
          <span className="text-slate-900 dark:text-[#f5f0df] font-semibold">{currentTitle}</span>
        </div>

        {/* BARRA DE BUSCA RÁPIDA ESTILO ACADÊMICO */}
        <div className="hidden sm:flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-[#141222] border border-slate-200 dark:border-amber-500/15 text-xs text-slate-400 dark:text-zinc-400 w-64 hover:border-slate-300 dark:hover:border-amber-500/35 transition-colors">
          <Search className="w-3.5 h-3.5 text-slate-400 dark:text-[#d9b452]/70" />
          <Link href="/questoes" className="flex-1 text-slate-400 dark:text-zinc-400 hover:text-slate-600 dark:hover:text-[#f5f0df]">
            Buscar teoremas, questões...
          </Link>
          <kbd className="ml-auto text-[10px] bg-slate-200 dark:bg-zinc-800/80 px-1.5 py-0.5 rounded text-slate-500 dark:text-zinc-400 font-mono">
            ⌘K
          </kbd>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* LINK PARA A LANDING PAGE */}
        <Link
          href="/landing"
          target="_blank"
          className="hidden lg:flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-[#f5f0df] hover:bg-slate-100 dark:hover:bg-zinc-800/60 transition"
          title="Sobre o LEMMAS · Manifesto e Roadmap"
        >
          <span>Sobre o LEMMAS</span>
          <ExternalLink className="w-3 h-3 opacity-70" />
        </Link>

        {/* STREAK DIÁRIO */}
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/25 text-xs font-bold text-amber-700 dark:text-[#d9b452]" title="Streak de Estudo Diário: 7 dias consecutivos">
          <Flame className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
          <span>7 dias</span>
        </div>

        {/* FOCO CONCURSO */}
        <div className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 dark:bg-[#1f1b2c] border border-amber-500/20 dark:border-amber-500/25 text-xs font-semibold text-amber-700 dark:text-[#e1bb55]">
          <span>🎯 ESA / IME</span>
        </div>

        {/* PERFIL AVATAR */}
        <Link
          href="/perfil"
          className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-500 to-amber-700 text-white font-bold text-xs flex items-center justify-center shadow-sm hover:scale-105 border border-amber-400/40 transition-transform"
          title="Meu Perfil (Guilherme • UFF)"
        >
          GM
        </Link>
      </div>
    </header>
  );
}
