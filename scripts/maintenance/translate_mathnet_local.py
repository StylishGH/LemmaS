"""Translate MathNet question statements locally and checkpoint by question ID.

Input JSONL fields: id, idioma, enunciado.
Output is a separate JSONL derivative; the source dataset is never modified.
Run with the isolated Python environment containing torch-directml and Transformers 4.x.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
from pathlib import Path
from typing import Any


NLLB_MODEL_ID = "facebook/nllb-200-distilled-600M"
EN_MODEL_ID = "Helsinki-NLP/opus-mt-en-ROMANCE"
TARGET_LANG = "por_Latn"
EN_TARGET_PREFIX = ">>pt_br<< "
NLLB_MAX_SOURCE_TOKENS = 600
OPUS_MAX_SOURCE_TOKENS = 480
SENTENCE_BOUNDARY = re.compile(
    r"(?<=[!?。！？])(?=\s|[A-ZÀ-ÖØ-ÞА-ЯЁ\u4e00-\u9fff])"
    r"|(?<!\d)(?<=\.)(?=\s+[A-ZÀ-ÖØ-ÞА-ЯЁ])"
    r"|(?<=\n)"
)

# MathNet uses ISO-639-1 tags; NLLB expects FLORES language tags.
NLLB_SOURCE_LANGS = {
    "af": "afr_Latn", "ar": "arb_Arab", "bg": "bul_Cyrl", "ca": "cat_Latn",
    "cs": "ces_Latn", "cy": "cym_Latn", "da": "dan_Latn", "de": "deu_Latn",
    "en": "eng_Latn", "es": "spa_Latn", "fr": "fra_Latn", "hr": "hrv_Latn",
    "hu": "hun_Latn", "it": "ita_Latn", "ko": "kor_Hang", "mk": "mkd_Cyrl",
    "mn": "khk_Cyrl", "nl": "nld_Latn", "no": "nob_Latn", "ro": "ron_Latn",
    "ru": "rus_Cyrl", "sl": "slv_Latn", "sq": "als_Latn", "vi": "vie_Latn",
    "zh": "zho_Hans",
}

# Protect Markdown/LaTeX math exactly. Also cover common un-delimited symbolic
# expressions so prose translation cannot rewrite powers, comparisons, or sums.
EXPLICIT_MATH = (
    r"\$\$[\s\S]*?\$\$"
    r"|\$(?!\$)[^$\n]+\$"
    r"|\\\[[\s\S]*?\\\]"
    r"|\\\([\s\S]*?\\\)"
    r"|\\begin\{([A-Za-z*]+)\}[\s\S]*?\\end\{\1\}"
)
MATH_ATOM = (
    r"(?:\\[A-Za-z]+(?:\{[^{}]*\})*"
    r"|\d+(?:\.\d+)?[A-Za-z]?"
    r"|[A-Za-z](?:[_^](?:\{[^{}]+\}|[A-Za-z0-9+\-]+))*)"
)
MATH_OPERATOR = r"(?:<=|>=|!=|==|≤|≥|≠|≈|=|<|>|\+|\-|\*|/|×|÷|\bplus\b)"
RAW_MATH = rf"(?<![\w]){MATH_ATOM}(?:\s*{MATH_OPERATOR}\s*{MATH_ATOM})+(?![\w])"
MATH_SPAN = re.compile(rf"(?:{EXPLICIT_MATH})|(?:{RAW_MATH})")
PROTECTED_SPAN = re.compile(
    rf"(?:{EXPLICIT_MATH})"
    r"|(?:!\[[^\]]*\]\([^)]+\))"
    r"|(?:\[[^\]]+\]\([^)]+\))"
    r"|(?:```[\s\S]*?```)"
    r"|(?:`[^`\n]+`)"
)


def _math_signature(text: str) -> list[str]:
    return [match.group(0) for match in MATH_SPAN.finditer(text)]


def choose_model(source_lang: str) -> str:
    if source_lang == "en":
        return EN_MODEL_ID
    if source_lang not in NLLB_SOURCE_LANGS:
        raise ValueError(f"idioma de origem sem mapeamento NLLB: {source_lang}")
    return NLLB_MODEL_ID


LANGUAGE_ALIASES = {
    "english": "en", "spanish": "es", "español": "es", "italian": "it",
    "french": "fr", "german": "de", "romanian": "ro", "dutch": "nl",
    "russian": "ru", "korean": "ko", "chinese": "zh", "chinese (traditional)": "zh",
    "mongolian": "mn", "macedonian": "mk", "vietnamese": "vi", "português": "pt",
    "portuguese": "pt", "slovene": "sl", "slovenian": "sl", "catalan": "ca",
    "afrikaans": "af", "arabic": "ar", "bulgarian": "bg", "czech": "cs",
    "danish": "da", "croatian": "hr", "hungarian": "hu", "norwegian": "no",
    "albanian": "sq", "welsh": "cy", "zh-tw": "zh", "zh-cn": "zh",
}


def normalize_language_label(label: str) -> str | None:
    normalized = label.strip().casefold()
    return LANGUAGE_ALIASES.get(normalized, normalized if normalized in NLLB_SOURCE_LANGS or normalized == "pt" else None)


def infer_source_language(row: dict[str, Any]) -> tuple[str | None, str | None]:
    """Use the statement's prose to correct stale labels; flag mixed-label rows."""
    label = str(row.get("idioma_final", "") or "").strip()
    if re.search(r"[,;]", label):
        return None, "rótulo indica mais de um idioma; revisar a mistura antes de traduzir"

    text = str(row.get("enunciado", "") or "")
    prose = re.sub(EXPLICIT_MATH, " ", text)
    prose = re.sub(r"!\[[^]]*\]\([^)]*\)|<[^>]+>", " ", prose)
    prose = re.sub(r"\\[A-Za-z]+(?:\{[^{}]*\})?", " ", prose)
    prose = re.sub(r"[^\w\sÀ-ÿ\u0400-\u04FF\u4e00-\u9fff]", " ", prose)
    prose = re.sub(r"\s+", " ", prose).strip()

    label_lang = normalize_language_label(label) if label else None
    fallback = label_lang or normalize_language_label(str(row.get("idioma", "")))
    if len(prose) < 24:
        return fallback, None if fallback else "pouco texto para identificar o idioma"

    import langid

    ranked = langid.rank(prose[:8000])
    detected, top_score = ranked[0]
    margin = top_score - ranked[1][1] if len(ranked) > 1 else 0
    if detected in NLLB_SOURCE_LANGS or detected == "pt":
        if margin >= 4 or fallback is None:
            return detected, None
    if fallback:
        return fallback, None
    return None, f"idioma ambíguo: {detected} (margem {margin:.1f})"


