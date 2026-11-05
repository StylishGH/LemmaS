"""Etapa 2 — Juiz LLM de Ancoragem (Shortlist Top-25 + Irmãos de Super-Família -> 0 a 5 Lemas) + Híbrido 3D (Spec).

Arquitetura em 2 Estágios (Retrieval + LLM Reranker/Judge) alinhada ao Pacote Consolidado:
1. Shortlist por Questão (~25 candidatos):
   - Combina os candidatos vetoriais (BGE-M3 v2.1: método + enunciado) com os irmãos das mesmas
     Super-Famílias e com as âncoras léxicas da Spec (6 fechadas + 11 recomendadas).
2. Juiz LLM (Qwen/Qwen3-14B-AWQ, greedy, enable_thinking=False):
   - Lê o enunciado + a solução já gerada + a shortlist numerada de ~25 candidatos do catálogo 3k.
   - Escolhe de 0 a 5 lemas que REALMENTE são usados na resolução (nunca força 5 se só 1 ou 2 servirem,
     e nunca usa "primo" como âncora).
   - Classifica o papel ("principal" ou "auxiliar"), cita o passo da solução e sinaliza
     `novos_lemas_sugeridos` quando um método da solução não tem lema correspondente no catálogo 3k.
   - Rejeita estritamente qualquer `lema_id` fora da shortlist (zero alucinação de ID).
   - Checkpoint incremental a cada questão no Google Drive (`ancoragem_llm_62_parcial.jsonl`).
3. Tabela `question_lemmas` + Similaridade Híbrida 3D da Spec:
   - S_lema   = Jaccard ponderado dos conjuntos de lemas/métodos (peso principal = 1.0, auxiliar = 0.5).
   - S_sem    = Cosseno BGE-M3 dos enunciados das 62 questões.
   - S_struct = Cosseno TF-IDF do esqueleto estrutural LaTeX (enunciado + solução).
   - S_hibrido = 0.65 * S_lema + 0.20 * S_sem + 0.15 * S_struct.
"""

import gc
import glob
import json
import re
import shutil
import unicodedata
from collections import Counter, defaultdict
from pathlib import Path

import numpy as np

DRIVE_DIR = Path("/content/drive/MyDrive/lemmas-pipeline")
JUDGE_MODEL = "Qwen/Qwen3-14B-AWQ"
ENCODER_MODEL = "BAAI/bge-m3"
MAX_TOKENS_JUDGE = 1024

SHORTLIST_SIZE = 25
MAX_CHOSEN_LEMMAS = 5

# Pesos oficiais da Spec (Seção 4 do Pacote Consolidado)
W_HIB_LEMA = 0.65
W_HIB_SEM = 0.20
W_HIB_STRUCT = 0.15
W_JACCARD_PRINCIPAL = 1.0
W_JACCARD_AUXILIAR = 0.5

PARTIAL_LLM_PATH = "ancoragem_llm_62_parcial.jsonl"
OUT_ANCORAGEM_LLM = "ancoragem_llm_62.json"
OUT_QUESTION_LEMMAS = "question_lemmas_62.json"
OUT_HIBRIDO_NPZ = "similaridade_hibrida_62.npz"
OUT_HIBRIDO_JSON = "similaridade_hibrida_62_relatorio.json"

# Âncoras léxicas auditadas na Seção 5 do Pacote Consolidado (6 fechadas + 11 recomendadas)
LEXICAL_ANCHORS_SPEC = {
    # 6 Fechados (alta auditada)
    "volume-esfera": "LEMA-2337",
    "volume of a sphere": "LEMA-2337",
    "independencia-linear": "LEMA-2738",
    "linear independence": "LEMA-2738",
    "comprimento-de-curvas": "LEMA-1784",
    "comprimento de curvas": "LEMA-1784",
    "integração para comprimento de curva": "LEMA-1784",
    "multiplicadores-de-lagrange": "LEMA-1767",
    "multiplicadores de lagrange": "LEMA-1767",
    "metodo de multiplicadores de lagrange": "LEMA-1767",
    "metodo dos multiplicadores de lagrange": "LEMA-1767",
    "derivada-direcional": "LEMA-1796",
    "derivada direcional": "LEMA-1796",
    "teorema-funcao-implicita": "LEMA-1794",
    "teorema da funcao implicita": "LEMA-1794",
    # 11 Recomendações da Spec
    "casa-dos-pombos": "LEMA-0466",
    "principio da casa dos pombos": "LEMA-0466",
    "teorema-ceva": "LEMA-0022",
    "regra-da-cadeia": "LEMA-1793",
    "regra da cadeia": "LEMA-1793",
    "chain rule": "LEMA-1793",
    "regla de la cadena": "LEMA-1793",
    "equacao-plano-tangente": "LEMA-1792",
    "equacao do plano tangente": "LEMA-1792",
    "plano_tangente": "LEMA-1792",
    "plano-tangente-esfera": "LEMA-1792",
    "tangent plane to sphere": "LEMA-1792",
    "regra-do-produto": "LEMA-2762",
    "regra do produto": "LEMA-2762",
    "regla del producto": "LEMA-2762",
    "produto-escalar": "LEMA-2734",
    "produto escalar": "LEMA-2734",
    "produto_escalar": "LEMA-2734",
    "dot product formula": "LEMA-2734",
    "distancia-ponto-plano": "LEMA-2029",
    "distance from point to plane": "LEMA-2029",
    "derivadas-parciais-segunda-ordem": "LEMA-1791",
    "second-order partial derivatives": "LEMA-1791",
    "otimizacao-com-restricao": "LEMA-1767",
    "otimizacao com restricao": "LEMA-1767",
    "analise-hessiana": "LEMA-1799",
    "analise da hessiana": "LEMA-1799",
}

