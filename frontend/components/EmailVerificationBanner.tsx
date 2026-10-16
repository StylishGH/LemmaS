"use client";

import React, { useState, useEffect } from "react";
import { 
  AlertTriangle, 
  Mail, 
  RotateCcw, 
  CheckCircle2, 
  X, 
  ShieldAlert
} from "lucide-react";
import { useUserProfile } from "@/lib/use-user";

export default function EmailVerificationBanner() {
  const { 
    profile, 
    isAuthenticated, 
    refresh, 
    reenviarEmailVerificacao 
  } = useUserProfile();

  const [dismissed, setDismissed] = useState(false);
  const [loadingReenvio, setLoadingReenvio] = useState(false);
  const [loadingRefresh, setLoadingRefresh] = useState(false);
  const [mensagemSucesso, setMensagemSucesso] = useState<string | null>(null);
  const [mensagemErro, setMensagemErro] = useState<string | null>(null);

  // Checa sessionStorage para não insistir repetidamente na mesma sessão se dispensado
  useEffect(() => {
    if (typeof window !== "undefined") {
      const isDismissed = sessionStorage.getItem("lemmas_email_banner_dismissed");
      if (isDismissed === "true") {
        setDismissed(true);
      }
    }
  }, []);

  // Se não estiver autenticado, for visitante ou o email já estiver verificado, não renderiza
  if (!isAuthenticated || profile.isGuest || profile.emailVerificado || !profile.email || dismissed) {
    return null;
  }

  const handleDispensar = () => {
    setDismissed(true);
    if (typeof window !== "undefined") {
      sessionStorage.setItem("lemmas_email_banner_dismissed", "true");
    }
  };

  const handleReenviar = async () => {
    setMensagemErro(null);
    setMensagemSucesso(null);
    setLoadingReenvio(true);
    try {
      const res = await reenviarEmailVerificacao();
      if (res.success) {
        setMensagemSucesso("Link de ativação reenviado para " + profile.email + "! Basta clicar nele na sua caixa de entrada.");
      } else {
        setMensagemErro(res.error || "Não foi possível reenviar agora.");
      }
    } catch {
      setMensagemErro("Erro ao solicitar reenvio. Tente novamente em instantes.");
    } finally {
      setLoadingReenvio(false);
    }
  };

  const handleAtualizarStatus = async () => {
    setMensagemErro(null);
    setMensagemSucesso(null);
    setLoadingRefresh(true);
    try {
      await refresh();
      // O hook recalcula profile.emailVerificado e sincroniza verificado=1
      if (profile.emailVerificado) {
        setMensagemSucesso("E-mail verificado com sucesso! Conta 100% ativa.");
      } else {
        setMensagemErro("Ainda não detectamos a confirmação. Clique no link que enviamos para o seu e-mail.");
      }
    } catch {
      setMensagemErro("Falha ao checar status. Tente novamente.");
    } finally {
      setLoadingRefresh(false);
    }
  };

  return (
    <div className="w-full bg-amber-500/10 dark:bg-amber-950/30 border-b border-amber-500/30 text-slate-800 dark:text-[#f5f0df] px-4 py-2.5 transition-all text-xs z-30 relative animate-fadeIn">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
        
        {/* Lado Esquerdo: Mensagem de Alerta */}
        <div className="flex items-center gap-2.5 text-center md:text-left">
          <span className="p-1.5 rounded-lg bg-amber-500/20 text-amber-600 dark:text-[#d9b452] shrink-0">
            <ShieldAlert className="w-4 h-4" />
          </span>
          <div>
            <span className="font-bold text-amber-700 dark:text-[#d9b452]">Confirmação de e-mail pendente: </span>
            <span className="text-slate-600 dark:text-zinc-300">
              Enviamos um link para <strong>{profile.email}</strong>. Basta abrir seu e-mail e clicar no link para confirmar sua conta.
            </span>
          </div>
        </div>

        {/* Lado Direito: Ações Rápidas */}
        <div className="flex flex-wrap items-center justify-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleReenviar}
            disabled={loadingReenvio}
            className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-800 dark:text-[#d9b452] font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
            title="Reenviar link de confirmação para sua caixa de entrada"
          >
            <Mail className="w-3.5 h-3.5" />
            <span>{loadingReenvio ? "Reenviando..." : "Reenviar e-mail"}</span>
          </button>

          <button
            type="button"
            onClick={handleAtualizarStatus}
            disabled={loadingRefresh}
            className="px-3 py-1.5 rounded-lg bg-slate-200/80 hover:bg-slate-300/80 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-800 dark:text-zinc-200 font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
            title="Verificar se o link já foi clicado"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${loadingRefresh ? "animate-spin" : ""}`} />
            <span>Já cliquei no link</span>
          </button>

          <button
            type="button"
            onClick={handleDispensar}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 transition-colors cursor-pointer ml-1"
            title="Lembrar mais tarde nesta sessão"
            aria-label="Fechar aviso"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Feedback Rápido de Erro ou Sucesso */}
      {mensagemSucesso && (
        <div className="max-w-7xl mx-auto mt-2 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
          <span>{mensagemSucesso}</span>
        </div>
      )}
      {mensagemErro && (
        <div className="max-w-7xl mx-auto mt-2 text-[11px] font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-1">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          <span>{mensagemErro}</span>
        </div>
      )}
    </div>
  );
}
