"use client";

import React, { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
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
        className={`w-9 h-9 rounded-xl border border-zinc-700/40 bg-zinc-800/40 animate-pulse ${className}`}
        aria-hidden="true"
      />
    );
  }

  if (compact) {
    return (
      <button
        type="button"
        onClick={toggleTheme}
        className={`p-2 rounded-xl transition-all border ${
          isLight
            ? "bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-800 shadow-sm"
            : "bg-[#181528] hover:bg-[#201c35] border-amber-500/30 text-amber-400 hover:text-amber-300 shadow-sm"
        } ${className}`}
        aria-label={isLight ? "Ativar Lousa de Giz (Escuro)" : "Ativar Quadro Branco (Claro)"}
        title={isLight ? "Mudar para Lousa de Giz Clássica (Dark)" : "Mudar para Quadro Branco Moderno (Light)"}
      >
        {isLight ? <Moon className="w-4 h-4 text-slate-700" /> : <Sun className="w-4 h-4 text-amber-400" />}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`flex items-center justify-between w-full px-3 py-2.5 rounded-xl border text-xs font-medium transition-all ${
        isLight
          ? "bg-slate-100 hover:bg-slate-200/80 border-slate-300 text-slate-800 shadow-sm"
          : "bg-[#181528] hover:bg-[#201c35] border-amber-500/25 text-zinc-300 shadow-sm"
      } ${className}`}
      aria-label="Alternar tema cenográfico"
    >
      <div className="flex items-center gap-2">
        <span className="text-base">{isLight ? "🖊️" : "🪵"}</span>
        <div className="text-left">
          <div className="font-semibold text-[11px] leading-tight">
            {isLight ? "Quadro Branco" : "Lousa de Giz"}
          </div>
          <div className="text-[10px] text-zinc-400 dark:text-zinc-500">
            {isLight ? "Modo Canetão" : "Modo Madeira & Giz"}
          </div>
        </div>
      </div>
      <div
        className={`w-7 h-7 rounded-lg flex items-center justify-center border transition-colors ${
          isLight
            ? "bg-slate-200 border-slate-300 text-slate-700"
            : "bg-amber-500/10 border-amber-500/30 text-amber-400"
        }`}
      >
        {isLight ? <Moon className="w-3.5 h-3.5 text-slate-700" /> : <Sun className="w-3.5 h-3.5 text-amber-400" />}
      </div>
    </button>
  );
}

export default ThemeToggle;