JUDGE_SYSTEM = (
    "Você é um especialista em Matemática e curador ontológico do projeto LemmaS. "
    "Sua tarefa é analisar o enunciado de uma questão, a resolução passo a passo já gerada "
    "e uma lista fechada (shortlist) de lemas candidatos do catálogo. "
    "Escolha APENAS os lemas da lista que são EFETIVAMENTE utilizados na resolução (entre 0 e 5 lemas). "
    "REGRA DE OURO: 'Primo não é âncora' — NÃO escolha um lema apenas porque é do mesmo assunto ou parecido; "
    "se o lema exato não estiver na lista de candidatos, NÃO force um lema vizinho e registre o método em 'novos_lemas_sugeridos'."
)


# ---------------------------------------------------------------- Utilitários I/O
def ensure_drive():
    if not DRIVE_DIR.parent.exists():
        try:
            from google.colab import drive
            drive.mount("/content/drive")
        except Exception:
            pass


def resolve(name):
    local = Path(name)
    if local.exists():
        return local
    if DRIVE_DIR.parent.exists() and (DRIVE_DIR / name).exists():
        shutil.copy(DRIVE_DIR / name, local)
        print(f"[Drive -> /content] {name}")
        return local
    return None


def load_json(name, required=True):
    path = resolve(name)
    if path is None:
        if required:
            raise FileNotFoundError(f"{name} não encontrado em ./ nem em {DRIVE_DIR}")
        return None
    return json.loads(path.read_text(encoding="utf-8"))


def sync_to_drive(path):
    if DRIVE_DIR.parent.exists():
        DRIVE_DIR.mkdir(parents=True, exist_ok=True)
        shutil.copy(path, DRIVE_DIR / Path(path).name)


def norm_slug(text):
    if not isinstance(text, str):
        return ""
    s = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode("ascii")
    s = re.sub(r"[^a-zA-Z0-9]+", " ", s.lower()).strip()
    return s


def load_partial(path):
    records = []
    p = resolve(path)
    if p and p.exists():
        for line in p.read_text(encoding="utf-8").splitlines():
            try:
                records.append(json.loads(line))
            except json.JSONDecodeError:
                continue
    return records


def append_partial(path, record):
    with open(path, "a", encoding="utf-8") as f:
        f.write(json.dumps(record, ensure_ascii=False) + "\n")
    sync_to_drive(path)


def as_list(val):
    if val is None:
        return []
    if isinstance(val, str):
        return [val] if val.strip() else []
    return [v for v in val if isinstance(v, str) and v.strip()]


