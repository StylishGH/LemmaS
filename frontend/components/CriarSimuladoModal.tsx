"use client";

import React, { useState, useId } from "react";
import { 
  Clock, 
  Play, 
  X, 
  HelpCircle, 
  ShieldAlert, 
  Sparkles, 
  Timer, 
  Calculator,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { useRouter } from "next/navigation";

export interface SimuladoConfig {
  modo: "simulado";
  ids: number[];
  tempoTotalSegundos: number;
  tempoPorQuestaoSegundos?: number;
  nome?: string;
  totalQuestoes: number;
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
    selectedIds.length > 0 ? selectedIds.length : Math.min(20, totalFiltradas)
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

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

      const config: SimuladoConfig = {
        modo: "simulado",
        ids: idsFinais,
        tempoTotalSegundos: Math.max(60, tempoFinalSegundos),
        tempoPorQuestaoSegundos: tipoTempo === "por_questao" ? segundosPorQuestaoTotal : undefined,
        nome: `Simulado (${idsFinais.length} questões)`,
        totalQuestoes: idsFinais.length,
      };

      // Salva no sessionStorage para que a página /resolver consuma sem estourar URL query
      if (typeof window !== "undefined") {
        sessionStorage.setItem("lemmas_active_simulado", JSON.stringify(config));
      }

      onClose();
      router.push(`/resolver?session=simulado&total=${idsFinais.length}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao preparar simulado.";
      setError(msg);
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn overflow-y-auto">
      <div className="max-w-xl w-full my-8 rounded-2xl bg-white dark:bg-[#151324] border border-amber-500/35 p-6 shadow-2xl relative text-slate-900 dark:text-[#f5f0df] space-y-6">
        {/* BOTÃO FECHAR */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition"
          aria-label="Fechar modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* CABEÇALHO */}
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-700 dark:text-[#d9b452] text-xs font-semibold">
            <Timer className="w-3.5 h-3.5" />
            <span>Condições Oficiais de Prova</span>
          </div>
          <h2 className="font-serif-math text-2xl font-bold text-slate-900 dark:text-[#f5f0df] tracking-tight">
            Configurar Simulado Cronometrado
          </h2>
          <p className="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed font-sans">
            Personalize o tempo da prova, escolha entre tempo por questão ou tempo total, e treine com fidelidade ao concurso.
          </p>
        </div>

        {/* ORIGEM E QUANTIDADE DE QUESTÕES */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#1a172c] border border-slate-200 dark:border-amber-500/15 space-y-3">
          <div className="text-xs font-bold text-slate-700 dark:text-zinc-300 uppercase tracking-wider font-serif-math">
            1. Questões do Simulado
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <button
              type="button"
              onClick={() => setOrigemQuestoes("selecionadas")}
              disabled={selectedIds.length === 0}
              className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all ${
                origemQuestoes === "selecionadas"
                  ? "bg-amber-500/10 border-amber-500 text-amber-800 dark:text-[#d9b452] font-semibold shadow-xs"
                  : selectedIds.length === 0
                  ? "opacity-50 cursor-not-allowed border-slate-200 dark:border-zinc-800"
                  : "bg-white dark:bg-[#141222] border-slate-200 dark:border-zinc-800 hover:border-amber-500/30"
              }`}
            >
              <div className="font-bold flex items-center justify-between">
                <span>Selecionadas Manualmente</span>
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-amber-500/20 text-amber-700 dark:text-[#d9b452]">
                  {selectedIds.length}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-1">
                Apenas as questões marcadas com checkbox nos cards.
              </p>
            </button>

            <button
              type="button"
              onClick={() => setOrigemQuestoes("todas_filtradas")}
              className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all ${
                origemQuestoes === "todas_filtradas"
                  ? "bg-amber-500/10 border-amber-500 text-amber-800 dark:text-[#d9b452] font-semibold shadow-xs"
                  : "bg-white dark:bg-[#141222] border-slate-200 dark:border-zinc-800 hover:border-amber-500/30"
              }`}
            >
              <div className="font-bold flex items-center justify-between">
                <span>Todas Filtradas</span>
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-700 dark:text-emerald-400">
                  {totalFiltradas} disponíveis
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-1">
                {filtrosAtivosResumo || "Usa o conjunto atual de filtros do banco."}
              </p>
            </button>
          </div>

          {origemQuestoes === "todas_filtradas" && totalFiltradas > 1 && (
            <div className="flex items-center justify-between pt-1 text-xs">
              <span className="text-slate-600 dark:text-zinc-400">
                Quantidade de questões no simulado:
              </span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={Math.min(totalFiltradas, 100)}
                  value={quantidadeDesejada}
                  onChange={(e) => setQuantidadeDesejada(Math.max(1, Math.min(totalFiltradas, parseInt(e.target.value) || 1)))}
                  className="w-16 px-2 py-1 rounded-lg border border-slate-200 dark:border-amber-500/20 bg-white dark:bg-[#141222] text-center font-mono font-bold"
                />
                <span className="text-slate-400 text-[11px]">de {totalFiltradas}</span>
              </div>
            </div>
          )}
        </div>

        {/* CONFIGURAÇÃO DE TEMPO */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#1a172c] border border-slate-200 dark:border-amber-500/15 space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-xs font-bold text-slate-700 dark:text-zinc-300 uppercase tracking-wider font-serif-math">
              2. Como deseja estipular o tempo?
            </div>
          </div>

          {/* SELETOR DE MODO DE TEMPO */}
          <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-slate-200/60 dark:bg-[#131120] text-xs font-semibold">
            <button
              type="button"
              onClick={() => setTipoTempo("por_questao")}
              className={`py-2 px-3 rounded-lg transition-all flex items-center justify-center gap-2 ${
                tipoTempo === "por_questao"
                  ? "bg-white dark:bg-[#201c38] text-amber-700 dark:text-[#d9b452] shadow-sm font-bold"
                  : "text-slate-600 dark:text-zinc-400 hover:text-slate-900"
              }`}
            >
              <Calculator className="w-3.5 h-3.5" />
              <span>Tempo por Questão</span>
            </button>
            <button
              type="button"
              onClick={() => setTipoTempo("total_fixo")}
              className={`py-2 px-3 rounded-lg transition-all flex items-center justify-center gap-2 ${
                tipoTempo === "total_fixo"
                  ? "bg-white dark:bg-[#201c38] text-amber-700 dark:text-[#d9b452] shadow-sm font-bold"
                  : "text-slate-600 dark:text-zinc-400 hover:text-slate-900"
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
                <span className="text-slate-600 dark:text-zinc-400">Tempo estimado por questão:</span>
                <div className="flex items-center gap-1 font-mono font-bold text-amber-700 dark:text-[#d9b452]">
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
                      className={`p-2 rounded-xl text-xs border text-center transition-all ${
                        active
                          ? "bg-amber-500/20 border-amber-500 text-amber-800 dark:text-[#d9b452] font-bold shadow-xs"
                          : "bg-white dark:bg-[#141222] border-slate-200 dark:border-zinc-800 hover:border-amber-500/30 text-slate-700 dark:text-zinc-300"
                      }`}
                    >
                      <div className="font-mono font-bold">{preset.m}:{preset.s.toString().padStart(2, "0")}</div>
                      <div className="text-[10px] text-slate-400 dark:text-zinc-500 truncate">{preset.label.split(" ")[1]}</div>
                    </button>
                  );
                })}
              </div>

              {/* SLIDERS / INPUTS FINOS */}
              <div className="flex items-center gap-4 pt-1">
                <div className="flex-1 flex items-center gap-2 text-xs">
                  <label htmlFor={`${timeModeGroup}-minutos`} className="text-slate-500 dark:text-zinc-400">Minutos:</label>
                  <input
                    id={`${timeModeGroup}-minutos`}
                    type="number"
                    min={0}
                    max={15}
                    value={minutosPorQuestao}
                    onChange={(e) => setMinutosPorQuestao(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-16 px-2 py-1 rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-[#141222] text-center font-mono font-bold"
                  />
                </div>
                <div className="flex-1 flex items-center gap-2 text-xs">
                  <label htmlFor={`${timeModeGroup}-segundos`} className="text-slate-500 dark:text-zinc-400">Segundos:</label>
                  <input
                    id={`${timeModeGroup}-segundos`}
                    type="number"
                    min={0}
                    max={59}
                    step={15}
                    value={segundosPorQuestao}
                    onChange={(e) => setSegundosPorQuestao(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))}
                    className="w-16 px-2 py-1 rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-[#141222] text-center font-mono font-bold"
                  />
                </div>
              </div>
            </div>
          )}

          {/* MODO 2: TEMPO TOTAL FIXO */}
          {tipoTempo === "total_fixo" && (
            <div className="space-y-3 pt-1 animate-fadeIn">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600 dark:text-zinc-400">Duração total da prova:</span>
                <span className="font-mono font-bold text-amber-700 dark:text-[#d9b452] text-sm">
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
                      className={`p-2 rounded-xl text-xs border text-center transition-all ${
                        active
                          ? "bg-amber-500/20 border-amber-500 text-amber-800 dark:text-[#d9b452] font-bold shadow-xs"
                          : "bg-white dark:bg-[#141222] border-slate-200 dark:border-zinc-800 hover:border-amber-500/30 text-slate-700 dark:text-zinc-300"
                      }`}
                    >
                      <div className="font-mono font-bold">{preset.label}</div>
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-2 pt-1 text-xs">
                <label htmlFor={`${timeModeGroup}-duracao-livre`} className="text-slate-500 dark:text-zinc-400">Ou digite os minutos:</label>
                <input
                  id={`${timeModeGroup}-duracao-livre`}
                  type="number"
                  min={5}
                  max={360}
                  value={tempoTotalMinutos}
                  onChange={(e) => setTempoTotalMinutos(Math.max(5, parseInt(e.target.value) || 5))}
                  className="w-24 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-[#141222] font-mono font-bold"
                />
              </div>
            </div>
          )}

          {/* DESTAQUE DE CÁLCULO DINÂMICO */}
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-start gap-3">
            <Calculator className="w-5 h-5 text-amber-600 dark:text-[#d9b452] shrink-0 mt-0.5" />
            <div className="space-y-1 text-xs">
              <div className="font-semibold text-slate-900 dark:text-[#f5f0df]">
                Tempo Total do Simulado: <strong className="text-amber-700 dark:text-[#d9b452] font-mono text-sm">{formatTempoCalculado()}</strong>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-zinc-300 leading-relaxed">
                Você terá <strong>{formatTempoCalculado()} corridos</strong> para gerenciar livremente entre as <strong>{totalEfetivoQuestoes} questões</strong>. Não há bloqueio individual por questão; você pode pular, revisar e mudar de ideia até o tempo esgotar.
              </p>
            </div>
          </div>
        </div>

        {/* REGRAS OFICIAIS DO SIMULADO */}
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#1a172c] border border-slate-200 dark:border-zinc-800 text-xs space-y-2">
          <div className="flex items-center gap-2 font-bold text-slate-700 dark:text-zinc-300 uppercase tracking-wider font-serif-math">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
            <span>Regras do Modo Simulado</span>
          </div>
          <ul className="space-y-1.5 text-[11px] text-slate-600 dark:text-zinc-400 list-disc list-inside">
            <li><strong>Gabarito oculto:</strong> Você não saberá se acertou ou errou durante a prova.</li>
            <li><strong>Sem auxílio de IA:</strong> Dicas e diagnósticos socráticos ficam desativados até o fim da prova.</li>
            <li><strong>Relatório detalhado:</strong> Ao finalizar, você verá o total de acertos, erros e questões em branco, podendo acionar a <strong>MathAI Engine</strong> questão a questão para entender onde errou.</li>
          </ul>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-700 dark:text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* AÇÕES */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800 transition"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleIniciarSimulado}
            disabled={loading || totalEfetivoQuestoes === 0}
            className="lemmas-gold-cta px-6 py-2.5 rounded-xl text-xs font-bold shadow-md flex items-center gap-2 transition hover:scale-[1.02] disabled:opacity-50"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>{loading ? "Preparando..." : "Começar Simulado Agora"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