def prepare_text(text: str) -> tuple[str, list[str], list[str], list[str]]:
    """Protect math and Markdown atoms while retaining sentence context."""
    matches = list(PROTECTED_SPAN.finditer(text))
    pieces: list[str] = []
    protected_spans: list[str] = []
    markers: list[str] = []
    cursor = 0
    for index, match in enumerate(matches):
        marker = f"[M{index:03d}]"
        pieces.extend((text[cursor:match.start()], marker))
        protected_spans.append(match.group(0))
        markers.append(marker)
        cursor = match.end()
    pieces.append(text[cursor:])
    math_spans = _math_signature(text)
    return "".join(pieces), protected_spans, markers, math_spans


def translate_batch(texts: list[str], source_lang: str, tokenizer: Any, model: Any, device: Any, model_id: str) -> list[tuple[str, list[str]]]:
    prepared = [prepare_text(text) for text in texts]
    if model_id != EN_MODEL_ID:
        tokenizer.src_lang = NLLB_SOURCE_LANGS[source_lang]

    token_limit = OPUS_MAX_SOURCE_TOKENS if model_id == EN_MODEL_ID else NLLB_MAX_SOURCE_TOKENS
    import torch

    # OPUS and NLLB are translation models trained around sentence-like inputs.
    # Split only at sentence/line boundaries, never at formula boundaries.
    assembled: list[list[str]] = [[] for _ in prepared]
    tasks: list[tuple[int, int, str, str, str, list[str]]] = []

    def restore_protected(segment: str, row_index: int) -> str:
        for marker, span in zip(prepared[row_index][2], prepared[row_index][1]):
            segment = segment.replace(marker, span)
        return segment

    for row_index, (marked_text, _, markers, _) in enumerate(prepared):
        for segment in SENTENCE_BOUNDARY.split(marked_text):
            if not segment:
                continue
            left_ws = segment[: len(segment) - len(segment.lstrip())]
            right_ws = segment[len(segment.rstrip()) :]
            core = segment[len(left_ws) : len(segment) - len(right_ws) if right_ws else len(segment)]
            if not core:
                assembled[row_index].append(segment)
                continue
            core_without_markers = core
            for marker in markers:
                core_without_markers = core_without_markers.replace(marker, " ")
            if not re.search(r"[A-Za-zÀ-ÖØ-öø-ÿ\u0400-\u04FF\u4e00-\u9fff]", core_without_markers):
                assembled[row_index].append(restore_protected(segment, row_index))
                continue
            task_markers = [marker for marker in markers if marker in core]
            slot_index = len(assembled[row_index])
            assembled[row_index].append("")
            tasks.append((row_index, slot_index, left_ws, right_ws, core, task_markers))

    # Two-sentence batches worked for both model families with num_beams=1;
    # larger OPUS batches returned empty sequences for some rows.
    sentence_batch_size = 2
    for task_start in range(0, len(tasks), sentence_batch_size):
        task_batch = tasks[task_start : task_start + sentence_batch_size]
        inputs = [EN_TARGET_PREFIX + task[4] if model_id == EN_MODEL_ID else task[4] for task in task_batch]
        encoded = tokenizer(inputs, return_tensors="pt", padding=True, truncation=False)
        max_input_tokens = int(encoded["input_ids"].shape[-1])
        if max_input_tokens > token_limit:
            raise ValueError(f"frase excede {token_limit} tokens ({max_input_tokens})")
        encoded = {key: value.to(device) for key, value in encoded.items()}
        generation_options = {
            "max_new_tokens": min(512, max(48, int(max_input_tokens * 1.5 + 24))),
            "num_beams": 1,
        }
        if model_id == NLLB_MODEL_ID:
            generation_options["forced_bos_token_id"] = tokenizer.convert_tokens_to_ids(TARGET_LANG)
        with torch.no_grad():
            generated = model.generate(**encoded, **generation_options)
        translated_segments = tokenizer.batch_decode(generated, skip_special_tokens=True)

        for task, translated in zip(task_batch, translated_segments):
            row_index, slot_index, left_ws, right_ws, source_segment, task_markers = task
            if model_id == EN_MODEL_ID and translated.startswith(EN_TARGET_PREFIX.strip()):
                translated = translated[len(EN_TARGET_PREFIX.strip()) :].lstrip()
            for marker in task_markers:
                if translated.count(marker) != 1:
                    raise ValueError(f"marcador matemático alterado pelo modelo: {marker}")
                translated = translated.replace(marker, next(span for span, item in zip(prepared[row_index][1], prepared[row_index][2]) if item == marker), 1)

            source_plain = source_segment
            for marker in prepared[row_index][2]:
                source_plain = source_plain.replace(marker, " ")
            source_words = re.findall(r"\b[\w'-]+\b", source_plain)
            target_words = re.findall(r"\b[\w'-]+\b", translated)
            if source_lang not in {"zh", "ko", "ar"} and len(source_words) >= 6 and len(target_words) < max(2, int(len(source_words) * 0.3)):
                raise ValueError("frase aparentemente truncada ou omitida pelo modelo")
            assembled[row_index][slot_index] = left_ws + translated.strip() + right_ws

    results: list[tuple[str, list[str]]] = []
    for row_index, (_, _protected_spans, markers, math_spans) in enumerate(prepared):
        translated = "".join(assembled[row_index])
        for marker in markers:
            if marker in translated:
                raise ValueError(f"marcador protegido não foi substituído: {marker}")
        actual_math = _math_signature(translated)
        if actual_math != math_spans:
            raise ValueError(
                "integridade matemática não passou depois de remontar frases; "
                f"esperado={math_spans!r}; encontrado={actual_math!r}; texto={translated[:500]!r}"
            )
        results.append((translated, math_spans))
    return results