# ------------------------------------------------ Carregamento das 62 Questões e Soluções
def load_questoes_e_solucoes():
    """Reúne enunciados, soluções completas e rótulos (incluindo questoes_62.json / metodos_62_norm.json se presentes)."""
    info = defaultdict(dict)
    names = {
        Path(p).name
        for p in glob.glob("questoes*.json") + glob.glob(str(DRIVE_DIR / "questoes*.json"))
    }
    names |= {"questoes_62.json", "solucoes_dois_modelos.json", "solucoes_lote1.json", "solucoes_lote1_corrigido.json"}
    for name in sorted(names):
        data = load_json(name, required=False)
        if isinstance(data, dict):
            data = next((v for v in data.values() if isinstance(v, list)), None)
        if not isinstance(data, list):
            continue
        for r in data:
            if not isinstance(r, dict) or "id" not in r:
                continue
            slot = info[r["id"]]
            for k in ("enunciado", "materia", "topico", "solucao_modelo_a", "solucao"):
                if r.get(k) and not slot.get(k):
                    slot[k] = r[k]

    piloto = load_json("metodos_amostra_v2.json")
    lote1 = load_json("metodos_lote1.json")
    rev = {r["id"]: r for r in (load_json("reverificacao_8.json", required=False) or [])}
    norm62_raw = load_json("metodos_62_norm.json", required=False)
    norm62 = {}
    if isinstance(norm62_raw, list):
        norm62 = {r["id"]: r for r in norm62_raw if isinstance(r, dict) and "id" in r}
    elif isinstance(norm62_raw, dict):
        norm62 = {int(k): v for k, v in norm62_raw.items() if str(k).isdigit()}

    def build_items(records, lote):
        out = []
        for r in records:
            qid = r["id"]
            principal = as_list(r.get("principal") or r.get("principal_final"))
            auxiliares = as_list(r.get("auxiliares"))
            if not auxiliares and r.get("metodos_finais"):
                auxiliares = [m for m in as_list(r["metodos_finais"]) if m not in principal]
            verificada = r.get("verificada", r.get("correta"))
            fonte = "solver+verificador_7b"
            if qid in rev:
                rv = rev[qid]
                principal = as_list(rv.get("principal_final_32b")) or principal
                auxiliares = [m for m in as_list(rv.get("metodos_finais_32b")) if m not in principal]
                verificada = rv.get("correta_32b") is True
                fonte = "reverificacao_32b"
            if qid in norm62:
                n_rec = norm62[qid]
                p_norm = as_list(n_rec.get("principal"))
                a_norm = as_list(n_rec.get("auxiliares"))
            else:
                p_norm, a_norm = [], []
            meta = info.get(qid, {})
            out.append(
                {
                    "id": qid,
                    "lote": lote,
                    "materia": meta.get("materia"),
                    "topico": meta.get("topico"),
                    "enunciado": meta.get("enunciado") or "",
                    "solucao": meta.get("solucao_modelo_a") or meta.get("solucao") or "",
                    "principal": principal,
                    "auxiliares": auxiliares,
                    "principal_norm": p_norm,
                    "auxiliares_norm": a_norm,
                    "verificada": bool(verificada),
                    "fonte_rotulo": fonte,
                }
            )
        return out

    questoes = build_items(piloto, "piloto") + build_items(lote1, "lote1")
    print(f"[Questões] Carregadas {len(questoes)} questões (12 piloto + 50 lote 1).")
    return questoes


