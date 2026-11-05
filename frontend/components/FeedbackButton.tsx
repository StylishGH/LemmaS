"use client";

import { useState } from "react";
import { MessageSquare } from "lucide-react";
import FeedbackModal from "@/components/FeedbackModal";
import { useUserProfile } from "@/lib/use-user";

export default function FeedbackButton() {
  const { isAuthenticated, loading } = useUserProfile();
  const [isOpen, setIsOpen] = useState(false);

  if (loading || !isAuthenticated) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label="Enviar feedback"
        className="fixed bottom-5 right-5 z-40 inline-flex items-center gap-2 rounded-full border border-blue-700 bg-blue-600 px-4 py-3 text-sm font-bold text-white shadow-lg transition hover:scale-[1.03] hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 dark:border-amber-300/40 dark:bg-[#272115] dark:text-amber-200 dark:hover:bg-[#3b301a] sm:bottom-6 sm:right-6"
      >
        <MessageSquare className="h-4 w-4" />
        Feedback
      </button>
      {isOpen && (
        <FeedbackModal
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          origem="botao_flutuante"
        />
      )}
    </>
  );
}
