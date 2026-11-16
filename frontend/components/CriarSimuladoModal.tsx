"use client";

import React, { useState, useId, useEffect, useRef } from "react";
import { 
  Clock, 
  Play, 
  X, 
  ShieldAlert, 
  Timer, 
  Calculator,
  AlertCircle
} from "lucide-react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";

const DEFAULT_QUESTION_COUNT = 20;

export interface SimuladoConfig {
  modo: "simulado";
  ids: number[];
  tempoTotalSegundos: number;
  tempoPorQuestaoSegundos?: number;
  nome?: string;
  totalQuestoes: number;
  simuladoId?: string;
}

interface CriarSimuladoModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedIds: number[];
  totalFiltradas: number;
  filtrosAtivosResumo?: string;
  onFetchFilteredIds?: () => Promise<number[]>;
}

export function CriarSimuladoModal({
  isOpen,
  onClose,
  selectedIds,
  totalFiltradas,
  filtrosAtivosResumo,
  onFetchFilteredIds,
}: CriarSimuladoModalProps) {
  const router = useRouter();
  const timeModeGroup = useId();

  // Modo de tempo: "por_questao" ou "total_fixo"
  const [tipoTempo, setTipoTempo] = useState<"por_questao" | "total_fixo">("por_questao");

  // Minutos e segundos por questão (padrão 1m 30s = 90s)
  const [minutosPorQuestao, setMinutosPorQuestao] = useState<number>(1);
  const [segundosPorQuestao, setSegundosPorQuestao] = useState<number>(30);

  // Tempo total direto em minutos (padrão 60 min)
  const [tempoTotalMinutos, setTempoTotalMinutos] = useState<number>(60);

  // Origem das questões: "selecionadas" ou "todas_filtradas"
  const [origemQuestoes, setOrigemQuestoes] = useState<"selecionadas" | "todas_filtradas">(
    selectedIds.length > 0 ? "selecionadas" : "todas_filtradas"
  );

  // Limite de questões (opcional, para não fazer 200 de uma vez)
  const [quantidadeDesejada, setQuantidadeDesejada] = useState<number>(
    selectedIds.length > 0 ? selectedIds.length : (totalFiltradas > 0 ? Math.min(DEFAULT_QUESTION_COUNT, totalFiltradas) : 0)
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [mounted, setMounted] = useState(false);
  const wasOpenRef = useRef(false);
  const hasSyncedInitialCountRef = useRef(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const isDialogOpen = mounted && isOpen;

  // The portal must wait for hydration before accessing document.body.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!isOpen) {
      wasOpenRef.current = false;
      hasSyncedInitialCountRef.current = false;
      return;
    }

    // Reopening or receiving the first non-zero total restores defaults without overwriting manual clearing to 0.
    const shouldSync = !wasOpenRef.current || (!hasSyncedInitialCountRef.current && totalFiltradas > 0);
    wasOpenRef.current = true;
    if (!shouldSync) return;

    if (selectedIds.length > 0 || totalFiltradas > 0) {
      hasSyncedInitialCountRef.current = true;
    }

    setOrigemQuestoes(selectedIds.length > 0 ? "selecionadas" : "todas_filtradas");
    setQuantidadeDesejada(selectedIds.length > 0
      ? selectedIds.length
      : (totalFiltradas > 0 ? Math.min(DEFAULT_QUESTION_COUNT, totalFiltradas) : 0));
  }, [isOpen, selectedIds.length, totalFiltradas]);

  useEffect(() => {
    // Register keyboard dismissal only while the dialog can be closed.
    if (!isOpen || loading) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, loading, onClose]);

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

  if (!mounted || !isOpen) return null;

  const totalEfetivoQuestoes = origemQuestoes === "selecionadas" 
    ? (selectedIds.length || 1) 
    : Math.min(quantidadeDesejada, totalFiltradas);

  // Cálculo do tempo total em segundos
  const segundosPorQuestaoTotal = (minutosPorQuestao * 60) + segundosPorQuestao;
  const tempoFinalSegundos = tipoTempo === "por_questao"
    ? totalEfetivoQuestoes * segundosPorQuestaoTotal
    : tempoTotalMinutos * 60;

  const horasFinais = Math.floor(tempoFinalSegundos / 3600);
  const minutosFinaisRestantes = Math.floor((tempoFinalSegundos % 3600) / 60);
  const segundosFinaisRestantes = tempoFinalSegundos % 60;

  const formatTempoCalculado = () => {
    const parts = [];
    if (horasFinais > 0) parts.push(`${horasFinais}h`);
    if (minutosFinaisRestantes > 0 || horasFinais === 0) parts.push(`${minutosFinaisRestantes}m`);
    if (segundosFinaisRestantes > 0) parts.push(`${segundosFinaisRestantes}s`);
    return parts.join(" ");
  };

  const handlePresetTempoQuestao = (m: number, s: number) => {
    setMinutosPorQuestao(m);
    setSegundosPorQuestao(s);
  };

  const handlePresetTempoTotal = (m: number) => {
    setTempoTotalMinutos(m);
  };

  const handleIniciarSimulado = async () => {
    setLoading(true);
    setError(null);

    try {
      let idsFinais: number[] = [];

      if (origemQuestoes === "selecionadas") {
        if (selectedIds.length === 0) {
          setError("Selecione ao menos 1 questão ou use as questões filtradas.");
          setLoading(false);
          return;
        }
        idsFinais = [...selectedIds];
      } else {
        if (onFetchFilteredIds) {
          const idsCarregados = await onFetchFilteredIds();
          idsFinais = idsCarregados.slice(0, quantidadeDesejada);
        } else {
          setError("Não foi possível carregar os IDs das questões filtradas.");
          setLoading(false);
          return;
        }
      }

      if (idsFinais.length === 0) {
        setError("Nenhuma questão encontrada para este simulado.");
        setLoading(false);
        return;
      }

      let data: { questions?: { id: number }[]; simuladoId?: string } = {};
      let res: Response | null = null;

      try {
        res = await fetch("/api/simulados/criar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ids: idsFinais,
            quantidade: idsFinais.length,
            comTempo: true,
            tempoTotalSegundos: Math.max(60, tempoFinalSegundos),
            tempoPorQuestaoSegundos: tipoTempo === "por_questao" ? segundosPorQuestaoTotal : undefined,
          }),
        });

        if (res.ok) {
          data = await res.json();
        }
      } catch (e) {
        console.warn("Aviso ao criar simulado via API:", e);
      }

      const simuladoIdFinal = data.simuladoId || crypto.randomUUID();
      const idsConfig = data.questions && data.questions.length > 0
        ? data.questions.map((q) => q.id)
        : idsFinais;

      const config: SimuladoConfig = {
        modo: "simulado",
        ids: idsConfig,
        tempoTotalSegundos: Math.max(60, tempoFinalSegundos),
        tempoPorQuestaoSegundos: tipoTempo === "por_questao" ? segundosPorQuestaoTotal : undefined,
        nome: `Simulado (${idsConfig.length} questões)`,
        totalQuestoes: idsConfig.length,
        simuladoId: simuladoIdFinal,
      };

      if (typeof window !== "undefined") {
        sessionStorage.setItem("lemmas_active_simulado", JSON.stringify(config));
      }

      onClose();
      router.push(`/resolver?session=simulado&total=${idsConfig.length}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao preparar simulado.";
      setError(msg);
      setLoading(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[100] bg-black/75 flex items-start sm:items-center justify-center p-4 py-6 overflow-y-auto animate-fadeIn"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !loading) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="criar-simulado-modal-title"
        tabIndex={-1}
        className="max-w-xl w-full my-auto rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] p-6 shadow-xl relative text-[var(--ink-primary)] space-y-6 outline-none"
      >
        {/* BOTÃO FECHAR */}
        <button
          type="button"
          onClick={onClose}
          disabled={loading}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-[var(--ink-muted)] hover:text-[var(--ink-primary)] hover:bg-[var(--bg-elevated)] transition-colors disabled:opacity-50"
          aria-label="Fechar modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* CABEÇALHO */}
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-[var(--marker-blue-dim)] border border-[var(--marker-blue-border)] text-[var(--marker-blue)] dark:bg-[var(--marker-amber-dim)] dark:border-[var(--marker-amber-border)] dark:text-[var(--marker-amber)] text-xs font-semibold">
            <Timer className="w-3.5 h-3.5" />
            <span>Condições Oficiais de Prova</span>
          </div>
          <h2
            id="criar-simulado-modal-title"
            className="font-serif-math text-2xl font-semibold text-[var(--ink-primary)] tracking-tight"
          >
            Configurar Simulado Cronometrado
          </h2>
          <p className="text-xs text-[var(--ink-secondary)] leading-relaxed font-sans">
            Personalize o tempo da prova, escolha entre tempo por questão ou tempo total, e treine com fidelidade ao concurso.
          </p>
        </div>

        {/* ORIGEM E QUANTIDADE DE QUESTÕES */}
        <div className="p-4 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] space-y-3">
          <div className="text-xs font-bold text-[var(--ink-secondary)] uppercase tracking-wider font-serif-math">
            1. Questões do Simulado
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <button
              type="button"
              onClick={() => setOrigemQuestoes("selecionadas")}
              disabled={selectedIds.length === 0}
              className={`p-3 rounded-lg border text-left flex flex-col justify-between transition-colors ${
                origemQuestoes === "selecionadas"
                  ? "bg-[var(--marker-blue-dim)] border-[var(--marker-blue)] text-[var(--marker-blue)] dark:bg-[var(--marker-amber-dim)] dark:border-[var(--marker-amber)] dark:text-[var(--marker-amber)] font-semibold"
                  : selectedIds.length === 0
                  ? "opacity-50 cursor-not-allowed border-[var(--border-subtle)] bg-[var(--bg-card)]"
                  : "bg-[var(--bg-card)] border-[var(--border-subtle)] hover:border-[var(--border-default)]"
              }`}
            >
              <div className="font-semibold flex items-center justify-between gap-2 text-[var(--ink-primary)]">
                <span>Selecionadas Manualmente</span>
                <span className="font-mono tabular-nums text-xs px-2 py-0.5 rounded-md bg-[var(--marker-blue-dim)] text-[var(--marker-blue)] dark:bg-[var(--marker-amber-dim)] dark:text-[var(--marker-amber)]">
                  {selectedIds.length}
                </span>
              </div>
              <p className="text-[11px] text-[var(--ink-muted)] mt-1">
                Apenas as questões marcadas com checkbox nos cards.
              </p>
            </button>

            <button
              type="button"
              onClick={() => setOrigemQuestoes("todas_filtradas")}
              className={`p-3 rounded-lg border text-left flex flex-col justify-between transition-colors ${
                origemQuestoes === "todas_filtradas"
                  ? "bg-[var(--marker-blue-dim)] border-[var(--marker-blue)] text-[var(--marker-blue)] dark:bg-[var(--marker-amber-dim)] dark:border-[var(--marker-amber)] dark:text-[var(--marker-amber)] font-semibold"
                  : "bg-[var(--bg-card)] border-[var(--border-subtle)] hover:border-[var(--border-default)]"
              }`}
            >
              <div className="font-semibold flex items-center justify-between gap-2 text-[var(--ink-primary)]">
                <span>Todas Filtradas</span>
                <span className="font-mono tabular-nums text-xs px-2 py-0.5 rounded-md bg-[var(--marker-green-dim)] text-[var(--marker-green)]">
                  {totalFiltradas} disponíveis
                </span>
              </div>
              <p className="text-[11px] text-[var(--ink-muted)] mt-1">
                {filtrosAtivosResumo || "Usa o conjunto atual de filtros do banco."}
              </p>
            </button>
          </div>

          {origemQuestoes === "todas_filtradas" && totalFiltradas > 1 && (
            <div className="flex items-center justify-between pt-1 text-xs">
              <span className="text-[var(--ink-secondary)]">
                Quantidade de questões no simulado:
              </span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={Math.min(totalFiltradas, 100)}
                  value={quantidadeDesejada}
                  onChange={(e) => setQuantidadeDesejada(Math.max(1, Math.min(totalFiltradas, parseInt(e.target.value) || 1)))}
                  className="w-16 px-2 py-1 rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] text-[var(--ink-primary)] text-center font-mono tabular-nums font-bold focus:outline-none focus:ring-2 focus:ring-[var(--marker-blue)]/25 dark:focus:ring-[var(--marker-amber)]/25"
                />
                <span className="text-[var(--ink-muted)] text-[11px] font-mono tabular-nums">de {totalFiltradas}</span>
              </div>
            </div>
          )}
        </div>

        {/* CONFIGURAÇÃO DE TEMPO */}
        <div className="p-4 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-xs font-bold text-[var(--ink-secondary)] uppercase tracking-wider font-serif-math">
              2. Como deseja estipular o tempo?
            </div>
          </div>

          {/* SELETOR DE MODO DE TEMPO */}
          <div className="grid grid-cols-2 gap-1.5 p-1 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] text-xs font-semibold">
            <button
              type="button"
              onClick={() => setTipoTempo("por_questao")}
              className={`py-2 px-3 rounded-md transition-colors flex items-center justify-center gap-2 ${
                tipoTempo === "por_questao"
                  ? "bg-[var(--bg-elevated)] text-[var(--marker-blue)] dark:text-[var(--marker-amber)] border border-[var(--border-default)] font-bold"
                  : "text-[var(--ink-secondary)] hover:text-[var(--ink-primary)]"
              }`}
            >
              <Calculator className="w-3.5 h-3.5" />
              <span>Tempo por Questão</span>
            </button>
            <button
              type="button"
              onClick={() => setTipoTempo("total_fixo")}
              className={`py-2 px-3 rounded-md transition-colors flex items-center justify-center gap-2 ${
                tipoTempo === "total_fixo"
                  ? "bg-[var(--bg-elevated)] text-[var(--marker-blue)] dark:text-[var(--marker-amber)] border border-[var(--border-default)] font-bold"
                  : "text-[var(--ink-secondary)] hover:text-[var(--ink-primary)]"
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Tempo Total Direto</span>
            </button>
          </div>

          {/* MODO 1: TEMPO POR QUESTÃO */}
          {tipoTempo === "por_questao" && (
            <div className="space-y-3 pt-1 animate-fadeIn">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[var(--ink-secondary)]">Tempo estimado por questão:</span>
                <div className="flex items-center gap-1 font-mono tabular-nums font-bold text-[var(--marker-blue)] dark:text-[var(--marker-amber)]">
                  <span>{minutosPorQuestao}m</span>
                  <span>{segundosPorQuestao.toString().padStart(2, "0")}s</span>
                </div>
              </div>

              {/* PRESETS RÁPIDOS */}
              <div className="grid grid-cols-4 gap-2">
                {[
                  { m: 1, s: 30, label: "1m 30s (ESA/ENEM)" },
                  { m: 2, s: 0, label: "2m 00s (Ágil)" },
                  { m: 3, s: 0, label: "3m 00s (EFOMM)" },
                  { m: 4, s: 0, label: "4m 00s (Aprofundado)" },
                ].map((preset) => {
                  const active = minutosPorQuestao === preset.m && segundosPorQuestao === preset.s;
                  return (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => handlePresetTempoQuestao(preset.m, preset.s)}
                      className={`p-2 rounded-lg text-xs border text-center transition-colors ${
                        active
                          ? "bg-[var(--marker-blue-dim)] border-[var(--marker-blue)] text-[var(--marker-blue)] dark:bg-[var(--marker-amber-dim)] dark:border-[var(--marker-amber)] dark:text-[var(--marker-amber)] font-bold"
                          : "bg-[var(--bg-card)] border-[var(--border-subtle)] hover:border-[var(--border-default)] text-[var(--ink-secondary)]"
                      }`}
                    >
                      <div className="font-mono tabular-nums font-bold">{preset.m}:{preset.s.toString().padStart(2, "0")}</div>
                      <div className="text-[10px] text-[var(--ink-muted)] truncate">{preset.label.split(" ")[1]}</div>
                    </button>
                  );
                })}
              </div>

              {/* SLIDERS / INPUTS FINOS */}
              <div className="flex items-center gap-4 pt-1">
                <div className="flex-1 flex items-center gap-2 text-xs">
                  <label htmlFor={`${timeModeGroup}-minutos`} className="text-[var(--ink-muted)]">Minutos:</label>
                  <input
                    id={`${timeModeGroup}-minutos`}
                    type="number"
                    min={0}
                    max={15}
                    value={minutosPorQuestao}
                    onChange={(e) => setMinutosPorQuestao(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-16 px-2 py-1 rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] text-[var(--ink-primary)] text-center font-mono tabular-nums font-bold focus:outline-none focus:ring-2 focus:ring-[var(--marker-blue)]/25 dark:focus:ring-[var(--marker-amber)]/25"
                  />
                </div>
                <div className="flex-1 flex items-center gap-2 text-xs">
                  <label htmlFor={`${timeModeGroup}-segundos`} className="text-[var(--ink-muted)]">Segundos:</label>
                  <input
                    id={`${timeModeGroup}-segundos`}
                    type="number"
                    min={0}
                    max={59}
                    step={15}
                    value={segundosPorQuestao}
                    onChange={(e) => setSegundosPorQuestao(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))}
                    className="w-16 px-2 py-1 rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] text-[var(--ink-primary)] text-center font-mono tabular-nums font-bold focus:outline-none focus:ring-2 focus:ring-[var(--marker-blue)]/25 dark:focus:ring-[var(--marker-amber)]/25"
                  />
                </div>
              </div>
            </div>
          )}

          {/* MODO 2: TEMPO TOTAL FIXO */}
          {tipoTempo === "total_fixo" && (
            <div className="space-y-3 pt-1 animate-fadeIn">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[var(--ink-secondary)]">Duração total da prova:</span>
                <span className="font-mono tabular-nums font-bold text-[var(--marker-blue)] dark:text-[var(--marker-amber)] text-sm">
                  {tempoTotalMinutos} minutos ({Math.floor(tempoTotalMinutos / 60)}h {tempoTotalMinutos % 60}m)
                </span>
              </div>

              {/* PRESETS RÁPIDOS */}
              <div className="grid grid-cols-4 gap-2">
                {[
                  { m: 45, label: "45 min" },
                  { m: 60, label: "1h 00m" },
                  { m: 90, label: "1h 30m" },
                  { m: 120, label: "2h 00m" },
                ].map((preset) => {
                  const active = tempoTotalMinutos === preset.m;
                  return (
                    <button
                      key={preset.m}
                      type="button"
                      onClick={() => handlePresetTempoTotal(preset.m)}
                      className={`p-2 rounded-lg text-xs border text-center transition-colors ${
                        active
                          ? "bg-[var(--marker-blue-dim)] border-[var(--marker-blue)] text-[var(--marker-blue)] dark:bg-[var(--marker-amber-dim)] dark:border-[var(--marker-amber)] dark:text-[var(--marker-amber)] font-bold"
                          : "bg-[var(--bg-card)] border-[var(--border-subtle)] hover:border-[var(--border-default)] text-[var(--ink-secondary)]"
                      }`}
                    >
                      <div className="font-mono tabular-nums font-bold">{preset.label}</div>
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-2 pt-1 text-xs">
                <label htmlFor={`${timeModeGroup}-duracao-livre`} className="text-[var(--ink-muted)]">Ou digite os minutos:</label>
                <input
                  id={`${timeModeGroup}-duracao-livre`}
                  type="number"
                  min={5}
                  max={360}
                  value={tempoTotalMinutos}
                  onChange={(e) => setTempoTotalMinutos(Math.max(5, parseInt(e.target.value) || 5))}
                  className="w-24 px-2.5 py-1.5 rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] text-[var(--ink-primary)] font-mono tabular-nums font-bold focus:outline-none focus:ring-2 focus:ring-[var(--marker-blue)]/25 dark:focus:ring-[var(--marker-amber)]/25"
                />
              </div>
            </div>
          )}

          {/* DESTAQUE DE CÁLCULO DINÂMICO */}
          <div className="p-3.5 rounded-xl bg-[var(--marker-blue-dim)] border border-[var(--marker-blue-border)] dark:bg-[var(--marker-amber-dim)] dark:border-[var(--marker-amber-border)] flex items-start gap-3">
            <Calculator className="w-4 h-4 text-[var(--marker-blue)] dark:text-[var(--marker-amber)] shrink-0 mt-0.5" />
            <div className="space-y-1 text-xs">
              <div className="font-semibold text-[var(--ink-primary)] tabular-nums">
                Tempo Total do Simulado: <strong className="text-[var(--marker-blue)] dark:text-[var(--marker-amber)] font-mono tabular-nums text-sm">{formatTempoCalculado()}</strong>
              </div>
              <p className="text-[11px] text-[var(--ink-secondary)] leading-relaxed tabular-nums">
                Você terá <strong>{formatTempoCalculado()} corridos</strong> para gerenciar livremente entre as <strong>{totalEfetivoQuestoes} questões</strong>. Não há bloqueio individual por questão; você pode pular, revisar e mudar de ideia até o tempo esgotar.
              </p>
            </div>
          </div>
        </div>

        {/* REGRAS OFICIAIS DO SIMULADO */}
        <div className="p-3.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-xs space-y-2">
          <div className="flex items-center gap-2 font-bold text-[var(--ink-secondary)] uppercase tracking-wider font-serif-math">
            <ShieldAlert className="w-3.5 h-3.5 text-[var(--marker-blue)] dark:text-[var(--marker-amber)]" />
            <span>Regras do Modo Simulado</span>
          </div>
          <ul className="space-y-1.5 text-[11px] text-[var(--ink-secondary)] list-disc list-inside">
            <li><strong>Gabarito oculto:</strong> Você não saberá se acertou ou errou durante a prova.</li>
            <li><strong>Sem auxílio de IA:</strong> Dicas e diagnósticos socráticos ficam desativados até o fim da prova.</li>
            <li><strong>Relatório detalhado:</strong> Ao finalizar, você verá o total de acertos, erros e questões em branco, podendo acionar a <strong>MathAI Engine</strong> questão a questão para entender onde errou.</li>
          </ul>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-[var(--marker-red-dim)] border border-[var(--marker-red-border)] text-[var(--marker-red)] text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* AÇÕES */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 rounded-lg text-xs font-semibold text-[var(--ink-secondary)] hover:bg-[var(--bg-elevated)] transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleIniciarSimulado}
            disabled={loading || totalEfetivoQuestoes === 0}
            className="lemmas-gold-cta px-5 py-2.5 rounded-lg text-xs font-bold shadow-xs flex items-center gap-2 transition-colors disabled:opacity-50"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>{loading ? "Preparando..." : "Começar Simulado Agora"}</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