# ------------------------------------------------ Shortlist (Vetorial + Léxico + Super-Família)
def build_shortlists(questoes, catalog, vectors, families):
    by_id = {l["id"]: l for l in catalog}
    by_code = {l.get("codigo"): l for l in catalog if l.get("codigo")}
    fam_by_id = {f["id"]: f for f in families}
    members_by_fam = defaultdict(list)
    for f in families:
        members_by_fam[f["super_family_id"]].append(f["id"])

    lemma_ids = [v["id"] for v in vectors]
    idx_by_id = {lid: i for i, lid in enumerate(lemma_ids)}
    L = np.asarray([v["vetor"] for v in vectors], dtype=np.float32)
    L /= np.linalg.norm(L, axis=1, keepdims=True) + 1e-12

    import torch
    from sentence_transformers import SentenceTransformer

    device = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"[Shortlist BGE-M3] Codificando consultas em {device}...")
    encoder = SentenceTransformer(ENCODER_MODEL, device=device)

    enun_texts = [
        f"Matéria: {q.get('materia') or ''}. Tópico: {q.get('topico') or ''}. "
        f"Enunciado: {q.get('enunciado') or q.get('solucao')[:600]}"
        for q in questoes
    ]
    E_q = np.asarray(encoder.encode(enun_texts, batch_size=64, normalize_embeddings=True), dtype=np.float32)

    all_labels = sorted(
        {
            lab
            for q in questoes
            for lab in (q["principal"] + q["auxiliares"] + q["principal_norm"] + q["auxiliares_norm"])
        }
    )
    E_lab = {}
    if all_labels:
        lab_vecs = np.asarray(
            encoder.encode(
                ["Título: " + l.replace("-", " ").replace("_", " ").strip() for l in all_labels],
                batch_size=64,
                normalize_embeddings=True,
            ),
            dtype=np.float32,
        )
        E_lab = dict(zip(all_labels, lab_vecs))

    del encoder
    gc.collect()
    if torch.cuda.is_available():
        torch.cuda.empty_cache()

    S_enun_lema = E_q @ L.T
    shortlists = {}

    for qi, q in enumerate(questoes):
        sim_enun = S_enun_lema[qi]
        labels_q = q["principal"] + q["auxiliares"] + q["principal_norm"] + q["auxiliares_norm"]
        if labels_q:
            per_lab = np.stack([E_lab[lab] @ L.T for lab in labels_q])
            sim_met = per_lab.max(axis=0)
            score = 0.65 * sim_met + 0.35 * sim_enun
        else:
            sim_met = np.zeros_like(sim_enun)
            score = sim_enun.copy()

        chosen_ids = []
        chosen_reason = {}

        # 1. Âncoras Léxicas da Spec (prioridade máxima se o rótulo bater)
        for lab in labels_q:
            slug_k = norm_slug(lab)
            slug_hyph = slug_k.replace(" ", "-")
            for key_cand in (lab.lower().strip(), slug_k, slug_hyph):
                if key_cand in LEXICAL_ANCHORS_SPEC:
                    code = LEXICAL_ANCHORS_SPEC[key_cand]
                    if code in by_code:
                        lid = by_code[code]["id"]
                        if lid not in chosen_ids:
                            chosen_ids.append(lid)
                            chosen_reason[lid] = f"ancora_lexica_spec({code})"

        # 2. Casamento Léxico Direto no Título do Catálogo 3k (Tier 1/2)
        for lab in labels_q:
            words = [w for w in norm_slug(lab).split() if len(w) >= 4]
            if not words:
                continue
            for l in catalog:
                tit_norm = norm_slug(l.get("titulo") or "")
                if all(w in tit_norm for w in words):
                    lid = l["id"]
                    if lid not in chosen_ids:
                        chosen_ids.append(lid)
                        chosen_reason[lid] = f"lexico_titulo('{lab}')"
                    if len(chosen_ids) >= 8:
                        break

        # 3. Top-15 pelo Score Combinado (0.65 * método + 0.35 * enunciado)
        for j in np.argsort(-score)[:15]:
            lid = lemma_ids[int(j)]
            if lid not in chosen_ids:
                chosen_ids.append(lid)
                chosen_reason[lid] = "top_score_vetorial"

        # 4. Top-5 pelo Enunciado Puro (garante cobertura quando rótulo é fraco ou vazio)
        for j in np.argsort(-sim_enun)[:5]:
            lid = lemma_ids[int(j)]
            if lid not in chosen_ids:
                chosen_ids.append(lid)
                chosen_reason[lid] = "top_enunciado"

        # 5. Expansão por Super-Família (irmãos mais fortes das famílias dos top-3)
        top_fams = []
        for lid in chosen_ids[:4]:
            fid = fam_by_id.get(lid, {}).get("super_family_id")
            if fid is not None and fid not in top_fams:
                top_fams.append(fid)
        for fid in top_fams:
            siblings = sorted(
                members_by_fam[fid],
                key=lambda s_id: -float(score[idx_by_id[s_id]]),
            )
            for s_id in siblings[:3]:
                if s_id not in chosen_ids:
                    chosen_ids.append(s_id)
                    chosen_reason[s_id] = f"irmao_super_familia_{fid}"

        # Trunca em SHORTLIST_SIZE ordenando por prioridade léxica + score vetorial
        final_ids = chosen_ids[:SHORTLIST_SIZE]
        cand_list = []
        for rank, lid in enumerate(final_ids, 1):
            j = idx_by_id[lid]
            lem = by_id[lid]
            fam = fam_by_id.get(lid, {})
            cand_list.append(
                {
                    "rank_shortlist": rank,
                    "lema_id": lid,
                    "codigo": lem.get("codigo"),
                    "titulo": lem.get("titulo"),
                    "materia": lem.get("materia"),
                    "origem": lem.get("origem"),
                    "gatilho": (lem.get("gatilho_reconhecimento") or "")[:140],
                    "formula_latex": (lem.get("formula_latex") or "")[:120],
                    "super_family_id": fam.get("super_family_id"),
                    "score_vetorial": round(float(score[j]), 4),
                    "sim_metodo": round(float(sim_met[j]), 4),
                    "sim_enunciado": round(float(sim_enun[j]), 4),
                    "fonte_shortlist": chosen_reason.get(lid, "vetorial"),
                }
            )
        shortlists[q["id"]] = cand_list

    return shortlists, E_q, L, idx_by_id


# ------------------------------------------------ Juiz LLM (Qwen3-14B-AWQ)
def extract_json_block(text):
    if not text:
        return None
    blocks = re.findall(r"```json\s*(\{.*?\})\s*```", text, re.DOTALL)
    if not blocks and "{" in text and "}" in text:
        blocks = [text[text.find("{"):text.rfind("}") + 1]]
    for cand in reversed(blocks):
        try:
            parsed = json.loads(cand)
            if isinstance(parsed, dict):
                return parsed
        except Exception:
            continue
    return None