def load_model(device_kind: str, model_id: str) -> tuple[Any, Any, Any]:
    import torch
    from transformers import AutoModelForSeq2SeqLM, AutoTokenizer

    if device_kind == "directml":
        import torch_directml

        device = torch_directml.device()
    else:
        device = torch.device("cpu")

    tokenizer = AutoTokenizer.from_pretrained(model_id)
    model = AutoModelForSeq2SeqLM.from_pretrained(model_id).to(device).eval()
    return tokenizer, model, device


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", required=True, type=Path, help="JSONL com id, idioma e enunciado")
    parser.add_argument("--output", required=True, type=Path, help="JSONL separado para traduções/checkpoints")
    parser.add_argument("--device", choices=("directml", "cpu"), default="directml")
    parser.add_argument("--limit", type=int, default=None, help="limita linhas para piloto")
    parser.add_argument("--batch-size", type=int, default=4, help="questões por checkpoint")
    parser.add_argument("--overwrite", action="store_true", help="retraduz IDs já concluídos")
    args = parser.parse_args()

    if not args.input.is_file():
        parser.error(f"arquivo de entrada não encontrado: {args.input}")
    args.output.parent.mkdir(parents=True, exist_ok=True)

    completed: dict[str, tuple[str, str, str, bool]] = {}
    if args.output.exists() and not args.overwrite:
        with args.output.open(encoding="utf-8") as existing:
            for line in existing:
                try:
                    row = json.loads(line)
                except json.JSONDecodeError:
                    continue
                if row.get("hash_original_sha256") and row.get("status"):
                    completed[str(row.get("id"))] = (
                        str(row["hash_original_sha256"]),
                        str(row.get("modelo", "")),
                        str(row["status"]),
                        bool(row.get("retryable", True)),
                    )

    rows_by_lang: dict[str, list[dict[str, Any]]] = {}
    with args.input.open(encoding="utf-8") as source:
        for line_number, line in enumerate(source, start=1):
            try:
                row = json.loads(line)
                row["_line_number"] = line_number
                source_lang, language_error = infer_source_language(row)
                row["_source_lang"] = source_lang
                row["_language_error"] = language_error
                bucket = "__review__" if language_error else "__already_pt__" if source_lang == "pt" else str(source_lang)
                rows_by_lang.setdefault(bucket, []).append(row)
            except (json.JSONDecodeError, KeyError, TypeError) as exc:
                rows_by_lang.setdefault("__invalid__", []).append({"id": f"linha-{line_number}", "_error": str(exc)})

    processed = 0
    next_progress = 100
    model_bundles: dict[str, tuple[Any, Any, Any]] = {}
    with args.output.open("a", encoding="utf-8") as dest:
        for source_lang, lang_rows in sorted(rows_by_lang.items(), key=lambda item: (item[0] != "en", -len(item[1]), item[0])):
            if source_lang == "__already_pt__":
                continue
            if source_lang == "__review__":
                for row in lang_rows:
                    original_hash = hashlib.sha256(str(row.get("enunciado", "")).encode("utf-8")).hexdigest()
                    qid = str(row.get("id", f"linha-{row['_line_number']}"))
                    prior = completed.get(qid)
                    if prior and prior[0] == original_hash and prior[2] == "review_required" and not prior[3]:
                        continue
                    dest.write(json.dumps({
                        "id": qid,
                        "idioma_rotulo": row.get("idioma_final"),
                        "hash_original_sha256": original_hash,
                        "enunciado_original": str(row.get("enunciado", "")),
                        "status": "review_required",
                        "retryable": False,
                        "erro": row.get("_language_error"),
                    }, ensure_ascii=False) + "\n")
                    processed += 1
                dest.flush()
                continue
            model_id = None if source_lang == "__invalid__" else choose_model(source_lang)
            pending: list[dict[str, Any]] = []
            model_bundle = None
            for row in lang_rows:
                if args.limit is not None and processed + len(pending) >= args.limit:
                    break
                question_id = str(row.get("id", f"linha-{row['_line_number']}"))
                if row.get("_error"):
                    result = {"id": question_id, "status": "review_required", "erro": row["_error"]}
                    dest.write(json.dumps(result, ensure_ascii=False) + "\n")
                    processed += 1
                    continue
                original_hash = hashlib.sha256(str(row["enunciado"]).encode("utf-8")).hexdigest()
                prior = completed.get(question_id)
                if prior and prior[0] == original_hash and (
                    (prior[2] == "translated_unreviewed" and prior[1] == model_id)
                    or (prior[2] == "review_required" and not prior[3])
                ):
                    continue
                if not str(row.get("enunciado", "")).strip():
                    result = {"id": question_id, "status": "review_required", "erro": "enunciado vazio"}
                    dest.write(json.dumps(result, ensure_ascii=False) + "\n")
                    processed += 1
                    continue
                pending.append(row)
                if len(pending) < args.batch_size:
                    continue
                if model_id not in model_bundles:
                    model_bundles[model_id] = load_model(args.device, model_id)
                    print(f"Modelo {model_id} carregado para {source_lang}.", file=sys.stderr, flush=True)
                model_bundle = model_bundles[model_id]
                processed += _process_batch(pending, source_lang, model_id, model_bundle, dest)
                pending = []
                if processed >= next_progress:
                    print(f"Progresso: {processed} registros tratados; último idioma: {source_lang}.", file=sys.stderr, flush=True)
                    next_progress = (processed // 100 + 1) * 100
            if pending:
                if model_id not in model_bundles:
                    model_bundles[model_id] = load_model(args.device, model_id)
                    print(f"Modelo {model_id} carregado para {source_lang}.", file=sys.stderr, flush=True)
                model_bundle = model_bundles[model_id]
                processed += _process_batch(pending, source_lang, model_id, model_bundle, dest)
                if processed >= next_progress:
                    print(f"Progresso: {processed} registros tratados; último idioma: {source_lang}.", file=sys.stderr, flush=True)
                    next_progress = (processed // 100 + 1) * 100
            if args.limit is not None and processed >= args.limit:
                break

    print(f"Concluído: {processed} registros novos; saída: {args.output}", file=sys.stderr)
    return 0


def _process_batch(rows: list[dict[str, Any]], source_lang: str, model_id: str, model_bundle: tuple[Any, Any, Any], dest: Any) -> int:
    tokenizer, model, device = model_bundle
    revision = getattr(model.config, "_commit_hash", None) or getattr(tokenizer, "init_kwargs", {}).get("_commit_hash")
    outputs: list[dict[str, Any]] = []
    eligible: list[dict[str, Any]] = []
    for row in rows:
        original = str(row["enunciado"])
        token_limit = OPUS_MAX_SOURCE_TOKENS if model_id == EN_MODEL_ID else NLLB_MAX_SOURCE_TOKENS
        token_count = len(tokenizer((EN_TARGET_PREFIX if model_id == EN_MODEL_ID else "") + original, add_special_tokens=True)["input_ids"])
        if token_count > token_limit:
            outputs.append({
                "id": str(row["id"]), "idioma_origem": source_lang,
                "idioma_rotulo": row.get("idioma_final"),
                "hash_original_sha256": hashlib.sha256(original.encode("utf-8")).hexdigest(),
                "enunciado_original": original, "status": "review_required",
                "retryable": True, "erro": f"enunciado excede {token_limit} tokens ({token_count})",
            })
        else:
            eligible.append(row)
    if eligible:
        try:
            translated_batch = translate_batch([str(row["enunciado"]) for row in eligible], source_lang, tokenizer, model, device, model_id)
            translated_outputs: list[dict[str, Any]] = []
            for row, (translated, protected_math) in zip(eligible, translated_batch):
                original = str(row["enunciado"])
                original_math = _math_signature(original)
                if protected_math != original_math or _math_signature(translated) != original_math:
                    raise ValueError("integridade matemática não passou")
                translated_outputs.append({
                    "id": str(row["id"]),
                    "idioma_origem": source_lang,
                    "idioma_rotulo": row.get("idioma_final"),
                    "modelo": model_id,
                    "revision_modelo": revision,
                    "licenca_modelo": "Apache-2.0" if model_id == EN_MODEL_ID else "CC-BY-NC-4.0",
                    "identificador_idioma": "langid==1.1.6",
                    "geracao": {"num_beams": 1, "sentence_batch_size": 2},
                    "dispositivo": str(device),
                    "hash_original_sha256": hashlib.sha256(original.encode("utf-8")).hexdigest(),
                    "enunciado_original": original,
                    "math_spans": len(original_math),
                    "integridade_matematica": True,
                    "status": "translated_unreviewed",
                    "revisao_humana": "pendente",
                    "enunciado_ptbr": translated,
                })
            outputs.extend(translated_outputs)
        except Exception:
            for row in eligible:
                original = str(row["enunciado"])
                try:
                    translated, protected_math = translate_batch([original], source_lang, tokenizer, model, device, model_id)[0]
                    original_math = _math_signature(original)
                    if protected_math != original_math or _math_signature(translated) != original_math:
                        raise ValueError("integridade matemática não passou")
                    outputs.append({
                        "id": str(row["id"]), "idioma_origem": source_lang, "modelo": model_id,
                        "revision_modelo": revision,
                        "idioma_rotulo": row.get("idioma_final"),
                        "licenca_modelo": "Apache-2.0" if model_id == EN_MODEL_ID else "CC-BY-NC-4.0",
                        "identificador_idioma": "langid==1.1.6",
                        "geracao": {"num_beams": 1, "sentence_batch_size": 2},
                        "dispositivo": str(device),
                        "hash_original_sha256": hashlib.sha256(original.encode("utf-8")).hexdigest(),
                        "enunciado_original": original,
                        "math_spans": len(original_math), "integridade_matematica": True,
                        "status": "translated_unreviewed", "revisao_humana": "pendente",
                        "enunciado_ptbr": translated,
                    })
                except Exception as exc:
                    outputs.append({
                        "id": str(row["id"]), "idioma_origem": source_lang,
                        "idioma_rotulo": row.get("idioma_final"),
                        "hash_original_sha256": hashlib.sha256(original.encode("utf-8")).hexdigest(),
                        "enunciado_original": original, "status": "review_required",
                        "retryable": True, "erro": f"{type(exc).__name__}: {exc}",
                    })
    for output in outputs:
        dest.write(json.dumps(output, ensure_ascii=False) + "\n")
    dest.flush()
    return len(outputs)


if __name__ == "__main__":
    raise SystemExit(main())
