"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useUserProfile } from "@/lib/use-user";

function getSection(pathname: string): "resolver" | "questoes" | "other" {
  if (pathname.startsWith("/resolver")) return "resolver";
  if (pathname.startsWith("/questoes")) return "questoes";
  return "other";
}

export function StudentPresenceHeartbeat() {
  const pathname = usePathname();
  const { profile, loading } = useUserProfile();
  const section = getSection(pathname);

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