def build_judge_prompt(q, candidates):
    rotulos_livres = q["principal"] + q["auxiliares"]
    cand_lines = []
    for c in candidates:
        form = f" | Fórmula: {c['formula_latex']}" if c.get("formula_latex") else ""
        gat = f" | Uso: {c['gatilho']}" if c.get("gatilho") else ""
        cand_lines.append(
            f"- ID {c['lema_id']} ({c['codigo']}) [{c['materia']} | fam #{c['super_family_id']}]: "
            f"{c['titulo']}{form}{gat}"
        )
    cand_block = "\n".join(cand_lines)
    sol_excerpt = (q.get("solucao") or "")[:2200]
    enun_excerpt = (q.get("enunciado") or "")[:900]

    return (
        f"QUESTÃO (ID {q['id']} | Matéria: {q.get('materia')} | Tópico: {q.get('topico')}):\n"
        f"{enun_excerpt}\n\n"
        f"RESOLUÇÃO PASSO A PASSO:\n{sol_excerpt}\n\n"
        f"MÉTODOS IDENTIFICADOS PELO SOLVER/VERIFICADOR: {rotulos_livres}\n\n"
        f"SHORTLIST DE LEMAS CANDIDATOS DO CATÁLOGO (escolha APENAS desta lista, pelos IDs exatos):\n"
        f"{cand_block}\n\n"
        "INSTRUÇÕES ESTRITAS:\n"
        "1. Escolha entre 0 e 5 lemas da SHORTLIST acima que são REALMENTE usados na resolução.\n"
        "2. NÃO escolha lemas 'primos' (parecidos mas que não foram aplicados na solução). Se um método usado na solução não tiver lema exato na shortlist, NÃO force um substituto: coloque o nome do método em 'novos_lemas_sugeridos'.\n"
        "3. Para cada lema escolhido, indique 'papel' ('principal' ou 'auxiliar') e cite brevemente em qual passo da resolução ele entra.\n"
        "4. Responda APENAS com um bloco JSON válido no formato exato abaixo:\n"
        "```json\n"
        "{\n"
        '  "lemas_escolhidos": [\n'
        '    {"lema_id": 1234, "codigo": "LEMA-XXXX", "papel": "principal", "evidencia_na_solucao": "Usado para..."}\n'
        "  ],\n"
        '  "novos_lemas_sugeridos": ["nome-do-lema-faltante-se-houver"],\n'
        '  "procedimentos_gerais": ["substituicao-de-variaveis"]\n'
        "}\n"
        "```"
    )


def run_llm_judge(questoes, shortlists, catalog):
    by_id = {l["id"]: l for l in catalog}
    cached = load_partial(PARTIAL_LLM_PATH)
    done_by_id = {r["id"]: r for r in cached if "id" in r}
    pending = [q for q in questoes if q["id"] not in done_by_id]

    if not pending:
        print(f"[Cache Juiz LLM] 62/62 questões já julgadas em {PARTIAL_LLM_PATH}.")
        return [done_by_id[q["id"]] for q in questoes]

    import torch
    from transformers import AutoModelForCausalLM, AutoTokenizer

    print(f"[Juiz LLM] Carregando {JUDGE_MODEL} para julgar {len(pending)} questões pendentes...")
    tokenizer = AutoTokenizer.from_pretrained(JUDGE_MODEL)
    model = AutoModelForCausalLM.from_pretrained(
        JUDGE_MODEL, torch_dtype=torch.float16, device_map="auto"
    )

    try:
        for idx, q in enumerate(pending, 1):
            qid = q["id"]
            cands = shortlists[qid]
            valid_ids = {c["lema_id"]: c for c in cands}
            user_prompt = build_judge_prompt(q, cands)

            messages = [
                {"role": "system", "content": JUDGE_SYSTEM},
                {"role": "user", "content": user_prompt},
            ]
            text = tokenizer.apply_chat_template(
                messages, tokenize=False, add_generation_prompt=True, enable_thinking=False
            )
            inputs = tokenizer(text, return_tensors="pt").to(model.device)
            outputs = model.generate(**inputs, max_new_tokens=MAX_TOKENS_JUDGE, do_sample=False)
            raw_reply = tokenizer.decode(
                outputs[0][inputs["input_ids"].shape[1]:], skip_special_tokens=True
            )
            parsed = extract_json_block(raw_reply) or {}

            chosen_clean = []
            seen_lids = set()
            rejected_ids = []
            for item in (parsed.get("lemas_escolhidos") or []):
                if not isinstance(item, dict):
                    continue
                lid = item.get("lema_id")
                try:
                    lid = int(lid)
                except (TypeError, ValueError):
                    continue
                if lid not in valid_ids:
                    rejected_ids.append(lid)
                    continue
                if lid in seen_lids:
                    continue
                seen_lids.add(lid)
                lem = by_id[lid]
                cand_meta = valid_ids[lid]
                papel = str(item.get("papel") or "auxiliar").lower().strip()
                if papel not in ("principal", "auxiliar"):
                    papel = "principal" if not chosen_clean else "auxiliar"
                chosen_clean.append(
                    {
                        "lema_id": lid,
                        "codigo": lem.get("codigo"),
                        "titulo": lem.get("titulo"),
                        "materia_lema": lem.get("materia"),
                        "origem": lem.get("origem"),
                        "papel": papel,
                        "evidencia_na_solucao": (item.get("evidencia_na_solucao") or "")[:240],
                        "super_family_id": cand_meta.get("super_family_id"),
                        "score_vetorial": cand_meta.get("score_vetorial"),
                        "fonte_shortlist": cand_meta.get("fonte_shortlist"),
                    }
                )
                if len(chosen_clean) >= MAX_CHOSEN_LEMMAS:
                    break

            # Garante pelo menos 1 principal se escolheu algum lema e todos vieram como auxiliar
            if chosen_clean and not any(c["papel"] == "principal" for c in chosen_clean):
                chosen_clean[0]["papel"] = "principal"

            record = {
                "id": qid,
                "lote": q["lote"],
                "materia": q.get("materia"),
                "topico": q.get("topico"),
                "verificada": q["verificada"],
                "fonte_rotulo": q["fonte_rotulo"],
                "rotulos_originais": {"principal": q["principal"], "auxiliares": q["auxiliares"]},
                "tipo": "AI_INTERPRETATION",
                "status": "ancorado_llm_shortlist",
                "modelo_juiz": JUDGE_MODEL,
                "n_candidatos_shortlist": len(cands),
                "n_lemas_escolhidos": len(chosen_clean),
                "lemas_escolhidos": chosen_clean,
                "novos_lemas_sugeridos": as_list(parsed.get("novos_lemas_sugeridos")),
                "procedimentos_gerais": as_list(parsed.get("procedimentos_gerais")),
                "ids_rejeitados_fora_shortlist": rejected_ids,
                "shortlist_top10_preview": [
                    {
                        "lema_id": c["lema_id"],
                        "codigo": c["codigo"],
                        "titulo": c["titulo"],
                        "score_vetorial": c["score_vetorial"],
                        "fonte": c["fonte_shortlist"],
                    }
                    for c in cands[:10]
                ],
                "resposta_bruta_llm": raw_reply,
            }
            done_by_id[qid] = record
            append_partial(PARTIAL_LLM_PATH, record)
            print(
                f"[{ len(done_by_id) }/62] Q{qid} ({q.get('materia')}): "
                f"{len(chosen_clean)} lemas escolhidos | novos={record['novos_lemas_sugeridos']}"
            )
    finally:
        del model
        gc.collect()
        if torch.cuda.is_available():
            torch.cuda.empty_cache()

    return [done_by_id[q["id"]] for q in questoes]


