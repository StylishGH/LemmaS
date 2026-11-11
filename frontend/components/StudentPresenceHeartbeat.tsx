"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useUserProfile } from "@/lib/use-user";

function getSection(pathname: string): "resolver" | "questoes" | "other" {
  if (pathname.startsWith("/resolver")) return "resolver";
  if (pathname.startsWith("/questoes")) return "questoes";
  return "other";
}

function getFunnelStage(pathname: string): "landing" | "questoes" | "resolver" | null {
  if (pathname === "/" || pathname === "/landing") return "landing";
  if (pathname.startsWith("/questoes")) return "questoes";
  if (pathname.startsWith("/resolver")) return "resolver";
  return null;
}

export function StudentPresenceHeartbeat() {
  const pathname = usePathname();
  const { profile, loading } = useUserProfile();
  const section = getSection(pathname);
  const funnelStage = getFunnelStage(pathname);
  const lastTrackedStageRef = useRef<string | null>(null);

  // 1. RASTREAMENTO DO FUNIL DE CONVERSÃO E ABANDONO (Anônimo e Autenticado)
  useEffect(() => {
    if (!funnelStage || typeof window === "undefined") return;

    // Garante ou recupera session_id efêmero em sessionStorage (conforme LGPD)
    let sessionId = "";
    try {
      sessionId = sessionStorage.getItem("lemmas_funnel_session") || "";
      if (!sessionId) {
        sessionId = "ses_" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
        sessionStorage.setItem("lemmas_funnel_session", sessionId);
      }

      // Evita disparos repetidos da mesma etapa na mesma sessão
      const trackedKey = `lemmas_funnel_stage_${funnelStage}`;
      if (sessionStorage.getItem(trackedKey) || lastTrackedStageRef.current === funnelStage) {
        return;
      }
      sessionStorage.setItem(trackedKey, "1");
      lastTrackedStageRef.current = funnelStage;

      // Disparo não-bloqueante
      fetch("/api/presence/funnel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          stage: funnelStage,
          isAnonymous: Boolean(profile?.isGuest ?? true),
          referrer: document.referrer || null,
        }),
        credentials: "same-origin",
        cache: "no-store",
      }).catch(() => {
        // Telemetria silenciosa
      });
    } catch {
      // Ignora falhas de storage em ambientes restritos (incognito agressivo)
    }
  }, [funnelStage, profile?.isGuest]);

  // 2. HEARTBEAT DE PRESENÇA EM TEMPO REAL (Para alunos autenticados)
  useEffect(() => {
    if (loading || profile.isGuest || !profile.email) return;

    let sending = false;
    const sendHeartbeat = async () => {
      if (sending || document.visibilityState !== "visible") return;
      sending = true;
      try {
        await fetch("/api/presence/heartbeat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ section }),
          credentials: "same-origin",
          cache: "no-store",
        });
      } catch {
        // Presença é telemetria auxiliar e não deve interromper o estudo.
      } finally {
        sending = false;
      }
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") void sendHeartbeat();
    };

    void sendHeartbeat();
    const timer = window.setInterval(() => void sendHeartbeat(), 60_000);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [loading, profile.email, profile.isGuest, section]);

  return null;
}
