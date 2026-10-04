"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { LayoutDashboard, BookOpen, Scale, Info, CheckCircle2, AlertCircle } from "lucide-react";

export default function Sidebar() {
  const pathname = usePathname();
  const [apiOnline, setApiOnline] = useState<boolean | null>(null);
  const [questionsCount, setQuestionsCount] = useState<number>(0);

  useEffect(() => {
    let controller = new AbortController();

    async function checkHealth() {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") {
        return; // Pausa polling se aba estiver em segundo plano
      }
      try {
        controller.abort();
        controller = new AbortController();
        const res = await fetch("http://localhost:8000/api/health", {
          cache: "no-store",
          signal: controller.signal,
        });
        if (res.ok) {
          const data = await res.json();
          setApiOnline(true);
          setQuestionsCount(data.total_questions || 0);
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
    { label: "Segunda Opinião", href: "/opinioes", icon: Scale },
    { label: "Sobre Nós", href: "/sobre", icon: Info },
  ];

  return (
    <aside className="w-64 bg-[#110f1c] border-r border-violet-900/40 flex flex-col justify-between h-screen sticky top-0 px-4 py-5 select-none">
      <div className="space-y-6">
        {/* LOGO MATHAI */}
        <Link href="/" className="flex items-center gap-3 px-2 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 border border-amber-500/50 flex items-center justify-center text-xl shadow-lg shadow-violet-950/50 group-hover:scale-105 transition-transform">
            📐
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-lg tracking-tight text-white">MathAI</span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">
                V1.0
              </span>
            </div>
            <p className="text-[11px] text-zinc-400">Plataforma Cognitiva</p>
          </div>
        </Link>

        {/* NAVEGAÇÃO */}
        <nav className="space-y-1.5">
          <div className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider px-3 mb-2">
            Módulos de Estudo
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm transition-all ${
                  isActive
                    ? "bg-violet-600/20 text-white border border-violet-500/40 shadow-sm shadow-violet-900/40 font-semibold"
                    : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40"
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-amber-400" : "text-zinc-400"}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* RODAPÉ DO SIDEBAR: STATUS DA API & PERFIL DO ESTUDANTE */}
      <div className="space-y-4 pt-4 border-t border-violet-900/30">
        {/* STATUS DO BACKEND PYTHON */}
        <div className="bg-[#181528] border border-violet-900/30 rounded-xl p-3 text-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-zinc-400 font-medium">Core API Python</span>
            {apiOnline === true ? (
              <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" /> Online
              </span>
            ) : apiOnline === false ? (
              <span className="flex items-center gap-1 text-rose-400 font-semibold">
                <AlertCircle className="w-3.5 h-3.5" /> Offline
              </span>
            ) : (
              <span className="text-zinc-500">Conectando...</span>
            )}
          </div>
          {apiOnline && (
            <p className="text-[11px] text-zinc-400">
              Banco local: <span className="text-amber-400 font-semibold">{questionsCount} questões</span>
            </p>
          )}
        </div>

        {/* PERFIL DO USUÁRIO */}
        <div className="flex items-center gap-3 bg-[#181528] border border-violet-900/40 p-2.5 rounded-xl">
          <div className="w-9 h-9 rounded-full bg-violet-600/30 border border-violet-500/40 text-violet-300 font-bold flex items-center justify-center text-xs">
            GM
          </div>
          <div className="overflow-hidden">
            <div className="font-semibold text-xs text-white truncate">Guilherme Mendes</div>
            <div className="text-[10px] text-zinc-400 truncate">UFF • Matemática</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
