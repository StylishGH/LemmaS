"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Flame, 
  Cpu, 
  Menu, 
  X, 
  BookOpen, 
  LayoutDashboard, 
  PenTool, 
  Scale, 
  Info, 
  User,
  LogIn
} from "lucide-react";
import ThemeToggle from "./ThemeToggle";
import { Logo } from "@/app/(public)/landing/components/Logo";
import { useUserProfile } from "@/lib/use-user";

export default function AppNavbar() {
  const pathname = usePathname();
  const { profile, initials, isAuthenticated } = useUserProfile();
  const [mounted, setMounted] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [apiOnline, setApiOnline] = useState<boolean | null>(null);
  const [questionsCount, setQuestionsCount] = useState<number>(288);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    let controller = new AbortController();

    async function checkHealth() {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") {
        return;
      }
      try {
        controller.abort();
        controller = new AbortController();
        const res = await fetch("/api/health", {
          cache: "no-store",
          signal: controller.signal,
        });
        if (res.ok) {
          const data = await res.json();
          setApiOnline(true);
          if (data.total_questions) setQuestionsCount(data.total_questions);
        } else {
          setApiOnline(false);
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") return;
        setApiOnline(false);
      }
    }

    checkHealth();
    const interval = setInterval(checkHealth, 25000);
    return () => {
      clearInterval(interval);
      controller.abort();
    };
  }, []);

  const navLinks = [
    { label: "Dashboard", href: "/", icon: LayoutDashboard },
    { label: "Banco de Lemas", href: "/questoes", icon: BookOpen },
    { label: "Resolver / Simulado", href: "/resolver", icon: PenTool },
    { label: "Segunda Opinião", href: "/opinioes", icon: Scale },
    { label: "Sobre o LEMMAS", href: "/landing", icon: Info },
  ];

  const isLinkActive = (href: string) => {
    if (href === "/" && (pathname === "/" || pathname === "/dashboard")) return true;
    if (href === "/landing" && pathname === "/landing") return true;
    return pathname.startsWith(href) && href !== "/";
  };

  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur-md bg-white/80 dark:bg-[#0e0d16]/85 border-b border-slate-200/80 dark:border-amber-500/20 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between gap-4">
        
        {/* LADO ESQUERDO: LOGO LEMMAS PRO */}
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2.5 group">
            <Logo compact />
          </Link>

          {/* LINKS DE NAVEGAÇÃO HORIZONTAIS (DESKTOP) */}
          <nav className="hidden xl:flex items-center gap-1.5 ml-2">
            {navLinks.map((item) => {
              const active = isLinkActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
                    active
                      ? "bg-amber-500/15 text-amber-900 dark:text-[#f5f0df] border border-amber-500/35 dark:border-[#d9b452]/40 shadow-sm"
                      : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-[#f5f0df] hover:bg-slate-100 dark:hover:bg-zinc-800/40"
                  }`}
                >
                  <item.icon className={`w-3.5 h-3.5 ${active ? "text-amber-600 dark:text-[#d9b452]" : "opacity-60"}`} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* LADO DIREITO: CONTROLES, TEMA, STREAK E AVATAR */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          
          {/* STATUS ENGINE */}
          <div 
            className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-[#18152a] border border-slate-200 dark:border-amber-500/15 text-[11px] font-semibold text-slate-600 dark:text-[#dedbd0]"
            title={`MathAI Engine: ${questionsCount} lemas ativos`}
          >
            <Cpu className="w-3.5 h-3.5 text-amber-600 dark:text-[#d9b452]" />
            <span className="hidden lg:inline">MathAI:</span>
            <span className="font-mono text-amber-700 dark:text-[#d9b452] font-bold">{questionsCount}</span>
            <span className={`w-1.5 h-1.5 rounded-full ${apiOnline ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`} />
          </div>

          {/* STREAK E FOCO (APENAS PARA USUÁRIOS AUTENTICADOS) */}
          {mounted && isAuthenticated && (
            <div 
              className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/25 text-xs font-bold text-amber-700 dark:text-[#d9b452]" 
              title={`Streak de Estudo Diário: ${profile.streakDias} ${profile.streakDias === 1 ? "dia" : "dias"}`}
            >
              <Flame className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
              <span>{profile.streakDias} {profile.streakDias === 1 ? "dia" : "dias"}</span>
            </div>
          )}

          {mounted && isAuthenticated && profile.focoConcurso && (
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-[#1a172c] border border-slate-200 dark:border-amber-500/20 text-xs font-semibold text-slate-700 dark:text-[#dedbd0]">
              <span>🎯 {profile.focoConcurso}</span>
            </div>
          )}

          {/* BOTÃO TOGGLE DE TEMA (COMPACTO) */}
          <ThemeToggle compact />

          {/* AUTENTICAÇÃO: AVATAR SE LOGADO OU BOTÃO ENTRAR SE VISITANTE */}
          {!mounted ? (
            <div className="w-9 h-9 rounded-full bg-slate-200/60 dark:bg-zinc-800/60 animate-pulse" />
          ) : isAuthenticated ? (
            <Link
              href="/perfil"
              className="w-9 h-9 rounded-full bg-gradient-to-tr from-amber-500 to-amber-700 text-white font-bold text-xs flex items-center justify-center shadow-sm hover:scale-105 border border-amber-400/40 transition-transform"
              title={`Meu Perfil (${profile.nome || "Aluno"})`}
            >
              {initials || "AL"}
            </Link>
          ) : (
            <Link
              href="/login"
              className="lemmas-gold-cta px-3.5 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-sm hover:scale-[1.02] transition-transform"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Entrar</span>
            </Link>
          )}

          {/* BOTÃO HAMBURGER MOBILE */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="xl:hidden p-2 rounded-xl text-slate-700 dark:text-[#f5f0df] hover:bg-slate-100 dark:hover:bg-zinc-800/60 border border-slate-200 dark:border-amber-500/20 transition"
            aria-label="Abrir menu de navegação"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* MENU MOBILE EXPANDIDO */}
      {mobileMenuOpen && (
        <div className="xl:hidden border-t border-slate-200 dark:border-amber-500/20 bg-white/95 dark:bg-[#110f1e]/95 backdrop-blur-xl px-4 py-4 space-y-2 animate-fadeIn">
          {navLinks.map((item) => {
            const active = isLinkActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  active
                    ? "bg-amber-500/15 text-amber-900 dark:text-[#f5f0df] border border-amber-500/35"
                    : "text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800/40"
                }`}
              >
                <item.icon className={`w-4 h-4 ${active ? "text-amber-600 dark:text-[#d9b452]" : "opacity-60"}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
          <div className="pt-2 border-t border-slate-100 dark:border-zinc-800/60 flex items-center justify-between text-xs px-2">
            {!mounted ? (
              <div className="h-8 w-full rounded-xl bg-slate-200/60 dark:bg-zinc-800/60 animate-pulse" />
            ) : isAuthenticated ? (
              <Link
                href="/perfil"
                onClick={() => setMobileMenuOpen(false)}
                className="text-amber-600 dark:text-[#d9b452] font-semibold flex items-center gap-1.5"
              >
                <User className="w-3.5 h-3.5" />
                <span>Ver Perfil ({profile.nome || "Aluno"})</span>
              </Link>
            ) : (
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="lemmas-gold-cta px-4 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 w-full"
              >
                <LogIn className="w-4 h-4" />
                <span>Entrar ou Criar Conta</span>
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