# ------------------------------------------------ Similaridade Híbrida 3D (Spec Seção 4)
def normalize_latex_skeleton(text):
    if not isinstance(text, str) or not text.strip():
        return ""
    tokens = re.findall(r"\\[a-zA-Z]+|\d+|[\+\-\=\<\>\^\{\}\(\)\[\]\|]", text)
    return " ".join(tokens)


def build_question_keys(record, q_raw):
    """Monta o dicionário {chave: peso} de cada questão (peso 1.0 principal, 0.5 auxiliar).

    Combina:
    - Códigos LEMA-xxxx escolhidos pelo Juiz LLM;
    - Slugs normalizados / procedimentos para que métodos sem candidato no banco (como
      'substituicao-variaveis' ou 'verificacao-fechamento-adicao') continuem pontuando no híbrido,
      exatamente como especificado na Seção 5 do Pacote Consolidado.
    """
    weights = {}
    for c in record["lemas_escolhidos"]:
        key = c.get("codigo") or f"LEMA_ID_{c['lema_id']}"
        w = W_JACCARD_PRINCIPAL if c.get("papel") == "principal" else W_JACCARD_AUXILIAR
        weights[key] = max(weights.get(key, 0.0), w)

    # Inclui também slugs de métodos/procedimentos quando a questão usa procedimento sem lema fechado
    p_list = q_raw.get("principal_norm") or q_raw.get("principal") or []
    a_list = q_raw.get("auxiliares_norm") or q_raw.get("auxiliares") or []
    for m in p_list:
        slug = norm_slug(m).replace(" ", "-")
        if not slug:
            continue
        code = LEXICAL_ANCHORS_SPEC.get(slug) or LEXICAL_ANCHORS_SPEC.get(norm_slug(m))
        key = code if code else f"slug:{slug}"
        weights[key] = max(weights.get(key, 0.0), W_JACCARD_PRINCIPAL)
    for m in a_list:
        slug = norm_slug(m).replace(" ", "-")
        if not slug:
            continue
        code = LEXICAL_ANCHORS_SPEC.get(slug) or LEXICAL_ANCHORS_SPEC.get(norm_slug(m))
        key = code if code else f"slug:{slug}"
        weights[key] = max(weights.get(key, 0.0), W_JACCARD_AUXILIAR)

    return weights


