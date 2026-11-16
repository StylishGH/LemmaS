import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Newsreader, JetBrains_Mono, Caveat } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
});

const newsreader = Newsreader({
  subsets: ["latin"],
  style: ["normal", "italic"],
  variable: "--font-newsreader",
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
});

const caveat = Caveat({
  subsets: ["latin"],
  weight: ["500", "600"],
  variable: "--font-caveat",
  display: "swap",
});
import { ThemeProvider } from "@/components/theme-provider";
import { UserProvider } from "@/lib/use-user";
import { ThemeInitializer } from "@/components/theme-initializer";
import { StudentPresenceHeartbeat } from "@/components/StudentPresenceHeartbeat";
import { ProtoDesignPicker } from "@/components/ProtoDesignPicker";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8fafc" },
    { media: "(prefers-color-scheme: dark)", color: "#101316" },
  ],
};

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
    <html
      lang="pt-BR"
      className={`${jakarta.variable} ${newsreader.variable} ${jetbrains.variable} ${caveat.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head />
      <body className="min-h-full">
        <Analytics />
        <ThemeInitializer />
        <ThemeProvider>
          <UserProvider>
            <StudentPresenceHeartbeat />
            {children}
            <ProtoDesignPicker />
          </UserProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
