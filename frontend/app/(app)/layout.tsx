import type { Metadata } from "next";
import "../globals.css";
import AppNavbar from "@/components/AppNavbar";
import { BackgroundAnimation } from "../(public)/landing/components/BackgroundAnimation";

export const metadata: Metadata = {
  title: "LEMMAS — Plataforma Cognitiva de Aprendizagem | MathAI Engine",
  description: "Plataforma cognitiva adaptativa de aprendizagem impulsionada pela MathAI Engine.",
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>📐</text></svg>",
  },
};

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="lemmas-app-frame min-h-screen flex flex-col text-slate-900 dark:text-[#f5f0df] relative overflow-x-hidden selection:bg-amber-500/30">
      {/* TEXTURA E GRÃO DE LOUSA / QUADRO */}
      <div className="lemmas-grain-overlay" aria-hidden="true" />

      {/* ONDAS HARMÔNICAS SUTIS EM SEGUNDO PLANO */}
      <BackgroundAnimation />

      {/* BARRA DE NAVEGAÇÃO SUPERIOR UNIFICADA (TOP NAVIGATION ROOM) */}
      <AppNavbar />

      {/* CONTEÚDO PRINCIPAL CENTRALIZADO */}
      <main className="flex-1 relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10">
        {children}
      </main>
    </div>
  );
}
