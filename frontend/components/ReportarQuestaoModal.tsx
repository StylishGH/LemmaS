"use client";

import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Flag,
  CheckCircle2,
  Loader2,
  AlertCircle,
  PencilLine,
  ImageOff,
  Target,
  AlertTriangle,
  MessageSquare,
} from "lucide-react";

export type MotivoReport =
  | "erro_digitacao"
  | "problema_imagem"
  | "gabarito_incorreto"
  | "enunciado_incompleto"
  | "outro";

interface ReportarQuestaoModalProps {
  isOpen: boolean;
  onClose: () => void;
  questaoId: number | null;
  origem?: "questoes" | "resolver";
}

const MOTIVOS: {
  id: MotivoReport;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
  desc: string;
}[] = [
  {
    id: "erro_digitacao",
    label: "Erro de Digitação / LaTeX",
    Icon: PencilLine,
    desc: "Fórmula cortada, erro ortográfico ou formatação confusa",
  },
  {
    id: "problema_imagem",
    label: "Problema na Imagem / Figura",
    Icon: ImageOff,
    desc: "Figura não carrega, está cortada ou de baixa resolução",
  },
  {
    id: "gabarito_incorreto",
    label: "Gabarito Divergente",
    Icon: Target,
    desc: "A alternativa oficial indicada difere da banca oficial",
  },
  {
    id: "enunciado_incompleto",
    label: "Enunciado / Alternativas Incompletas",
    Icon: AlertTriangle,
    desc: "Faltam alternativas, texto ou dados necessários para resolver",
  },
  {
    id: "outro",
    label: "Outro Problema / Sugestão",
    Icon: MessageSquare,
    desc: "Outro detalhe relevante para a curadoria da MathAI Engine",
  },
];

