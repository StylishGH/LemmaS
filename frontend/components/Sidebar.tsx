"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { 
  LayoutDashboard, 
  BookOpen, 
  Scale, 
  Info, 
  CheckCircle2, 
  AlertCircle, 
  Cpu, 
  User, 
  PenTool
} from "lucide-react";
import ThemeToggle from "./ThemeToggle";

export default function Sidebar() {
  const pathname = usePathname();
  const [apiOnline, setApiOnline] = useState<boolean | null>(null);
  const [questionsCount, setQuestionsCount] = useState<number>(0);

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
          setQuestionsCount(data.total_questions || 288);
        } else {
          setApiOnline(false);
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") return;
        setApiOnline(false);
      }
    }

    checkHealth();
    const interval = setInterval(checkHealth, 20000);

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") checkHealth();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      controller.abort();
    };
  }, []);

  const navItems = [
    { label: "Dashboard", href: "/", icon: LayoutDashboard },
    { label: "Questões & Treino", href: "/questoes", icon: BookOpen },
    { label: "Resolver / Simulado", href: "/resolver", icon: PenTool },
    { label: "Segunda Opinião", href: "/opinioes", icon: Scale },
    { label: "Meu Perfil", href: "/perfil", icon: User },
    { label: "Sobre o LEMMAS", href: "/landing", icon: Info },
  ];

  return (
    <aside className="w-64 bg-slate-50 dark:bg-[#110f1c] border-r border-slate-200 dark:border-amber-500/15 flex flex-col justify-between h-screen sticky top-0 px-4 py-5 select-none transition-colors duration-200">
      <div className="space-y-6">
        {/* LOGO LEMMAS EDITORIAL */}
        <Link href="/" className="flex items-center gap-3 px-2 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-700 border border-amber-400/50 flex items-center justify-center text-xl shadow-md group-hover:scale-105 transition-transform">
            📐
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-serif-math font-semibold text-xl tracking-tight text-slate-900 dark:text-[#f5f0df]">LEMMAS</span>
              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-amber-500/15 text-amber-600 dark:text-[#d9b452] border border-amber-500/30">
                PRO
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-[#a9aaa1]">Plataforma Cognitiva</p>
          </div>
        </Link>

        {/* NAVEGAÇÃO LEMMAS */}
        <nav className="space-y-1">
          <div className="text-[10px] font-bold text-slate-400 dark:text-[#d9b452]/80 uppercase tracking-widest px-3 mb-2">
            Módulos de Estudo
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs md:text-sm transition-all ${
                  isActive
                    ? "bg-amber-500/15 text-amber-900 dark:text-[#f5f0df] border border-amber-500/35 dark:border-[#d9b452]/40 font-semibold shadow-sm"
                    : "text-slate-600 dark:text-[#a9aaa1] hover:text-slate-900 dark:hover:text-[#f5f0df] hover:bg-slate-200/50 dark:hover:bg-zinc-800/40"
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-amber-600 dark:text-[#d9b452]" : "text-slate-400 dark:text-zinc-500"}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* RODAPÉ DO SIDEBAR */}
      <div className="space-y-3 pt-3 border-t border-slate-200 dark:border-amber-500/15">
        {/* ALTERNADOR DE TEMA */}
        <ThemeToggle />

        {/* STATUS DA MATHAI ENGINE */}
        <div className="bg-white dark:bg-[#141222] border border-slate-200 dark:border-amber-500/15 rounded-xl p-3 text-xs space-y-1 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-slate-700 dark:text-[#dedbd0] font-semibold flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-amber-600 dark:text-[#d9b452]" />
              MathAI Engine
            </span>
            {apiOnline === true ? (
              <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold text-[11px]">
                <CheckCircle2 className="w-3 h-3" /> Online
              </span>
            ) : apiOnline === false ? (
              <span className="flex items-center gap-1 text-rose-600 dark:text-rose-400 font-semibold text-[11px]">
                <AlertCircle className="w-3 h-3" /> Offline
              </span>
            ) : (
              <span className="text-slate-400 dark:text-zinc-500 text-[11px]">Conectando...</span>
            )}
          </div>
          {apiOnline && (
            <p className="text-[11px] text-slate-500 dark:text-[#a9aaa1]">
              Banco ativo: <span className="text-amber-600 dark:text-[#d9b452] font-semibold">{questionsCount} questões</span>
            </p>
          )}
        </div>

        {/* PERFIL DO USUÁRIO */}
        <Link 
          href="/perfil"
          className="flex items-center gap-3 bg-white dark:bg-[#141222] border border-slate-200 dark:border-amber-500/15 p-2.5 rounded-xl hover:border-amber-500/40 transition-colors shadow-sm"
        >
          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-amber-500 to-amber-700 text-white font-bold flex items-center justify-center text-xs shadow-sm">
            GM
          </div>
          <div className="overflow-hidden">
            <div className="font-semibold text-xs text-slate-900 dark:text-[#f5f0df] truncate">Guilherme Mendes</div>
            <div className="text-[10px] text-slate-500 dark:text-[#a9aaa1] truncate">UFF • Matemática</div>
          </div>
        </Link>
      </div>
    </aside>
  );
}
