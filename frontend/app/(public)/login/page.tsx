"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { Moon, Sun, ArrowLeft, Loader2 } from "lucide-react";
import { BoardFrame } from "../landing/components/BoardFrame";
import { Logo } from "../landing/components/Logo";
import { AuthCard } from "./components/AuthCard";
import "../landing/components/BoardFrame.css";
import "../landing/components/Logo.css";
import "../landing/components/LandingPage.css";

function AuthCardFallback() {
  return (
    <div className="max-w-md mx-auto p-12 text-center flex flex-col items-center justify-center gap-3">
      <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
      <span className="text-xs text-slate-500 font-mono">Carregando autenticação...</span>
    </div>
  );
}

export default function LoginPage() {
  const [light, setLight] = useState(false);

  useEffect(() => {
    document.documentElement.dataset.theme = light ? "lemmas-light" : "lemmas-dark";
    document.documentElement.style.colorScheme = light ? "light" : "dark";
  }, [light]);

  return (
    <BoardFrame>
      <div className="lemmas-page max-w-4xl mx-auto px-4 py-8">
        <nav className="flex items-center justify-between pb-6 border-b border-amber-500/20 mb-8">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-[#a9aaa1] hover:text-amber-500 transition-colors"
            >
              <ArrowLeft size={16} /> Voltar ao Início
            </Link>
            <div className="h-4 w-px bg-amber-500/20" />
            <Logo compact />
          </div>

          <button
            type="button"
            className="lemmas-theme-toggle p-2 rounded-xl border border-amber-500/20 text-slate-600 dark:text-[#d9b452] hover:bg-amber-500/10 transition-colors"
            onClick={() => setLight((v) => !v)}
            aria-label={light ? "Ativar quadro negro" : "Ativar quadro branco"}
          >
            {light ? <Moon size={16} /> : <Sun size={16} />}
          </button>
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
