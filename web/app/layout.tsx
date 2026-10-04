import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/Sidebar";

export const metadata: Metadata = {
  title: "MathAI — Plataforma Cognitiva de Matemática",
  description: "A IA que aprende como você aprende Matemática para expandir seu raciocínio.",
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>📐</text></svg>",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className="h-full bg-[#0a0a0f] text-slate-100 antialiased">
      <body className="min-h-full flex flex-row">
        <Sidebar />
        <main className="flex-1 min-h-screen overflow-y-auto px-6 py-8 md:px-10">
          <div className="max-w-6xl mx-auto">{children}</div>
        </main>
      </body>
    </html>
  );
}
