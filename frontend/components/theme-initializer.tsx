"use client";

import { useLayoutEffect } from "react";

export function ThemeInitializer() {
  useLayoutEffect(() => {
    try {
      const t = localStorage.getItem("lemmas-theme") || "lemmas-dark";
      document.documentElement.dataset.theme = t;
      if (t === "lemmas-light") {
        document.documentElement.classList.remove("dark");
        document.documentElement.style.colorScheme = "light";
      } else {
        document.documentElement.classList.add("dark");
        document.documentElement.style.colorScheme = "dark";
      }
    } catch (e) {
      // ignore
    }
  }, []);

  return null;
}