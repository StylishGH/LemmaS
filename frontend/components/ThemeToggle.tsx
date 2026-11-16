"use client";

import React, { useEffect, useState } from "react";
import { BookOpen, Moon, PenTool, Sun } from "lucide-react";
import { useTheme } from "./theme-provider";

interface ThemeToggleProps {
  compact?: boolean;
  className?: string;
}

export function ThemeToggle({ compact = false, className = "" }: ThemeToggleProps) {
  const { isLight, toggleTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div
        className={`w-9 h-9 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] animate-pulse ${className}`}
        aria-hidden="true"
      />
    );
  }

  if (compact) {
    return (
      <button
        type="button"
        onClick={toggleTheme}
        className={`p-2 rounded-xl transition-[background-color,border-color,color,transform] duration-150 border cursor-pointer ${
          isLight
            ? "bg-[var(--bg-elevated)] hover:bg-[var(--bg-subtle)] border-[var(--border-default)] text-[var(--marker-blue)]"
            : "bg-[var(--bg-elevated)] hover:bg-[var(--bg-subtle)] border-[var(--marker-amber-border)] text-[var(--marker-amber)]"
        } ${className}`}
        aria-label={isLight ? "Ativar Quadro & Giz (Escuro)" : "Ativar Lousa & Piloto (Claro)"}
        title={isLight ? "Mudar para Quadro & Giz (Dark)" : "Mudar para Lousa & Piloto (Light)"}
      >
        {isLight ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`flex items-center justify-between w-full px-3 py-2.5 rounded-xl border text-xs font-medium transition-[background-color,border-color,color,transform] duration-150 cursor-pointer ${
        isLight
          ? "bg-[var(--bg-elevated)] hover:bg-[var(--bg-subtle)] border-[var(--border-default)] text-[var(--ink-primary)]"
          : "bg-[var(--bg-elevated)] hover:bg-[var(--bg-subtle)] border-[var(--marker-amber-border)] text-[var(--ink-primary)]"
      } ${className}`}
      aria-label="Alternar tema de superfície"
    >
      <div className="flex items-center gap-2.5">
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center border"
          style={{
            backgroundColor: isLight ? "var(--marker-blue-dim)" : "var(--marker-amber-dim)",
            borderColor: isLight ? "var(--marker-blue-border)" : "var(--marker-amber-border)",
            color: isLight ? "var(--marker-blue)" : "var(--marker-amber)",
          }}
        >
          {isLight ? <PenTool className="w-3.5 h-3.5" /> : <BookOpen className="w-3.5 h-3.5" />}
        </div>
        <div className="text-left">
          <div className="font-semibold text-[11px] leading-tight">
            {isLight ? "Lousa & Piloto" : "Quadro & Giz"}
          </div>
          <div className="text-[10px] text-[var(--ink-muted)]">
            {isLight ? "Porcelana acetinada" : "Ardósia mineral"}
          </div>
        </div>
      </div>
      <div
        className="w-7 h-7 rounded-lg flex items-center justify-center border transition-[background-color,border-color,color] duration-150"
        style={{
          backgroundColor: isLight ? "var(--marker-blue-dim)" : "var(--marker-amber-dim)",
          borderColor: isLight ? "var(--marker-blue-border)" : "var(--marker-amber-border)",
          color: isLight ? "var(--marker-blue)" : "var(--marker-amber)",
        }}
      >
        {isLight ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
      </div>
    </button>
  );
}

export default ThemeToggle;