def weighted_jaccard_matrix(weight_dicts):
    n = len(weight_dicts)
    S = np.zeros((n, n), dtype=np.float32)
    for i in range(n):
        wi = weight_dicts[i]
        for j in range(i, n):
            if i == j:
                S[i, j] = 1.0
                continue
            wj = weight_dicts[j]
            if not wi or not wj:
                S[i, j] = 0.0
                continue
            keys = set(wi.keys()) | set(wj.keys())
            inter = sum(min(wi.get(k, 0.0), wj.get(k, 0.0)) for k in keys)
            union = sum(max(wi.get(k, 0.0), wj.get(k, 0.0)) for k in keys)
            val = float(inter / union) if union > 0 else 0.0
            S[i, j] = S[j, i] = val
    return S


def compute_hybrid_3d(questoes, llm_records, E_q, L, idx_by_id):
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.preprocessing import normalize

    n = len(questoes)
    # 1. S_sem (Cosseno BGE-M3 dos enunciados)
    S_sem = (E_q @ E_q.T).astype(np.float32)

    # 2. S_struct (Cosseno TF-IDF do esqueleto LaTeX de enunciado + solução)
    skeletons = [
        normalize_latex_skeleton((q.get("enunciado") or "") + " " + (q.get("solucao") or ""))
        for q in questoes
    ]
    non_empty = [s for s in skeletons if s.strip()]
    if non_empty:
        vec = TfidfVectorizer(token_pattern=r"[^\s]+", ngram_range=(1, 2), sublinear_tf=True)
        vec.fit(non_empty)
        X_struct = np.zeros((n, len(vec.vocabulary_)), dtype=np.float32)
        for i, sk in enumerate(skeletons):
            if sk.strip():
                X_struct[i] = vec.transform([sk]).toarray()[0]
        X_struct = normalize(X_struct, norm="l2")
        S_struct = (X_struct @ X_struct.T).astype(np.float32)
        for i in range(n):
            S_struct[i, i] = 1.0
    else:
        S_struct = np.eye(n, dtype=np.float32)

    # 3. S_lema_jaccard (Jaccard Ponderado exato da Spec: principal=1.0, auxiliar=0.5)
    weight_dicts = [
        build_question_keys(rec, q) for rec, q in zip(llm_records, questoes)
    ]
    S_lema_jaccard = weighted_jaccard_matrix(weight_dicts)

    # 4. S_lema_vetorial (Cosseno entre os centróides BGE-M3 dos lemas escolhidos pelo Juiz LLM)
    perfis_vec = np.zeros((n, L.shape[1]), dtype=np.float32)
    for i, rec in enumerate(llm_records):
        for c in rec["lemas_escolhidos"]:
            w = W_JACCARD_PRINCIPAL if c["papel"] == "principal" else W_JACCARD_AUXILIAR
            perfis_vec[i] += w * L[idx_by_id[c["lema_id"]]]
        if np.linalg.norm(perfis_vec[i]) < 1e-9:
            perfis_vec[i] = E_q[i]
    perfis_vec /= np.linalg.norm(perfis_vec, axis=1, keepdims=True) + 1e-12
    S_lema_vetorial = (perfis_vec @ perfis_vec.T).astype(np.float32)

    # 5. S_hibrido oficial da Spec: 0.65 * S_lema + 0.20 * S_sem + 0.15 * S_struct
    S_hibrido = (
        W_HIB_LEMA * S_lema_jaccard
        + W_HIB_SEM * S_sem
        + W_HIB_STRUCT * S_struct
    ).astype(np.float32)

    return S_lema_jaccard, S_lema_vetorial, S_sem, S_struct, S_hibrido, weight_dicts


def build_question_lemmas_table(llm_records):
    """Gera a tabela relacional question_lemmas pronta para auditoria (não importa no Supabase)."""
    rows = []
    for r in llm_records:
        for rank, c in enumerate(r["lemas_escolhidos"], 1):
            rows.append(
                {
                    "question_id": r["id"],
                    "lote": r["lote"],
                    "lema_id": c["lema_id"],
                    "codigo": c["codigo"],
                    "titulo": c["titulo"],
                    "papel": c["papel"],
                    "peso_jaccard": W_JACCARD_PRINCIPAL if c["papel"] == "principal" else W_JACCARD_AUXILIAR,
                    "rank": rank,
                    "evidencia_na_solucao": c["evidencia_na_solucao"],
                    "super_family_id": c["super_family_id"],
                    "tipo": "AI_INTERPRETATION",
                }
            )
    return rows


def ensure_awq_deps_before_torch():
    """Garante que gptqmodel seja instalado ANTES de importar torch/triton no processo."""
    import importlib.util
    import subprocess
    import sys

    if importlib.util.find_spec("gptqmodel") is None:
        print("[Auto-Deps] Instalando gptqmodel + torchvision==0.29.2 torchaudio==2.11.1 (processo limpo)...")
        subprocess.run([sys.executable, "-m", "pip", "install", "-q", "gptqmodel"], check=True)
        subprocess.run(
            [sys.executable, "-m", "pip", "install", "-q", "torchvision==0.29.2", "torchaudio==2.11.1"],
            check=True,
        )