export default function ReportarQuestaoModal({
  isOpen,
  onClose,
  questaoId,
  origem = "questoes",
}: ReportarQuestaoModalProps) {
  const [motivo, setMotivo] = useState<MotivoReport>("erro_digitacao");
  const [descricao, setDescricao] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [sucesso, setSucesso] = useState(false);
  const [erroMsg, setErroMsg] = useState<string | null>(null);

  const [mounted, setMounted] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const isDialogOpen = mounted && isOpen && Boolean(questaoId);

  // The portal must wait for hydration before accessing document.body.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    // Register keyboard dismissal only while the dialog can be closed.
    if (!isOpen || !questaoId || enviando) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, questaoId, enviando, onClose]);

  useEffect(() => {
    // Move initial focus into the dialog and restore trigger focus on close/unmount.
    if (!isDialogOpen) return;

    const previousActiveElement = document.activeElement as HTMLElement | null;
    dialogRef.current?.focus({ preventScroll: true });

    return () => {
      if (
        previousActiveElement &&
        previousActiveElement.isConnected &&
        typeof previousActiveElement.focus === "function"
      ) {
        previousActiveElement.focus({ preventScroll: true });
      }
    };
  }, [isDialogOpen]);

  if (!mounted || !isOpen || !questaoId) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEnviando(true);
    setErroMsg(null);

    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questao_id: questaoId,
          tipo: "report_erro",
          comentario: `[${motivo.toUpperCase()}] ${descricao.trim() || "Sem descrição adicional."}`,
          metadados: {
            motivo,
            descricao: descricao.trim(),
            origem,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Erro ao registrar o relato.");
      }

      setSucesso(true);
      setTimeout(() => {
        setSucesso(false);
        setDescricao("");
        setMotivo("erro_digitacao");
        onClose();
      }, 1600);
    } catch (err: unknown) {
      setErroMsg(err instanceof Error ? err.message : "Falha na conexão ao enviar o relato.");
    } finally {
      setEnviando(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[100] bg-black/75 flex items-start sm:items-center justify-center p-4 py-6 overflow-y-auto animate-fadeIn"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !enviando) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="reportar-questao-modal-title"
        tabIndex={-1}
        className="max-w-lg w-full my-auto bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl shadow-2xl p-6 relative text-[var(--ink-primary)] space-y-5 outline-none"
      >
        {/* BOTÃO FECHAR */}
        <button
          type="button"
          onClick={onClose}
          disabled={enviando}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-[var(--ink-muted)] hover:text-[var(--ink-primary)] hover:bg-[var(--bg-elevated)] transition-colors disabled:opacity-50"
          aria-label="Fechar"
        >
          <X className="w-5 h-5" />
        </button>

        {/* CABEÇALHO */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[var(--marker-blue-dim)] border border-[var(--marker-blue-border)] text-[var(--marker-blue)] dark:bg-[var(--marker-amber-dim)] dark:border-[var(--marker-amber-border)] dark:text-[var(--marker-amber)] flex items-center justify-center shrink-0">
            <Flag className="w-5 h-5" />
          </div>
          <div>
            <h3
              id="reportar-questao-modal-title"
              className="font-serif-math text-lg font-bold text-[var(--ink-primary)]"
            >
              Reportar Inconsistência
            </h3>
            <p className="text-xs text-[var(--ink-muted)]">
              Questão Lema #{questaoId.toString().padStart(3, "0")} · Ajude a manter o acervo impecável
            </p>
          </div>
        </div>

        {sucesso ? (
          <div className="py-8 text-center space-y-3 animate-fadeIn">
            <div className="w-12 h-12 rounded-full bg-[var(--marker-green-dim)] border border-[var(--marker-green-border)] text-[var(--marker-green)] flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h4 className="font-bold text-sm text-[var(--ink-primary)]">
              Relato Enviado com Sucesso!
            </h4>
            <p className="text-xs text-[var(--ink-secondary)] max-w-xs mx-auto">
              Obrigado pela contribuição! Nossa curadoria matemática analisará a correção.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* MOTIVOS SELECIONÁVEIS */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-[var(--ink-secondary)] block">
                Selecione o tipo de inconsistência:
              </label>
              <div className="space-y-1.5">
                {MOTIVOS.map((m) => {
                  const isSelected = motivo === m.id;
                  const IconComponent = m.Icon;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setMotivo(m.id)}
                      className={`w-full text-left p-2.5 rounded-xl border flex items-center gap-3 transition-colors ${
                        isSelected
                          ? "bg-[var(--marker-blue-dim)] border-[var(--marker-blue)] text-[var(--ink-primary)] dark:bg-[var(--marker-amber-dim)] dark:border-[var(--marker-amber)] shadow-xs"
                          : "bg-[var(--bg-elevated)] border-[var(--border-subtle)] text-[var(--ink-secondary)] hover:border-[var(--border-default)]"
                      }`}
                    >
                      <span className="w-8 h-8 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] flex items-center justify-center shrink-0">
                        <IconComponent className={`w-4 h-4 ${isSelected ? "text-[var(--marker-blue)] dark:text-[var(--marker-amber)]" : "text-[var(--ink-muted)]"}`} />
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold text-[var(--ink-primary)]">{m.label}</div>
                        <div className="text-[10px] text-[var(--ink-muted)] truncate">
                          {m.desc}
                        </div>
                      </div>
                      <div
                        className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 ${
                          isSelected
                            ? "border-[var(--marker-blue)] bg-[var(--marker-blue)] dark:border-[var(--marker-amber)] dark:bg-[var(--marker-amber)]"
                            : "border-[var(--border-default)]"
                        }`}
                      >
                        {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white dark:bg-[#101316]" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* DETALHES / DESCRIÇÃO */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[var(--ink-secondary)] flex items-center justify-between">
                <span>Detalhes adicionais (opcional):</span>
                <span className="text-[10px] font-normal text-[var(--ink-muted)] font-mono tabular-nums">
                  {descricao.length}/500
                </span>
              </label>
              <textarea
                value={descricao}
                onChange={(e) => setDescricao(e.target.value.slice(0, 500))}
                rows={3}
                placeholder="Ex: No terceiro parágrafo o expoente deveria ser x² em vez de 2x; a imagem está com resolução muito baixa..."
                className="w-full p-2.5 text-xs rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-[var(--ink-primary)] placeholder:text-[var(--ink-muted)] focus:outline-hidden focus:border-[var(--marker-blue)] dark:focus:border-[var(--marker-amber)] transition-colors"
              />
            </div>

            {/* MENSAGEM DE ERRO SE HOUVER */}
            {erroMsg && (
              <div className="p-2.5 rounded-xl bg-[var(--marker-red-dim)] border border-[var(--marker-red-border)] text-[var(--marker-red)] text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{erroMsg}</span>
              </div>
            )}

            {/* BOTÕES DE AÇÃO */}
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[var(--border-subtle)]">
              <button
                type="button"
                onClick={onClose}
                disabled={enviando}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-[var(--ink-secondary)] hover:bg-[var(--bg-elevated)] transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={enviando}
                className="lemmas-gold-cta px-5 py-2 rounded-xl text-xs font-bold shadow-md flex items-center gap-1.5 disabled:opacity-50"
              >
                {enviando ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Enviando Relato...</span>
                  </>
                ) : (
                  <>
                    <Flag className="w-3.5 h-3.5" />
                    <span>Enviar Relato</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>,
    document.body
  );
}
