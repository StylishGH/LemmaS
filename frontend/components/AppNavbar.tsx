"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Flame, 
  Target, 
  Menu, 
  X, 
  BookOpen, 
  LayoutDashboard, 
  PenTool, 
  Scale, 
  Info, 
  User,
  LogIn,
  Sparkles
} from "lucide-react";
import ThemeToggle from "./ThemeToggle";
import { Logo } from "@/app/(public)/landing/components/Logo";
import { LogoLoop, type LogoItem } from "@/app/(public)/landing/components/LogoLoop";
import { useUserProfile } from "@/lib/use-user";

export default function AppNavbar() {
  const pathname = usePathname();
  const { profile, initials, isAuthenticated } = useUserProfile();
  const [mounted, setMounted] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const navLinks = [
      { label: "Dashboard", href: "/", icon: LayoutDashboard },
      { label: "Banco de Questões", href: "/questoes", icon: BookOpen },
      { label: "Resolver / Simulado", href: "/resolver", icon: PenTool },
      { label: "Segunda Opinião", href: "/opinioes", icon: Scale },
      { label: "Sobre o LEMMAS", href: "/landing", icon: Info },
    ];

    const isLinkActive = (href: string) => {
    if (href === "/" && (pathname === "/" || pathname === "/dashboard")) return true;
    if (href === "/landing" && pathname === "/landing") return true;
    return pathname.startsWith(href) && href !== "/";
  };

  const focoParts = useMemo(() => {
    if (!profile.focoConcurso) return [];
    const raw = profile.focoConcurso
      .split(/[,/|·•]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    return raw.length > 0 ? raw : [profile.focoConcurso.trim()];
  }, [profile.focoConcurso]);

  const focoLoopItems: LogoItem[] = useMemo(() => {
    return focoParts.map((part) => ({
      node: (
        <span className="inline-flex items-center gap-1.5 font-semibold text-[var(--ink-primary)] text-[11px] whitespace-nowrap">
          {part}
          <span className="text-[var(--ink-muted)] text-[9px] select-none opacity-60">
            •
          </span>
        </span>
      ),
    }));
  }, [focoParts]);

  const isFocoLongOrMulti =
    focoParts.length > 1 || (profile.focoConcurso ? profile.focoConcurso.length > 15 : false);

  return (
    <header className="sticky top-0 z-40 w-full bg-[var(--bg-card)] border-b border-[var(--border-subtle)] transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3 sm:gap-4">
        
        {/* LADO ESQUERDO: LOGO LEMMAS */}
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
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-[background-color,border-color,color,transform] duration-150 flex items-center gap-2 border ${
                    active
                      ? "bg-[var(--marker-blue-dim)] dark:bg-[var(--marker-amber-dim)] text-[var(--ink-primary)] border-[var(--marker-blue-border)] dark:border-[var(--marker-amber-border)]"
                      : "border-transparent text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] hover:bg-[var(--bg-elevated)]"
                  }`}
                >
                  <item.icon
                    className={`w-3.5 h-3.5 ${
                      active
                        ? "text-[var(--marker-blue)] dark:text-[var(--marker-amber)]"
                        : "opacity-65"
                    }`}
                  />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* LADO DIREITO: CONTROLES, TEMA, STREAK E AVATAR */}
        <div className="flex items-center gap-2 sm:gap-3">
          
          {/* STREAK (DIAS CONSECUTIVOS DE ESTUDO) */}
          {mounted && isAuthenticated && (
            <div 
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-bold tabular-nums whitespace-nowrap shrink-0 transition-colors ${
                profile.streakDias > 0
                  ? "bg-[var(--marker-amber-dim)] border-[var(--marker-amber-border)] text-[var(--marker-amber)]"
                  : "bg-[var(--bg-elevated)] border-[var(--border-subtle)] text-[var(--ink-muted)]"
              }`}
              title={
                profile.streakDias > 0
                  ? `Fogo aceso! ${profile.streakDias} ${profile.streakDias === 1 ? "dia consecutivo" : "dias consecutivos"} de estudo ativo.`
                  : "Resolva uma questão hoje para acender seu fogo de dias consecutivos!"
              }
            >
              <Flame 
                className={`w-3.5 h-3.5 ${
                  profile.streakDias > 0 
                    ? "fill-current text-[var(--marker-amber)]" 
                    : "text-[var(--ink-muted)] opacity-60"
                }`} 
              />
              <span>{profile.streakDias} {profile.streakDias === 1 ? "dia" : "dias"}</span>
            </div>
          )}

          {/* FOCO DE ESTUDO / OBJETIVO */}
          {mounted && isAuthenticated && profile.focoConcurso && (
            <div 
              className="hidden lg:flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--bg-elevated)] border border-[var(--border-default)] text-xs font-medium text-[var(--ink-secondary)] whitespace-nowrap shrink-0 w-[210px] xl:w-[240px] overflow-hidden"
              title={`Foco de estudo atual: ${profile.focoConcurso}`}
            >
              <Target className="w-3.5 h-3.5 text-[var(--marker-blue)] dark:text-[var(--marker-amber)] shrink-0" />
              <span className="text-[11px] font-semibold text-[var(--ink-muted)] shrink-0">Foco:</span>
              <div className="flex-1 overflow-hidden min-w-0 h-[18px] flex items-center">
                {isFocoLongOrMulti ? (
                  <LogoLoop
                    logos={focoLoopItems}
                    speed={24}
                    logoHeight={14}
                    gap={16}
                    fadeOut
                    fadeOutWidth={0.14}
                    pauseOnHover
                    draggable={false}
                    scaleOnHover={false}
                    intro={false}
                    ariaLabel={`Foco: ${profile.focoConcurso}`}
                  />
                ) : (
                  <span className="font-semibold text-[var(--ink-primary)] text-[11px] truncate">
                    {profile.focoConcurso}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* BOTÃO TOGGLE DE TEMA (COMPACTO) */}
          <ThemeToggle compact />

          {/* AUTENTICAÇÃO: AVATAR SE LOGADO OU BOTÃO ENTRAR SE VISITANTE */}
          {!mounted ? (
            <div className="w-9 h-9 rounded-full bg-[var(--bg-elevated)] animate-pulse shrink-0" />
          ) : isAuthenticated ? (
            <Link
              href="/perfil"
              className="w-9 h-9 rounded-full bg-[var(--marker-blue)] dark:bg-[var(--marker-amber)] text-white dark:text-[#101316] font-bold text-xs flex items-center justify-center hover:scale-105 border border-[var(--border-default)] transition-transform overflow-hidden shrink-0 relative group"
              title={`Meu Perfil (${profile.nome || "Aluno"})`}
            >
              {profile.fotoUrl ? (
                <img
                  src={profile.fotoUrl}
                  alt={profile.nome || "Foto de perfil"}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span>{initials || "AL"}</span>
              )}
            </Link>
          ) : (
            <Link
              href="/login"
              className="lemmas-gold-cta px-3.5 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 hover:scale-[1.02] transition-transform"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Entrar</span>
            </Link>
          )}

          {/* BOTÃO HAMBURGER MOBILE */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="xl:hidden p-2 rounded-xl text-[var(--ink-primary)] hover:bg-[var(--bg-elevated)] border border-[var(--border-default)] transition-[background-color,border-color,transform] duration-150"
            aria-label={mobileMenuOpen ? "Fechar menu de navegação" : "Abrir menu de navegação"}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* MENU MOBILE EXPANDIDO */}
      {mobileMenuOpen && (
        <div className="xl:hidden border-t border-[var(--border-subtle)] bg-[var(--bg-card)] px-4 py-4 space-y-2 animate-fadeIn">
          {navLinks.map((item) => {
            const active = isLinkActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-[background-color,border-color,color] duration-150 border ${
                  active
                    ? "bg-[var(--marker-blue-dim)] dark:bg-[var(--marker-amber-dim)] text-[var(--ink-primary)] border-[var(--marker-blue-border)] dark:border-[var(--marker-amber-border)]"
                    : "border-transparent text-[var(--ink-secondary)] hover:bg-[var(--bg-elevated)]"
                }`}
              >
                <item.icon
                  className={`w-4 h-4 ${
                    active
                      ? "text-[var(--marker-blue)] dark:text-[var(--marker-amber)]"
                      : "opacity-65"
                  }`}
                />
                <span>{item.label}</span>
              </Link>
            );
          })}
          <div className="pt-2 border-t border-[var(--border-subtle)] flex items-center justify-between text-xs px-2">
            {!mounted ? (
              <div className="h-8 w-full rounded-xl bg-[var(--bg-elevated)] animate-pulse" />
            ) : isAuthenticated ? (
              <Link
                href="/perfil"
                onClick={() => setMobileMenuOpen(false)}
                className="text-[var(--marker-blue)] dark:text-[var(--marker-amber)] font-semibold flex items-center gap-2.5 py-1"
              >
                <div className="w-7 h-7 rounded-full overflow-hidden bg-[var(--marker-blue)] dark:bg-[var(--marker-amber)] text-white dark:text-[#101316] font-bold text-[11px] flex items-center justify-center border border-[var(--border-default)] shrink-0">
                  {profile.fotoUrl ? (
                    <img src={profile.fotoUrl} alt={profile.nome} className="w-full h-full object-cover" />
                  ) : (
                    <span>{initials || "AL"}</span>
                  )}
                </div>
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
