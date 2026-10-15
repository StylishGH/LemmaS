#!/usr/bin/env python3
"""Retraduz enunciados MathNet com status review_required usando a API do Gemini.

Lê o JSONL de saída do pipeline local, coleta o registro mais recente por ID com
status=review_required e enunciado_original nao vazio, e traduz cada um via Gemini
(flash-lite) reutilizando a protecao de marcadores matematicos do pipeline local
(importada de translate_mathnet_local). Escreve em um JSONL separado; o arquivo
de saida local nunca e modificado. Checkpoint: IDs com traducao bem-sucedida
(hash igual) sao pulados em reexecucoes; falhas ficam retryable.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any

sys.path.insert(0, str(Path(__file__).resolve().parent))
from translate_mathnet_local import prepare_text, _math_signature  # noqa: E402

# Conforme AGENTS.md: flash-lite-latest primeiro; nunca gemini-1.5/2.5.
GEMINI_MODELS = [
    "gemini-flash-lite-latest",
    "gemini-3.5-flash-lite",
    "gemini-3-flash-preview",
]
REQUEST_INTERVAL_S = 4.5          # ~13 RPM, abaixo do limite do Free Tier
MAX_ATTEMPTS_PER_MODEL = 3
CONSECUTIVE_429_LIMIT = 5         # apos 5 x 429 seguidos, para com aviso de quota
API_TIMEOUT_S = 180

ENV_FILES = [
    Path("C:/Users/guigu/AppData/Local/hermes/.env"),
    Path("C:/Users/guigu/OneDrive/Documents/MathAI/.env"),
]
KEY_NAMES = ("GEMINI_API_KEY", "GOOGLE_API_KEY")
WORD_RE = re.compile(r"\b[\w'-]+\b")
MARKER_RE = re.compile(r"\[M\d{3}\]")

PROMPT_TEMPLATE = """You are a professional translator of olympiad-level mathematics.
Translate the QUESTION STATEMENT below into Brazilian Portuguese (pt-BR).

STRICT RULES:
1. Placeholders of the form [M000], [M001], ... protect formulas, LaTeX, images, links and code. Copy each one EXACTLY, character by character, exactly ONCE, keeping it attached to the same surrounding content.
2. NEVER translate, rewrite, reorder, duplicate or delete anything inside a placeholder.
3. Translate only the natural-language prose between the placeholders.
4. Preserve the original paragraph and line structure.
5. Output ONLY the translated statement - no preamble, no comments, no quotation marks, no Markdown fences.

