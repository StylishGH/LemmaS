import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { UserProvider } from "@/lib/use-user";
import { ThemeInitializer } from "@/components/theme-initializer";

export const metadata: Metadata = {
  title: "LEMMAS — Plataforma Cognitiva de Aprendizagem | Powered by MathAI Engine",
  description: "Plataforma de aprendizagem adaptativa e diagnóstico metacognitivo impulsionada pela MathAI Engine.",
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
    <html lang="pt-BR" className="h-full antialiased" suppressHydrationWarning>
      <head />
      <body className="min-h-full">
        <ThemeInitializer />
        <ThemeProvider>
          <UserProvider>
            {children}
          </UserProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}