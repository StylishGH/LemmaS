"""Re-verificação dos 8 veredictos truncados do lote 1 com um verificador maior.

Entradas: questoes_lote1.json e solucoes_lote1_corrigido.json. Só o
verificador roda; as soluções do 14B são reutilizadas. Saídas separadas
das do lote 1 para revisão antes de qualquer merge. Checkpoint por
questão no Drive, com resume.
"""

import gc
import json
import shutil
from pathlib import Path

import torch
from transformers import AutoModelForCausalLM, AutoTokenizer

QUESTIONS_PATH = "questoes_lote1.json"
SOLUTIONS_PATH = "solucoes_lote1_corrigido.json"
OUTPUT_PATH = "reverificacao_8.json"
LABELS_PATH = "metodos_reverificacao_8.json"
PARTIAL_PATH = "reverificacao_8_parcial.jsonl"
DRIVE_DIR = Path("/content/drive/MyDrive/lemmas-pipeline")

VERIFIER_MODEL = "Qwen/Qwen3-32B-AWQ"
MAX_TOKENS_VERIFIER = 2048

TRUNCATED_IDS = [23012, 23015, 23005, 23174, 23092, 23169, 23198, 23075]

VERIFIER_SYSTEM = (
    "You verify mathematics solutions. Given a problem and a proposed solution, "
    "judge whether the solution is correct and list the methods/lemmas actually used. "
    "IMPORTANT: Write your analysis and ALL method/lemma names strictly in Brazilian Portuguese (pt-BR)."
)


def load_model(model_id):
    tokenizer = AutoTokenizer.from_pretrained(model_id)
    model = AutoModelForCausalLM.from_pretrained(
        model_id, torch_dtype=torch.float16, device_map="auto"
    )
    return tokenizer, model


def generate(tokenizer, model, system, user, max_tokens):
    messages = [
        {"role": "system", "content": system},
        {"role": "user", "content": user},
    ]
    text = tokenizer.apply_chat_template(
        messages, tokenize=False, add_generation_prompt=True, enable_thinking=False
    )
    inputs = tokenizer(text, return_tensors="pt").to(model.device)
    outputs = model.generate(
        **inputs, max_new_tokens=max_tokens, do_sample=False
    )
    return tokenizer.decode(
        outputs[0][inputs["input_ids"].shape[1]:], skip_special_tokens=True
    )


def extract_json(text):
    import re

    # O veredicto é o último bloco com "correta": o verificador pode
    # ecoar o bloco de métodos do resolvedor antes de escrever o seu.
    blocks = re.findall(r"```json\s*(\{.*?\})\s*```", text, re.DOTALL)
    if not blocks:
        blocks = [text[text.find("{"):text.rfind("}") + 1]]
    verdict = None
    fallback = None
    for candidate in blocks:
        try:
            parsed = json.loads(candidate)
        except (json.JSONDecodeError, ValueError):
            continue
        fallback = parsed
        if "correta" in parsed:
            verdict = parsed
    return verdict if verdict is not None else fallback


def sync_to_drive(path):
    if DRIVE_DIR.parent.exists():
        DRIVE_DIR.mkdir(parents=True, exist_ok=True)
        shutil.copy(path, DRIVE_DIR / Path(path).name)


def load_partial(path):
    records = []
    if Path(path).exists():
        for line in Path(path).read_text(encoding="utf-8").splitlines():
            try:
                records.append(json.loads(line))
            except json.JSONDecodeError:
                continue
    elif DRIVE_DIR.parent.exists() and (DRIVE_DIR / path).exists():
        shutil.copy(DRIVE_DIR / path, path)
        return load_partial(path)
    return records


def append_partial(path, record):
    with open(path, "a", encoding="utf-8") as f:
        f.write(json.dumps(record, ensure_ascii=False) + "\n")
    sync_to_drive(path)


def verify_truncated(tokenizer, model, questions, solutions):
    by_id = {q["id"]: q for q in questions}
    done = {r["id"] for r in load_partial(PARTIAL_PATH)}
    results = load_partial(PARTIAL_PATH)
    for s in solutions:
        if s["id"] not in TRUNCATED_IDS or s["id"] in done:
            continue
        q = by_id[s["id"]]
        user = (
            f"Problem:\n{q['enunciado']}\n\nProposed solution:\n{s['solucao_modelo_a']}\n\n"
            "Is the solution correct? Write all method/lemma names strictly in Brazilian Portuguese (pt-BR). "
            "End your answer with a JSON block:\n"
            '```json\n{"correta": true, "metodos": ["metodo_em_pt_br"], "principal": "metodo_em_pt_br"}\n```'
        )
        answer = generate(tokenizer, model, VERIFIER_SYSTEM, user, MAX_TOKENS_VERIFIER)
        parsed = extract_json(answer)
        record = {
            "id": s["id"],
            "materia": s["materia"],
            "topico": s["topico"],
            "veredicto_modelo_b_32b": answer,
            "correta_32b": parsed.get("correta") if parsed else None,
            "metodos_finais_32b": parsed.get("metodos") if parsed else [],
            "principal_final_32b": parsed.get("principal") if parsed else None,
        }
        results.append(record)
        append_partial(PARTIAL_PATH, record)
        print(f"reverified {q['id']} ({len(results)}/{len(TRUNCATED_IDS)})")
    return results


def build_labels(records):
    labels = []
    for r in records:
        metodos = r["metodos_finais_32b"] or []
        principal = r["principal_final_32b"]
        labels.append(
            {
                "id": r["id"],
                "principal": [principal] if principal else [],
                "auxiliares": [m for m in metodos if m != principal],
                "verificada": bool(r["correta_32b"]),
            }
        )
    return labels


def resolve_input_file(candidates):
    for cand in candidates:
        p = Path(cand)
        if p.exists():
            return p
        dp = DRIVE_DIR / cand
        if dp.exists():
            shutil.copy(dp, p)
            return p
    raise FileNotFoundError(f"Nenhum dos arquivos encontrado: {candidates}")


def main():
    q_path = resolve_input_file([QUESTIONS_PATH])
    s_path = resolve_input_file([SOLUTIONS_PATH, "solucoes_lote1.json"])
    print(f"Usando questões: {q_path} | soluções: {s_path}")
    questions = json.loads(q_path.read_text(encoding="utf-8"))
    solutions = json.loads(s_path.read_text(encoding="utf-8"))
    tokenizer, model = load_model(VERIFIER_MODEL)
    try:
        records = verify_truncated(tokenizer, model, questions, solutions)
    finally:
        del model
        gc.collect()
        torch.cuda.empty_cache()
    Path(OUTPUT_PATH).write_text(
        json.dumps(records, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    Path(LABELS_PATH).write_text(
        json.dumps(build_labels(records), ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    sync_to_drive(OUTPUT_PATH)
    sync_to_drive(LABELS_PATH)
    ok = sum(1 for r in records if r["correta_32b"])
    print(f"reverificadas: {len(records)}/{len(TRUNCATED_IDS)}, corretas: {ok}")


if __name__ == "__main__":
    main()
