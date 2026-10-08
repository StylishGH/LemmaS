"use client";

import React, { useEffect, useRef } from "react";
import { useTheme } from "@/components/theme-provider";
import "./BackgroundAnimation.css";

interface WaveConfig {
  frequency: number;
  amplitude: number;
  speed: number;
  color: string;
  lineWidth: number;
  yOffsetRatio: number;
}

export function BackgroundAnimation() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { isLight } = useTheme();
  const mouseRef = useRef({ x: -1000, y: -1000, active: false });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let time = 0;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resize();
    window.addEventListener("resize", resize);

    const onMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY, active: true };
    };

    const onMouseLeave = () => {
      mouseRef.current.active = false;
    };

    window.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseleave", onMouseLeave);

    const render = () => {
      time += 0.008;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const width = canvas.width;
      const height = canvas.height;

      // Ondas Harmônicas (Curvas de Fourier / Superfícies de Nível)
      const waves: WaveConfig[] = isLight
        ? [
            {
              frequency: 0.0022,
              amplitude: 45,
              speed: 1.1,
              color: "rgba(45, 109, 161, 0.22)",
              lineWidth: 1.8,
              yOffsetRatio: 0.58,
            },
            {
              frequency: 0.0035,
              amplitude: 32,
              speed: 0.8,
              color: "rgba(14, 165, 233, 0.18)",
              lineWidth: 1.4,
              yOffsetRatio: 0.65,
            },
            {
              frequency: 0.0018,
              amplitude: 55,
              speed: 1.4,
              color: "rgba(30, 58, 138, 0.15)",
              lineWidth: 2.0,
              yOffsetRatio: 0.75,
            },
            {
              frequency: 0.0045,
              amplitude: 25,
              speed: 0.6,
              color: "rgba(56, 189, 248, 0.25)",
              lineWidth: 1.2,
              yOffsetRatio: 0.82,
            },
          ]
        : [
            {
              frequency: 0.0018,
              amplitude: 52,
              speed: 1.0,
              color: "rgba(124, 58, 237, 0.35)",
              lineWidth: 2.0,
              yOffsetRatio: 0.55,
            },
            {
              frequency: 0.003,
              amplitude: 40,
              speed: 0.7,
              color: "rgba(217, 180, 82, 0.28)",
              lineWidth: 1.5,
              yOffsetRatio: 0.65,
            },
            {
              frequency: 0.0015,
              amplitude: 65,
              speed: 1.3,
              color: "rgba(168, 85, 247, 0.22)",
              lineWidth: 1.8,
              yOffsetRatio: 0.75,
            },
            {
              frequency: 0.004,
              amplitude: 28,
              speed: 0.9,
              color: "rgba(245, 158, 11, 0.25)",
              lineWidth: 1.2,
              yOffsetRatio: 0.82,
            },
          ];

      waves.forEach((wave, idx) => {
        ctx.beginPath();
        const baseHeight = height * wave.yOffsetRatio;

        ctx.moveTo(0, baseHeight);

        const step = 8;
        for (let x = 0; x <= width + step; x += step) {
          // Fórmula harmônica com sobreposição de senos (ondas gravitacionais / acústicas)
          const harmonic1 = Math.sin(x * wave.frequency + time * wave.speed + idx);
          const harmonic2 = Math.cos(x * wave.frequency * 1.6 - time * wave.speed * 0.8);
          let y = baseHeight + (harmonic1 * 0.7 + harmonic2 * 0.3) * wave.amplitude;

          // Distorção interativa sutil próxima ao cursor
          if (mouseRef.current.active) {
            const dx = x - mouseRef.current.x;
            const dy = y - mouseRef.current.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 180) {
              const force = (1 - dist / 180) * 22;
              y += Math.sin(dist * 0.05 - time * 3) * force;
            }
          }

          ctx.lineTo(x, y);
        }

        ctx.strokeStyle = wave.color;
        ctx.lineWidth = wave.lineWidth;
        ctx.stroke();

        // Preenchimento gradiente suave na base
        ctx.lineTo(width, height);
        ctx.lineTo(0, height);
        ctx.closePath();

        const gradient = ctx.createLinearGradient(0, baseHeight - wave.amplitude, 0, height);
        if (isLight) {
          gradient.addColorStop(0, "rgba(226, 238, 248, 0.08)");
          gradient.addColorStop(1, "rgba(226, 238, 248, 0.25)");
        } else {
          gradient.addColorStop(0, "rgba(18, 14, 32, 0.03)");
          gradient.addColorStop(1, "rgba(12, 10, 20, 0.2)");
        }
        ctx.fillStyle = gradient;
        ctx.fill();
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseleave", onMouseLeave);
    };
  }, [isLight]);

  return (
    <div className="lemmas-formula-layer" aria-hidden="true">
      <canvas ref={canvasRef} className="lemmas-waves-canvas" />
      <div className="lemmas-board-vignette" />
    </div>
  );
}
