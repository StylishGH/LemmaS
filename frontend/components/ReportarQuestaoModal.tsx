"use client";

import React, { useState } from "react";
import { X, Flag, CheckCircle2, Loader2, AlertCircle } from "lucide-react";

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

const MOTIVOS: { id: MotivoReport; label: string; icon: string; desc: string }[] = [
  {
    id: "erro_digitacao",
    label: "Erro de Digitação / LaTeX",
    icon: "✍️",
    desc: "Fórmula cortada, erro ortográfico ou formatação confusa",
  },
  {
    id: "problema_imagem",
    label: "Problema na Imagem / Figura",
    icon: "🖼️",
    desc: "Figura não carrega, está cortada ou de baixa resolução",
  },
  {
    id: "gabarito_incorreto",
    label: "Gabarito Divergente",
    icon: "🎯",
    desc: "A alternativa oficial indicada difere da banca oficial",
  },
  {
    id: "enunciado_incompleto",
    label: "Enunciado / Alternativas Incompletas",
    icon: "⚠️",
    desc: "Faltam alternativas, texto ou dados necessários para resolver",
  },
  {
    id: "outro",
    label: "Outro Problema / Sugestão",
    icon: "💬",
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

  if (!isOpen || !questaoId) return null;

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
    } catch (err: any) {
      setErroMsg(err.message || "Falha na conexão ao enviar o relato.");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
      <div className="max-w-lg w-full bg-white dark:bg-[#141222] border border-slate-200 dark:border-amber-500/25 rounded-2xl shadow-2xl p-6 relative text-slate-800 dark:text-[#f5f0df] space-y-5">
        {/* BOTÃO FECHAR */}
        <button
          onClick={onClose}
          disabled={enviando}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition disabled:opacity-50"
          aria-label="Fechar"
        >
          <X className="w-5 h-5" />
        </button>

        {/* CABEÇALHO */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-600 dark:text-[#d9b452] flex items-center justify-center shrink-0">
            <Flag className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-serif-math text-lg font-bold text-slate-900 dark:text-[#f5f0df]">
              Reportar Inconsistência
            </h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400">
              Questão Lema #{questaoId.toString().padStart(3, "0")} · Ajude a manter o acervo impecável
            </p>
          </div>
        </div>

        {sucesso ? (
          <div className="py-8 text-center space-y-3 animate-fadeIn">
            <div className="w-12 h-12 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h4 className="font-bold text-sm text-slate-900 dark:text-[#f5f0df]">
              Relato Enviado com Sucesso!
            </h4>
            <p className="text-xs text-slate-500 dark:text-zinc-400 max-w-xs mx-auto">
              Obrigado pela contribuição! Nossa curadoria matemática analisará a correção.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* MOTIVOS SELECIONÁVEIS */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 block">
                Selecione o tipo de inconsistência:
              </label>
              <div className="space-y-1.5">
                {MOTIVOS.map((m) => {
                  const isSelected = motivo === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setMotivo(m.id)}
                      className={`w-full text-left p-2.5 rounded-xl border flex items-center gap-3 transition-all ${
                        isSelected
                          ? "bg-amber-500/15 border-amber-500/80 text-amber-900 dark:text-[#f5f0df] shadow-xs"
                          : "bg-slate-50/50 dark:bg-[#18152a] border-slate-200/80 dark:border-amber-500/10 text-slate-600 dark:text-zinc-400 hover:border-amber-500/30"
                      }`}
                    >
                      <span className="text-base shrink-0">{m.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold">{m.label}</div>
                        <div className="text-[10px] text-slate-400 dark:text-zinc-500 truncate">
                          {m.desc}
                        </div>
                      </div>
                      <div
                        className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 ${
                          isSelected
                            ? "border-amber-600 bg-amber-600 dark:border-[#d9b452] dark:bg-[#d9b452]"
                            : "border-slate-300 dark:border-zinc-700"
                        }`}
                      >
                        {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white dark:bg-black" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* DETALHES / DESCRIÇÃO */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 flex items-center justify-between">
                <span>Detalhes adicionais (opcional):</span>
                <span className="text-[10px] font-normal text-slate-400">
                  {descricao.length}/500
                </span>
              </label>
              <textarea
                value={descricao}
                onChange={(e) => setDescricao(e.target.value.slice(0, 500))}
                rows={3}
                placeholder="Ex: No terceiro parágrafo o expoente deveria ser x² em vez de 2x; a imagem está com resolução muito baixa..."
                className="w-full p-2.5 text-xs rounded-xl bg-slate-50 dark:bg-[#18152a] border border-slate-200 dark:border-amber-500/15 text-slate-900 dark:text-[#f5f0df] placeholder-slate-400 focus:outline-hidden focus:border-amber-500 transition-colors"
              />
            </div>

            {/* MENSAGEM DE ERRO SE HOUVER */}
            {erroMsg && (
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-700 dark:text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{erroMsg}</span>
              </div>
            )}

            {/* BOTÕES DE AÇÃO */}
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-zinc-800">
              <button
                type="button"
                onClick={onClose}
                disabled={enviando}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800 transition disabled:opacity-50"
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
    </div>
  );
}
