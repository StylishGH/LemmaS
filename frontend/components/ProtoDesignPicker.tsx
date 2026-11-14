"use client";

import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

interface VariantOption {
  id: "original" | "editorial" | "glass" | "studio";
  label: string;
}

const VARIANTS: VariantOption[] = [
  { id: "original", label: "Original" },
  { id: "editorial", label: "Editorial" },
  { id: "glass", label: "Linear Glass" },
  { id: "studio", label: "Focus Studio" },
];

const DEFAULT_VARIANT_INDEX = 2; // Linear Glass active by default

export function ProtoDesignPicker() {
  const pickerRef = useRef<HTMLElement | null>(null);
  const highlightRef = useRef<HTMLSpanElement | null>(null);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const [activeIndex, setActiveIndex] = useState<number>(DEFAULT_VARIANT_INDEX);
  const [ready, setReady] = useState<boolean>(false);

  const replayAnimations = useCallback(() => {
    const root = document.documentElement;
    root.setAttribute("data-proto-replay", "1");
    void root.offsetWidth;
    root.removeAttribute("data-proto-replay");
    const targets = document.querySelectorAll(
      ".animate-fadeIn, .lemmas-mode-view-enter, .lemmas-popover-enter, .lemmas-stagger-group > *, .lemmas-kpi-grid > *, .lemmas-hero-copy > *"
    );
    targets.forEach((el) => {
      if (typeof el.getAnimations !== "function") return;
      el.getAnimations().forEach((anim) => {
        try {
          anim.cancel();
          anim.play();
        } catch {
          // Ignore finished/detached animations
        }
      });
    });
  }, []);

  const moveHighlight = useCallback((idx: number) => {
    const el = itemRefs.current[idx];
    const highlight = highlightRef.current;
    if (!el || !highlight) return;
    highlight.style.width = `${el.offsetWidth}px`;
    highlight.style.transform = `translateX(${el.offsetLeft}px)`;
  }, []);

  const applyVariant = useCallback(
    (idx: number, syncUrl = true) => {
      if (idx < 0 || idx >= VARIANTS.length) return;
      const variant = VARIANTS[idx];
      document.documentElement.setAttribute("data-design-variant", variant.id);
      if (syncUrl && typeof window !== "undefined") {
        const url = new URL(window.location.href);
        url.searchParams.set("v", String(idx + 1));
        window.history.replaceState(null, "", url.toString());
      }
    },
    []
  );

  // Initialize from ?v= URL param on mount and enable highlight transition after first paint
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const requested = Number.parseInt(params.get("v") || "", 10);
    const initial =
      requested >= 1 && requested <= VARIANTS.length ? requested - 1 : DEFAULT_VARIANT_INDEX;
    setActiveIndex(initial);
    applyVariant(initial, false);

    let raf2 = 0;
    const raf1 = window.requestAnimationFrame(() => {
      raf2 = window.requestAnimationFrame(() => {
        setReady(true);
      });
    });
    return () => {
      window.cancelAnimationFrame(raf1);
      window.cancelAnimationFrame(raf2);
    };
  }, [applyVariant]);

  useLayoutEffect(() => {
    moveHighlight(activeIndex);
  }, [activeIndex, moveHighlight]);

  useEffect(() => {
    const onResize = () => moveHighlight(activeIndex);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [activeIndex, moveHighlight]);

  const handleSelect = useCallback(
    (idx: number) => {
      if (idx < 0 || idx >= VARIANTS.length) return;
      setActiveIndex(idx);
      applyVariant(idx, true);
      window.requestAnimationFrame(() => replayAnimations());
    },
    [applyVariant, replayAnimations]
  );

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (/^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName) || target.isContentEditable)
      ) {
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      const num = Number.parseInt(e.key, 10);
      if (num >= 1 && num <= VARIANTS.length) {
        handleSelect(num - 1);
      } else if (e.key === "ArrowRight") {
        handleSelect((activeIndex + 1) % VARIANTS.length);
      } else if (e.key === "ArrowLeft") {
        handleSelect((activeIndex - 1 + VARIANTS.length) % VARIANTS.length);
      } else if (e.key === "r" || e.key === "R") {
        replayAnimations();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [activeIndex, handleSelect, replayAnimations]);

  return (
    <nav
      ref={pickerRef}
      className="proto-picker"
      aria-label="Prototype variants"
      data-ready={ready ? "" : undefined}
    >
      <span ref={highlightRef} className="proto-picker-highlight" aria-hidden="true" />
      {VARIANTS.map((variant, idx) => {
        const isActive = idx === activeIndex;
        return (
          <button
            key={variant.id}
            ref={(el) => {
              itemRefs.current[idx] = el;
            }}
            type="button"
            className="proto-picker-item"
            data-active={isActive ? "" : undefined}
            aria-current={isActive ? "true" : undefined}
            onClick={() => handleSelect(idx)}
          >
            {idx + 1} · {variant.label}
          </button>
        );
      })}
      <span className="proto-picker-divider" aria-hidden="true" />
      <button
        type="button"
        className="proto-picker-item proto-picker-replay"
        aria-label="Replay animation (R)"
        title="Replay animation (R)"
        onClick={replayAnimations}
      >
        ↻
      </button>
    </nav>
  );
}