QUESTION STATEMENT:
{marked_text}
END OF STATEMENT. Respond with the pt-BR translation only."""


class QuotaExceeded(Exception):
    pass


def find_api_key() -> str | None:
    for name in KEY_NAMES:
        value = os.environ.get(name)
        if value and value.strip():
            return value.strip()
    for env_file in ENV_FILES:
        if not env_file.is_file():
            continue
        try:
            lines = env_file.read_text(encoding="utf-8", errors="ignore").splitlines()
        except OSError:
            continue
        for line in lines:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, _, value = line.partition("=")
            key = key.strip()
            value = value.strip().strip('"').strip("'")
            if key in KEY_NAMES and value:
                return value
    return None


def load_latest_by_id(path: Path) -> dict[str, dict[str, Any]]:
    latest: dict[str, dict[str, Any]] = {}
    with path.open(encoding="utf-8") as handle:
        for raw in handle:
            raw = raw.strip()
            if not raw:
                continue
            try:
                row = json.loads(raw)
            except json.JSONDecodeError:
                continue
            qid = str(row.get("id", "") or "")
            if qid:
                latest[qid] = row
    return latest


def strip_wrappers(text: str) -> str:
    text = text.strip()
    if text.startswith("```"):
        text = re.sub(r"^```[A-Za-z0-9_-]*[ \t]*\n?", "", text, count=1)
        stripped = text.rstrip()
        if stripped.endswith("```"):
            text = stripped[: stripped.rfind("```")].rstrip()
    return text.strip()


class GeminiClient:
    def __init__(self, api_key: str) -> None:
        self.api_key = api_key
        self._last_request = 0.0
        self.consecutive_429 = 0

    def _pace(self) -> None:
        wait = REQUEST_INTERVAL_S - (time.monotonic() - self._last_request)
        if wait > 0:
            time.sleep(wait)
        self._last_request = time.monotonic()

    def generate(self, model: str, prompt: str) -> str:
        self._pace()
        url = (
            "https://generativelanguage.googleapis.com/v1beta/models/"
            f"{model}:generateContent?key={self.api_key}"
        )
        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {
                "temperature": 0.1,
                "topP": 0.95,
                "maxOutputTokens": 8192,
            },
        }
        request = urllib.request.Request(
            url,
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        try:
            with urllib.request.urlopen(request, timeout=API_TIMEOUT_S) as response:
                body = json.loads(response.read().decode("utf-8"))
        except urllib.error.HTTPError as exc:
            if exc.code == 429:
                self.consecutive_429 += 1
                if self.consecutive_429 >= CONSECUTIVE_429_LIMIT:
                    raise QuotaExceeded(
                        "limite de requisições do Gemini atingido (429)"
                    ) from exc
            else:
                self.consecutive_429 = 0
            raise
        self.consecutive_429 = 0
        candidates = body.get("candidates") or []
        if not candidates:
            raise RuntimeError(f"resposta sem candidatos: {json.dumps(body)[:300]}")
        candidate = candidates[0]
        finish = candidate.get("finishReason")
        if finish and finish != "STOP":
            raise RuntimeError(f"finishReason={finish}")
        parts = (candidate.get("content") or {}).get("parts") or []
        text = "".join(str(part.get("text", "")) for part in parts)
        if not text.strip():
            raise RuntimeError("resposta vazia do Gemini")
        return text


def translate_one(client: GeminiClient, original: str, language_hint: str) -> tuple[str, str]:
    marked, spans, markers, math_spans = prepare_text(original)
    prompt = PROMPT_TEMPLATE.format(marked_text=marked)
    if language_hint:
        prompt = f"(Source language hint: {language_hint}.)\n\n{prompt}"
    last_error: Exception | None = None
    for model in GEMINI_MODELS:
        for _attempt in range(MAX_ATTEMPTS_PER_MODEL):
            try:
                output = strip_wrappers(client.generate(model, prompt))
                for marker in markers:
                    if output.count(marker) != 1:
                        raise ValueError(f"marcador ausente/duplicado na resposta: {marker}")
                restored = output
                for marker, span in zip(markers, spans):
                    restored = restored.replace(marker, span, 1)
                if _math_signature(restored) != math_spans:
                    raise ValueError("integridade matemática não passou")
                source_words = WORD_RE.findall(MARKER_RE.sub(" ", marked))
                target_words = WORD_RE.findall(restored)
                if (
                    language_hint not in {"Chinese", "Korean", "Arabic"}
                    and len(source_words) >= 6
                    and len(target_words) < max(2, int(len(source_words) * 0.3))
                ):
                    raise ValueError("tradução aparentemente truncada")
                return restored, model
            except urllib.error.HTTPError as exc:
                last_error = exc
                if exc.code in (401, 403):
                    raise  # chave invalida: nao adianta trocar de modelo
                if exc.code == 429:
                    time.sleep(30)
                elif exc.code in (500, 502, 503, 504):
                    time.sleep(15)
                else:
                    time.sleep(10)
            except QuotaExceeded:
                raise
            except Exception as exc:
                last_error = exc
                time.sleep(2)
    raise RuntimeError(f"todos os modelos falharam: {last_error}")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", required=True, type=Path, help="JSONL de saída do pipeline local")
    parser.add_argument("--output", required=True, type=Path, help="JSONL separado para retradução Gemini")
    parser.add_argument("--limit", type=int, default=None, help="máximo de casos nesta execução")
    args = parser.parse_args()
    if not args.input.is_file():
        parser.error(f"arquivo de entrada não encontrado: {args.input}")

    api_key = find_api_key()
    if not api_key:
        print("ERRO: nenhuma GEMINI_API_KEY/GOOGLE_API_KEY em env ou .env", file=sys.stderr)
        return 2

    local_latest = load_latest_by_id(args.input)
    problems = {
        qid: row
        for qid, row in local_latest.items()
        if row.get("status") == "review_required"
        and str(row.get("enunciado_original", "") or "").strip()
    }
    done: dict[str, dict[str, Any]] = {}
    if args.output.exists():
        done = load_latest_by_id(args.output)

    pending: list[tuple[str, dict[str, Any], str, str]] = []
    for qid, row in sorted(problems.items()):
        original = str(row["enunciado_original"])
        original_hash = hashlib.sha256(original.encode("utf-8")).hexdigest()
        prior = done.get(qid)
        if (
            prior
            and prior.get("status") == "translated_unreviewed"
            and prior.get("hash_original_sha256") == original_hash
        ):
            continue
        pending.append((qid, row, original, original_hash))
        if args.limit is not None and len(pending) >= args.limit:
            break

    print(
        f"Casos review_required com enunciado: {len(problems)}; "
        f"pendentes após checkpoint: {len(pending)}",
        file=sys.stderr,
    )
    if not pending:
        return 0

    client = GeminiClient(api_key)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    success = failure = 0
    with args.output.open("a", encoding="utf-8") as dest:
        for index, (qid, row, original, original_hash) in enumerate(pending, start=1):
            language_hint = str(row.get("idioma_rotulo", "") or "")
            try:
                translated, model = translate_one(client, original, language_hint)
                record = {
                    "id": qid,
                    "idioma_origem": row.get("idioma_origem"),
                    "idioma_rotulo": row.get("idioma_rotulo"),
                    "modelo": f"google/{model}",
                    "licenca_modelo": "Gemini API ToS (revisar antes de uso)",
                    "identificador_idioma": "gemini-auto-detect",
                    "geracao": {"temperature": 0.1, "topP": 0.95, "maxOutputTokens": 8192},
                    "dispositivo": "api-remota",
                    "hash_original_sha256": original_hash,
                    "enunciado_original": original,
                    "math_spans": len(_math_signature(original)),
                    "integridade_matematica": True,
                    "status": "translated_unreviewed",
                    "revisao_humana": "pendente",
                    "enunciado_ptbr": translated,
                    "retraducao_motivo": row.get("erro"),
                }
                success += 1
            except QuotaExceeded:
                print(
                    f"\nQuota do Gemini atingida após {index - 1} casos; "
                    "retome esta fase depois (checkpoint preserva o progresso).",
                    file=sys.stderr,
                )
                break
            except Exception as exc:
                record = {
                    "id": qid,
                    "idioma_rotulo": row.get("idioma_rotulo"),
                    "hash_original_sha256": original_hash,
                    "enunciado_original": original,
                    "status": "review_required",
                    "retryable": True,
                    "erro": f"gemini: {exc}",
                    "retraducao_motivo": row.get("erro"),
                }
                failure += 1
            dest.write(json.dumps(record, ensure_ascii=False) + "\n")
            dest.flush()
            if index % 20 == 0 or index == len(pending):
                print(
                    f"Progresso: {index}/{len(pending)} (ok={success}, falha={failure})",
                    file=sys.stderr,
                )
    print(
        f"Concluído: ok={success}, falha={failure}, "
        f"pendentes restantes={len(pending) - success - failure}",
        file=sys.stderr,
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
