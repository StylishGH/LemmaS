#!/usr/bin/env bash
# Pipeline MathNet: lote local (DirectML/RX 580) -> retradução Gemini (problemáticos) -> consolidação.
# Retomável: todas as fases têm checkpoint por ID; reexecutar pula o que já está feito.
set -uo pipefail
cd "D:/dev/mathai-web"

VENV_PY="C:/Users/guigu/AppData/Local/MathAI/translation-venv/Scripts/python.exe"
PY="python"
INPUT="C:/Users/guigu/AppData/Local/MathAI/translation-all-input.jsonl"
MAIN_OUT="data/translations/mathnet_enunciados_ptbr.jsonl"
GEMINI_OUT="data/translations/mathnet_enunciados_ptbr_gemini.jsonl"
LOG="data/translations/pipeline.log"

export HF_HUB_OFFLINE=1
export HF_HUB_DISABLE_SYMLINKS_WARNING=1
export HF_HUB_DISABLE_PROGRESS_BARS=1
export TOKENIZERS_PARALLELISM=false
export PYTHONUNBUFFERED=1

mkdir -p data/translations
exec > >(tee -a "$LOG") 2>&1

ts() { date '+%Y-%m-%d %H:%M:%S'; }

# ---------- FASE 0: não rodar em paralelo com outra instância ----------
detect_running() {
  powershell -NoProfile -Command "Get-CimInstance Win32_Process -Filter \"Name='python.exe'\" | Where-Object { \$_.CommandLine -like '*translate_mathnet_local.py*' } | Select-Object -First 1 -ExpandProperty ProcessId" 2>/dev/null | tr -d '\r'
}
while true; do
  RUNNING_PID=$(detect_running)
  if [ -z "$RUNNING_PID" ]; then break; fi
  echo "[$(ts)] [pipeline] outra instância do tradutor ativa (PID $RUNNING_PID); aguardando 120s..."
  sleep 120
done

# ---------- FASE 1: tradução local em lote (RX 580 / DirectML) ----------
echo "[$(ts)] [pipeline] === FASE 1/3: tradução local em lote (DirectML/RX 580) ==="
"$VENV_PY" scripts/maintenance/translate_mathnet_local.py \
  --input "$INPUT" \
  --output "$MAIN_OUT" \
  --device directml \
  --batch-size 8
echo "[$(ts)] [pipeline] FASE 1 concluída (exit=$?)"

# ---------- FASE 2: retradução dos problemáticos via Gemini ----------
echo "[$(ts)] [pipeline] === FASE 2/3: retradução dos problemáticos via Gemini flash-lite ==="
"$PY" scripts/maintenance/retranslate_gemini.py \
  --input "$MAIN_OUT" \
  --output "$GEMINI_OUT"
echo "[$(ts)] [pipeline] FASE 2 concluída (exit=$?)"

# ---------- FASE 3: consolidação final ----------
echo "[$(ts)] [pipeline] === FASE 3/3: consolidação final (JSONL + CSV + stats) ==="
"$PY" scripts/maintenance/consolidate_translations.py
echo "[$(ts)] [pipeline] FASE 3 concluída (exit=$?)"
echo "[$(ts)] [pipeline] === PIPELINE COMPLETO ==="
