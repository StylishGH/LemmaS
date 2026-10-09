"use client";

import React, { useState } from "react";
import Link from "next/link";

interface LegalConsentCheckboxProps {
  onConsentChange?: (accepted: boolean) => void;
  defaultChecked?: boolean;
}

export const LegalConsentCheckbox = ({
  onConsentChange,
  defaultChecked = false,
}: LegalConsentCheckboxProps) => {
  const [accepted, setAccepted] = useState(defaultChecked);

  const handleToggle = () => {
    const nextValue = !accepted;
    setAccepted(nextValue);
    if (onConsentChange) {
      onConsentChange(nextValue);
    }
  };

  return (
    <div className="flex items-start gap-2.5 text-xs text-stone-600 dark:text-stone-400 mt-3 select-none">
      <input
        type="checkbox"
        id="legal-consent"
        checked={accepted}
        onChange={handleToggle}
        className="mt-0.5 h-4 w-4 rounded border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-amber-500 focus:ring-amber-500/20 cursor-pointer"
        required
      />
      <label htmlFor="legal-consent" className="cursor-pointer leading-relaxed">
        Li e concordo com os{" "}
        <Link
          href="/termos"
          target="_blank"
          rel="noreferrer"
          className="text-amber-600 dark:text-amber-400 font-semibold underline hover:text-amber-500"
        >
          Termos de Serviço
        </Link>{" "}
        e com a{" "}
        <Link
          href="/privacidade"
          target="_blank"
          rel="noreferrer"
          className="text-amber-600 dark:text-amber-400 font-semibold underline hover:text-amber-500"
        >
          Política de Privacidade
        </Link>{" "}
        do LEMMAS.
      </label>
    </div>
  );
};
