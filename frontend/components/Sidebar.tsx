"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { 
  LayoutDashboard, 
  BookOpen, 
  Scale, 
  Info, 
  User, 
  PenTool
} from "lucide-react";
import ThemeToggle from "./ThemeToggle";
import { useUserProfile } from "@/lib/use-user";
import { Logo } from "@/app/(public)/landing/components/Logo";

export default function Sidebar() {
  const pathname = usePathname();
  const { profile, initials } = useUserProfile();

  const navItems = [
    { label: "Dashboard", href: "/", icon: LayoutDashboard },
    { label: "Questões & Treino", href: "/questoes", icon: BookOpen },
    { label: "Resolver / Simulado", href: "/resolver", icon: PenTool },
    { label: "Segunda Opinião", href: "/opinioes", icon: Scale },
    { label: "Meu Perfil", href: "/perfil", icon: User },
    { label: "Sobre o LEMMAS", href: "/landing", icon: Info },
  ];

  return (
    <aside className="w-64 bg-[var(--bg-card)] border-r border-[var(--border-subtle)] flex flex-col justify-between h-screen sticky top-0 px-4 py-5 select-none transition-colors duration-200">
      <div className="space-y-6">
        {/* LOGO OFICIAL LEMMAS */}
        <Link href="/" className="flex items-center gap-2 px-2 py-1 group">
          <Logo compact={true} />
        </Link>

        {/* NAVEGAÇÃO LEMMAS */}
        <nav className="space-y-1">
          <div className="text-[10px] font-bold text-[var(--ink-muted)] uppercase tracking-widest px-3 mb-2">
            Módulos de Estudo
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs md:text-sm transition-[background-color,border-color,color,transform] duration-150 border ${
                  isActive
                    ? "bg-[var(--marker-blue-dim)] dark:bg-[var(--marker-amber-dim)] text-[var(--ink-primary)] border-[var(--marker-blue-border)] dark:border-[var(--marker-amber-border)] font-semibold"
                    : "border-transparent text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] hover:bg-[var(--bg-elevated)]"
                }`}
              >
                <Icon
                  className={`w-4 h-4 ${
                    isActive
                      ? "text-[var(--marker-blue)] dark:text-[var(--marker-amber)]"
                      : "text-[var(--ink-muted)]"
                  }`}
                />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* RODAPÉ DO SIDEBAR */}
      <div className="space-y-3 pt-3 border-t border-[var(--border-subtle)]">
        {/* ALTERNADOR DE TEMA */}
        <ThemeToggle />

        {/* PERFIL DO USUÁRIO COM FOTO REAL */}
        <Link 
          href="/perfil"
          className="flex items-center gap-3 bg-[var(--bg-elevated)] border border-[var(--border-subtle)] p-2.5 rounded-xl hover:border-[var(--border-strong)] transition-[border-color,background-color] duration-150"
        >
          {profile.fotoUrl ? (
            <img
              src={profile.fotoUrl}
              alt={profile.nome || "Avatar"}
              className="w-9 h-9 rounded-full object-cover border border-[var(--border-default)]"
            />
          ) : (
            <div className="w-9 h-9 rounded-full bg-[var(--marker-blue)] dark:bg-[var(--marker-amber)] text-white dark:text-[#101316] font-bold flex items-center justify-center text-xs font-serif-math">
              {initials}
            </div>
          )}
          <div className="overflow-hidden">
            <div className="font-semibold text-xs text-[var(--ink-primary)] truncate">
              {profile.nome}
            </div>
            <div className="text-[10px] text-[var(--ink-secondary)] truncate">
              {profile.isGuest ? "Modo Convidado" : (profile.faculdade || "Estudante")}
            </div>
          </div>
        </Link>
      </div>
    </aside>
  );
}