def main():
    ensure_awq_deps_before_torch()
    ensure_drive()
    questoes = load_questoes_e_solucoes()
    catalog = load_json("lemas_3k.json")
    vectors = load_json("lemas_vetores_3k.json")
    families = load_json("lemas_super_familias_3k.json")

    shortlists, E_q, L, idx_by_id = build_shortlists(questoes, catalog, vectors, families)
    llm_records = run_llm_judge(questoes, shortlists, catalog)
    q_lemmas = build_question_lemmas_table(llm_records)

    S_jac, S_vec, S_sem, S_struct, S_hib, weight_dicts = compute_hybrid_3d(
        questoes, llm_records, E_q, L, idx_by_id
    )

    ids = [q["id"] for q in questoes]
    iu = np.triu_indices(len(ids), 1)

    # Pares de destaque no Híbrido 3D
    def top_pairs(mat, k=12):
        vals = mat[iu]
        order = np.argsort(-vals)[:k]
        out = []
        for o in order:
            i, j = int(iu[0][o]), int(iu[1][o])
            ki = set(weight_dicts[i].keys()) & set(weight_dicts[j].keys())
            out.append(
                {
                    "q_a": ids[i],
                    "q_b": ids[j],
                    "materia_a": questoes[i].get("materia"),
                    "materia_b": questoes[j].get("materia"),
                    "S_hibrido": round(float(S_hib[i, j]), 4),
                    "S_lema_jaccard": round(float(S_jac[i, j]), 4),
                    "S_lema_vetorial": round(float(S_vec[i, j]), 4),
                    "S_sem": round(float(S_sem[i, j]), 4),
                    "S_struct": round(float(S_struct[i, j]), 4),
                    "chaves_em_comum": sorted(ki),
                }
            )
        return out

    novos_counter = Counter(
         norm_slug(nl).replace(" ", "-")
        for r in llm_records
        for nl in r.get("novos_lemas_sugeridos", [])
        if norm_slug(nl)
    )
    cobertura_shortlist = sum(1 for r in llm_records if r["n_lemas_escolhidos"] > 0)

    relatorio = {
        "n_questoes": len(questoes),
        "cobertura_shortlist_questoes_com_lema": f"{cobertura_shortlist}/{len(questoes)} ({cobertura_shortlist/len(questoes):.1%})",
        "media_lemas_por_questao": round(float(np.mean([r["n_lemas_escolhidos"] for r in llm_records])), 2),
        "distribuicao_n_lemas_escolhidos": dict(Counter(r["n_lemas_escolhidos"] for r in llm_records)),
        "total_vinculos_question_lemmas": len(q_lemmas),
        "total_alucinacoes_id_rejeitadas": sum(len(r["ids_rejeitados_fora_shortlist"]) for r in llm_records),
        "pares_com_S_lema_jaccard_positivo": int((S_jac[iu] > 0).sum()),
        "total_pares": int(len(iu[0])),
        "pesos_hibrido_spec": {"S_lema": W_HIB_LEMA, "S_sem": W_HIB_SEM, "S_struct": W_HIB_STRUCT},
        "top_novos_lemas_sugeridos_lacunas_catalogo": [
            {"sugestao": k, "n_questoes": c} for k, c in novos_counter.most_common(15)
        ],
        "top_pares_hibrido_3d": top_pairs(S_hib, 15),
        "top_pares_jaccard_lema": top_pairs(S_jac, 15),
    }

    Path(OUT_ANCORAGEM_LLM).write_text(json.dumps(llm_records, ensure_ascii=False, indent=2), encoding="utf-8")
    Path(OUT_QUESTION_LEMMAS).write_text(json.dumps(q_lemmas, ensure_ascii=False, indent=2), encoding="utf-8")
    Path(OUT_HIBRIDO_JSON).write_text(json.dumps(relatorio, ensure_ascii=False, indent=2), encoding="utf-8")
    np.savez_compressed(
        OUT_HIBRIDO_NPZ,
        ids=np.array(ids),
        S_hibrido=S_hib,
        S_lema_jaccard=S_jac,
        S_lema_vetorial=S_vec,
        S_sem=S_sem,
        S_struct=S_struct,
    )
    for p in (OUT_ANCORAGEM_LLM, OUT_QUESTION_LEMMAS, OUT_HIBRIDO_JSON, OUT_HIBRIDO_NPZ):
        sync_to_drive(p)

    print(
        f"[OK] {OUT_ANCORAGEM_LLM}, {OUT_QUESTION_LEMMAS}, {OUT_HIBRIDO_NPZ} e {OUT_HIBRIDO_JSON} "
        "gravados em /content e sincronizados no Google Drive!"
    )


if __name__ == "__main__":
    main()
