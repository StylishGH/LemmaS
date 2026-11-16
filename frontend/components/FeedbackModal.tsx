"use client";

import { useEffect, useState, type FormEvent } from "react";
import { AlertCircle, CheckCircle2, Loader2, MessageSquare, Star, X } from "lucide-react";
import { useUserProfile } from "@/lib/use-user";

export type FeedbackOrigem = "botao_flutuante" | "popup_primeiro_uso";

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  origem: FeedbackOrigem;
}

export default function FeedbackModal({ isOpen, onClose, origem }: FeedbackModalProps) {
  const { profile } = useUserProfile();
  const [nota, setNota] = useState<number | null>(null);
  const [comentario, setComentario] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [sucesso, setSucesso] = useState(false);
  const [erroMsg, setErroMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !enviando) onClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [enviando, isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setEnviando(true);
    setErroMsg(null);

    const alunoId = profile.isGuest ? null : Number(profile.id);
    const validAlunoId = alunoId !== null && Number.isInteger(alunoId) ? alunoId : null;

    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          aluno_id: validAlunoId,
          tipo: "sugestao",
          comentario: comentario.trim() || null,
          metadados: {
            origem,
            ...(nota !== null ? { nota } : {}),
          },
        }),
      });

      const data: { error?: string } = await response.json();
      if (!response.ok || data.error) {
        throw new Error(data.error || "Não foi possível registrar seu feedback.");
      }

      setSucesso(true);
    } catch (error: unknown) {
      setErroMsg(error instanceof Error ? error.message : "Falha na conexão ao enviar o feedback.");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/75 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !enviando) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="feedback-modal-title"
        className="relative w-full max-w-lg space-y-5 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-6 text-[var(--ink-primary)] shadow-2xl"
      >
        <button
          type="button"
          onClick={onClose}
          disabled={enviando}
          aria-label="Fechar feedback"
          className="absolute right-4 top-4 rounded-lg p-1.5 text-[var(--ink-muted)] transition-colors hover:bg-[var(--bg-elevated)] hover:text-[var(--ink-primary)] disabled:opacity-50"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--marker-blue-border)] bg-[var(--marker-blue-dim)] text-[var(--marker-blue)] dark:border-[var(--marker-amber-border)] dark:bg-[var(--marker-amber-dim)] dark:text-[var(--marker-amber)]">
            <MessageSquare className="h-5 w-5" />
          </div>
          <div>
            <h2 id="feedback-modal-title" className="font-serif-math text-lg font-bold text-[var(--ink-primary)]">
              Como está sendo sua experiência?
            </h2>
            <p className="text-xs text-[var(--ink-muted)]">
              Sua opinião ajuda a melhorar o LEMMAS.
            </p>
          </div>
        </div>

        {sucesso ? (
          <div className="space-y-3 py-8 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-[var(--marker-green-border)] bg-[var(--marker-green-dim)] text-[var(--marker-green)]">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-bold text-[var(--ink-primary)]">Feedback enviado. Obrigado!</h3>
            <p className="text-xs text-[var(--ink-secondary)]">Sua contribuição ajuda a melhorar a plataforma.</p>
            <button type="button" onClick={onClose} className="lemmas-gold-cta rounded-xl px-5 py-2 text-xs font-bold">
              Fechar
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <fieldset className="space-y-2">
              <legend className="text-xs font-bold text-[var(--ink-secondary)]">
                Avaliação (opcional)
              </legend>
              <div className="flex items-center gap-1" role="group" aria-label="Nota de 1 a 5">
                {[1, 2, 3, 4, 5].map((valor) => (
                  <button
                    key={valor}
                    type="button"
                    aria-label={`${valor} ${valor === 1 ? "estrela" : "estrelas"}`}
                    aria-pressed={nota === valor}
                    onClick={() => setNota(nota === valor ? null : valor)}
                    className="rounded-md p-1 text-[var(--marker-amber)] transition-transform hover:scale-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--marker-blue)]"
                  >
                    <Star className={`h-7 w-7 ${nota !== null && valor <= nota ? "fill-current" : ""}`} />
                  </button>
                ))}
                <span className="ml-2 text-xs text-[var(--ink-muted)] font-mono tabular-nums">
                  {nota ? `${nota} de 5` : "Escolha uma nota"}
                </span>
              </div>
            </fieldset>

            <div className="space-y-1.5">
              <label htmlFor="feedback-comentario" className="text-xs font-bold text-[var(--ink-secondary)]">
                Comentário (opcional)
              </label>
              <textarea
                id="feedback-comentario"
                value={comentario}
                onChange={(event) => setComentario(event.target.value.slice(0, 500))}
                rows={4}
                maxLength={500}
                placeholder="Conte o que está funcionando bem ou o que podemos melhorar..."
                className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-3 text-sm text-[var(--ink-primary)] placeholder:text-[var(--ink-muted)] focus:border-[var(--marker-blue)] focus:outline-hidden dark:focus:border-[var(--marker-amber)]"
              />
              <p className="text-right text-[10px] text-[var(--ink-muted)] font-mono tabular-nums">{comentario.length}/500</p>
            </div>

            {erroMsg && (
              <div role="alert" className="flex items-center gap-2 rounded-xl border border-[var(--marker-red-border)] bg-[var(--marker-red-dim)] p-2.5 text-xs text-[var(--marker-red)]">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{erroMsg}</span>
              </div>
            )}

            <div className="flex justify-end gap-2.5 border-t border-[var(--border-subtle)] pt-4">
              <button
                type="button"
                onClick={onClose}
                disabled={enviando}
                className="rounded-xl px-4 py-2 text-xs font-semibold text-[var(--ink-secondary)] transition-colors hover:bg-[var(--bg-elevated)] disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={enviando || (nota === null && !comentario.trim())}
                className="lemmas-gold-cta flex items-center gap-1.5 rounded-xl px-5 py-2 text-xs font-bold shadow-md disabled:opacity-50"
              >
                {enviando ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  "Enviar feedback"
                )}
              </button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}
