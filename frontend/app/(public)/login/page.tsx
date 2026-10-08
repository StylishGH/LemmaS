"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { BoardFrame } from "../landing/components/BoardFrame";
import { Logo } from "../landing/components/Logo";
import { Signup } from "./components/Signup";
import "../landing/components/BoardFrame.css";
import "../landing/components/Logo.css";
import "../landing/components/LandingPage.css"; // For theme toggle buttons and global styles

export default function LoginPage() {
  const [light, setLight] = useState(false);
  
  useEffect(() => {
    document.documentElement.dataset.theme = light ? "lemmas-light" : "lemmas-dark";
    document.documentElement.style.colorScheme = light ? "light" : "dark";
  }, [light]);

  return (
    <BoardFrame>
      <div className="lemmas-page">
        <nav className="lemmas-nav">
          <Logo compact />
          <button 
            type="button" 
            className="lemmas-theme-toggle" 
            onClick={() => setLight(v => !v)} 
            aria-label={light ? "Ativar quadro negro" : "Ativar quadro branco"}
            style={{ marginLeft: 'auto' }}
          >
            {light ? <Moon size={17}/> : <Sun size={17}/>}
          </button>
        </nav>

        <div style={{ padding: '40px 0' }}>
          <Signup />
        </div>
      </div>
    </BoardFrame>
  );
}
