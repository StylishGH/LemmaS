"use client";

import React from "react";
import DotGrid from "@/components/ui/DotGrid";
import { useTheme } from "@/components/theme-provider";

export function AppBackground() {
  const { isLight } = useTheme();
  const isDarkMode = !isLight;

  return (
    <div
      className="lemmas-formula-layer fixed inset-0 pointer-events-none overflow-hidden"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: "100vw",
        height: "100vh",
        zIndex: 1,
      }}
      aria-hidden="true"
    >
      <DotGrid
        dotSize={1.5}
        gap={32}
        baseColor={isDarkMode ? "#475569" : "#94a3b8"}
        activeColor={isDarkMode ? "#fde047" : "#1d4ed8"}
        proximity={100}
        strength={0}
        bounce={0}
        tension={0}
        returnDuration={0.4}
        shockRadius={0}
        shockStrength={0}
        swell={0}
        stretch={0}
        glow={0.15}
        clickShock={false}
        fade={0.35}
        opacity={isDarkMode ? 0.45 : 0.4}
        className="w-full h-full"
        style={{ width: "100%", height: "100%" }}
      />
    </div>
  );
}

export default AppBackground;
