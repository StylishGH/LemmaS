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
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !enviando) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="feedback-modal-title"
        className="relative w-full max-w-lg space-y-5 rounded-2xl border border-slate-200 bg-white p-6 text-slate-800 shadow-2xl dark:border-amber-500/25 dark:bg-[#141222] dark:text-[#f5f0df]"
      >
        <button
          type="button"
          onClick={onClose}
          disabled={enviando}
          aria-label="Fechar feedback"
          className="absolute right-4 top-4 rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 disabled:opacity-50 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-blue-500/25 bg-blue-500/10 text-blue-600 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-[#d9b452]">
            <MessageSquare className="h-5 w-5" />
          </div>
          <div>
            <h2 id="feedback-modal-title" className="font-serif-math text-lg font-bold text-slate-900 dark:text-[#f5f0df]">
              Como está sendo sua experiência?
            </h2>
            <p className="text-xs text-slate-500 dark:text-zinc-400">
              Sua opinião ajuda a melhorar o LEMMAS.
            </p>
          </div>
        </div>

        {sucesso ? (
          <div className="space-y-3 py-8 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-[#f5f0df]">Feedback enviado. Obrigado!</h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400">Sua contribuição ajuda a melhorar a plataforma.</p>
            <button type="button" onClick={onClose} className="lemmas-gold-cta rounded-xl px-5 py-2 text-xs font-bold">
              Fechar
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <fieldset className="space-y-2">
              <legend className="text-xs font-bold text-slate-700 dark:text-zinc-300">
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
                    className="rounded-md p-1 text-amber-500 transition hover:scale-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
                  >
                    <Star className={`h-7 w-7 ${nota !== null && valor <= nota ? "fill-current" : ""}`} />
                  </button>
                ))}
                <span className="ml-2 text-xs text-slate-500 dark:text-zinc-400">
                  {nota ? `${nota} de 5` : "Escolha uma nota"}
                </span>
              </div>
            </fieldset>

            <div className="space-y-1.5">
              <label htmlFor="feedback-comentario" className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                Comentário (opcional)
              </label>
              <textarea
                id="feedback-comentario"
                value={comentario}
                onChange={(event) => setComentario(event.target.value.slice(0, 500))}
                rows={4}
                maxLength={500}
                placeholder="Conte o que está funcionando bem ou o que podemos melhorar..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-hidden dark:border-amber-500/15 dark:bg-[#18152a] dark:text-[#f5f0df] dark:focus:border-amber-500"
              />
              <p className="text-right text-[10px] text-slate-400">{comentario.length}/500</p>
            </div>

            {erroMsg && (
              <div role="alert" className="flex items-center gap-2 rounded-xl border border-rose-500/25 bg-rose-500/10 p-2.5 text-xs text-rose-700 dark:text-rose-400">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{erroMsg}</span>
              </div>
            )}

            <div className="flex justify-end gap-2.5 border-t border-slate-100 pt-4 dark:border-zinc-800">
              <button
                type="button"
                onClick={onClose}
                disabled={enviando}
                className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 disabled:opacity-50 dark:text-zinc-400 dark:hover:bg-zinc-800"
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
