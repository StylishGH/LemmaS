"use client";

import { useEffect, useState } from "react";
import { useUserProfile } from "@/lib/use-user";
import FeedbackModal from "@/components/FeedbackModal";

const STORAGE_KEY = "lemmas_feedback_popup_visto";
const DELAY_MS = 30 * 60 * 1000;

export default function FeedbackPopup() {
  const { isAuthenticated, loading } = useUserProfile();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (loading || !isAuthenticated) return;

    try {
      if (window.localStorage.getItem(STORAGE_KEY)) return;
    } catch (error: unknown) {
      console.error("Não foi possível verificar se o popup de feedback já foi exibido:", error);
      return;
    }

    const timer = window.setTimeout(() => {
      try {
        window.localStorage.setItem(STORAGE_KEY, "true");
      } catch (error: unknown) {
        console.error("Não foi possível salvar a exibição do popup de feedback:", error);
      }
      setIsOpen(true);
    }, DELAY_MS);

    return () => window.clearTimeout(timer);
  }, [isAuthenticated, loading]);

  if (!isOpen) return null;

  return (
    <FeedbackModal
      isOpen={isOpen}
      onClose={() => setIsOpen(false)}
      origem="popup_primeiro_uso"
    />
  );
}
