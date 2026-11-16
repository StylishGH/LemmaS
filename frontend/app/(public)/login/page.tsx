"use client";

import { Suspense } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import { BoardFrame } from "../landing/components/BoardFrame";
import { Logo } from "../landing/components/Logo";
import { AuthCard } from "./components/AuthCard";
import { ThemeToggle } from "@/components/ThemeToggle";
import "../landing/components/BoardFrame.css";
import "../landing/components/Logo.css";
import "../landing/components/LandingPage.css";

function AuthCardFallback() {
  return (
    <div className="max-w-md mx-auto p-12 text-center flex flex-col items-center justify-center gap-3">
      <Loader2 className="w-6 h-6 animate-spin text-[var(--marker-blue)] dark:text-[var(--marker-amber)]" />
      <span className="text-xs text-[var(--ink-muted)] font-mono">Carregando autenticação...</span>
    </div>
  );
}

export default function LoginPage() {
  return (
    <BoardFrame>
      <div className="lemmas-page max-w-4xl mx-auto px-4 py-8">
        <nav className="flex items-center justify-between pb-6 border-b border-[var(--border-subtle)] mb-8">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--ink-secondary)] hover:text-[var(--marker-blue)] dark:hover:text-[var(--marker-amber)] transition-colors"
            >
              <ArrowLeft size={16} /> Voltar ao Início
            </Link>
            <div className="h-4 w-px bg-[var(--border-default)]" />
            <Logo compact />
          </div>

          <ThemeToggle compact />
        </nav>

        <div className="py-6">
          <Suspense fallback={<AuthCardFallback />}>
            <AuthCard />
          </Suspense>
        </div>
      </div>
    </BoardFrame>
  );
}
