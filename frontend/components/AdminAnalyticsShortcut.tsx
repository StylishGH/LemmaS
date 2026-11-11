"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Activity, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase";

export function AdminAnalyticsShortcut() {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const checkAccess = async () => {
      try {
        const { data, error } = await createClient().rpc("is_analytics_admin");
        if (!cancelled) setIsAdmin(!error && data === true);
      } catch {
        if (!cancelled) setIsAdmin(false);
      }
    };

    void checkAccess();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!isAdmin) return null;

  return (
    <div className="flex justify-end">
      <Link
        href="/admin/analytics"
        className="group inline-flex items-center gap-3 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-emerald-950 shadow-sm transition hover:border-emerald-500 hover:bg-emerald-100 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100 dark:hover:border-emerald-700 dark:hover:bg-emerald-950/70"
      >
        <Activity className="h-5 w-5 shrink-0 text-emerald-700 dark:text-emerald-400" aria-hidden="true" />
        <span className="text-left">
          <span className="block text-sm font-semibold">Ver atividade dos estudantes</span>
          <span className="block text-xs text-emerald-800/75 dark:text-emerald-200/75">Acesso administrativo pessoal</span>
        </span>
        <ArrowRight className="h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
      </Link>
    </div>
  );
}
