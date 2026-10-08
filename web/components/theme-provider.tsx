"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

export type Theme = "lemmas-dark" | "lemmas-light";

interface ThemeContextType {
  theme: Theme;
  isLight: boolean;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("lemmas-dark");

  useEffect(() => {
    // Lê tema persistido no localStorage
    const saved = localStorage.getItem("lemmas-theme") as Theme | null;
    if (saved === "lemmas-light" || saved === "lemmas-dark") {
      setThemeState(saved);
      applyTheme(saved);
    } else {
      // Default cenográfico: Lousa de Giz Clássica (Dark)
      applyTheme("lemmas-dark");
    }
  }, []);

  const applyTheme = (t: Theme) => {
    document.documentElement.dataset.theme = t;
    if (t === "lemmas-light") {
      document.documentElement.classList.remove("dark");
      document.documentElement.style.colorScheme = "light";
    } else {
      document.documentElement.classList.add("dark");
      document.documentElement.style.colorScheme = "dark";
    }
  };

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem("lemmas-theme", newTheme);
    applyTheme(newTheme);
  };

  const toggleTheme = () => {
    const next = theme === "lemmas-dark" ? "lemmas-light" : "lemmas-dark";
    setTheme(next);
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        isLight: theme === "lemmas-light",
        toggleTheme,
        setTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    // Retorno seguro caso chamado fora de provider em SSR
    return {
      theme: "lemmas-dark" as Theme,
      isLight: false,
      toggleTheme: () => {},
      setTheme: () => {},
    };
  }
  return context;
}
