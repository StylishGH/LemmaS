"""Etapa 1 — Passo Vetorial da Ancoragem: 62 questões rotuladas x 3.000 lemas.

Universo: 12 questões do piloto (semente) + 50 do Lote 1 (CEDERJ).
Entradas (local em /content ou Drive /content/drive/MyDrive/lemmas-pipeline):
- metodos_amostra_v2.json / solucoes_dois_modelos.json  (piloto, 12)
- metodos_lote1.json / solucoes_lote1.json / reverificacao_8.json (lote 1, 50)
- questoes_*.json (qualquer arquivo com "enunciado" por id)
- lemas_3k.json, lemas_vetores_3k.json (v2.1), lemas_super_familias_3k.json

O que faz:
1. Ancoragem (AI INTERPRETATION, nunca rótulo validado): para cada questão,
   cruza (a) os rótulos de método do solver/verificador e (b) o enunciado,
   ambos codificados com o mesmo BGE-M3 dos lemas, contra os 3.000 vetores.
   score = 0.65 * sim_metodo + 0.35 * sim_enunciado.
2. Similaridade entre questões em 3 representações:
   S_enun (texto do enunciado), S_lema (centróide ponderado dos lemas
   ancorados) e S_fam (perfil de super-famílias). Compara as três.

Rótulos de método são usados como vieram (sem traduzir/normalizar no arquivo);
só a string de consulta ao encoder troca '-' e '_' por espaço.
"""

import glob
import json
import shutil
from collections import Counter, defaultdict
from pathlib import Path

import numpy as np

DRIVE_DIR = Path("/content/drive/MyDrive/lemmas-pipeline")
MODEL_ID = "BAAI/bge-m3"
VERSAO_VETORES = "v2.1 (titulo em S_exp + digitos em S_form)"

W_METODO, W_ENUNCIADO = 0.65, 0.35
W_PRINCIPAL, W_AUXILIAR = 1.00, 0.90
TOP_CANDIDATOS = 25
TOP_ANCORA = 5
LIMIAR_BAIXA_CONFIANCA = 0.55  # sim_metodo do top-1 abaixo disso => revisar

OUT_ANCORAGEM = "ancoragem_vetorial_62.json"
OUT_MATRIZES = "similaridade_questoes_62.npz"
OUT_RELATORIO = "ancoragem_62_relatorio.json"


# ---------------------------------------------------------------- I/O
def resolve(name):
    local = Path(name)
    if local.exists():
        return local
    if (DRIVE_DIR / name).exists():
        return DRIVE_DIR / name
    return None


def load_json(name, required=True):
    path = resolve(name)
    if path is None:
        if required:
            raise FileNotFoundError(f"{name} não encontrado em ./ nem em {DRIVE_DIR}")
        print(f"[Aviso] {name} ausente — ignorado.")
        return None
    return json.loads(path.read_text(encoding="utf-8"))


def sync_to_drive(path):
    if DRIVE_DIR.parent.exists():
        DRIVE_DIR.mkdir(parents=True, exist_ok=True)
        shutil.copy(path, DRIVE_DIR / Path(path).name)


def as_list(value):
    if value is None:
        return []
    if isinstance(value, str):
        return [value] if value.strip() else []
    return [v for v in value if isinstance(v, str) and v.strip()]


# ------------------------------------------------------ questões (62)
def load_enunciados():
    """Coleta enunciado/materia/topico por id de qualquer questoes_*.json e soluções."""
    info = defaultdict(dict)
    names = {Path(p).name for p in glob.glob("questoes*.json") + glob.glob(str(DRIVE_DIR / "questoes*.json"))}
    names |= {"solucoes_dois_modelos.json", "solucoes_lote1.json"}
    for name in sorted(names):
        path = resolve(name)
        try:
            data = json.loads(path.read_text(encoding="utf-8")) if path else None
        except (json.JSONDecodeError, UnicodeDecodeError):
            data = None
        if isinstance(data, dict):  # ex.: {"questoes": [...]}
            data = next((v for v in data.values() if isinstance(v, list)), None)
        if not isinstance(data, list):
            continue
        for r in data:
            if not isinstance(r, dict) or "id" not in r:
                continue
            slot = info[r["id"]]
            for key in ("enunciado", "materia", "topico", "solucao_modelo_a"):
                if r.get(key) and not slot.get(key):
                    slot[key] = r[key]
    return info


def normalize_metodos(records, lote, rev=None):
    rev = rev or {}
    out = []
    for r in records:
        qid = r["id"]
        principal = as_list(r.get("principal") or r.get("principal_final"))
        auxiliares = as_list(r.get("auxiliares"))
        if not auxiliares and r.get("metodos_finais"):
            auxiliares = [m for m in as_list(r["metodos_finais"]) if m not in principal]
        verificada = r.get("verificada", r.get("correta"))
        fonte = "solver+verificador_7b"
        if qid in rev:  # 32B substitui o veredicto truncado do 7B
            rv = rev[qid]
            principal = as_list(rv.get("principal_final_32b")) or principal
            auxiliares = [m for m in as_list(rv.get("metodos_finais_32b")) if m not in principal]
            verificada = rv.get("correta_32b") is True
            fonte = "reverificacao_32b"
        out.append(
            {
                "id": qid,
                "lote": lote,
                "principal": principal,
                "auxiliares": auxiliares,
                "verificada": bool(verificada),
                "fonte_rotulo": fonte,
            }
        )
    return out


def load_questoes():
    piloto = load_json("metodos_amostra_v2.json")
    lote1 = load_json("metodos_lote1.json")
    rev = {r["id"]: r for r in (load_json("reverificacao_8.json", required=False) or [])}
    questoes = normalize_metodos(piloto, "piloto") + normalize_metodos(lote1, "lote1", rev)

    ids = [q["id"] for q in questoes]
    dup = [i for i, c in Counter(ids).items() if c > 1]
    if dup:
        raise ValueError(f"ids repetidos entre piloto e lote 1: {dup}")
    print(f"[Questões] piloto={len(piloto)} | lote1={len(lote1)} | total={len(questoes)} (esperado 62)")
    if len(questoes) != 62:
        print("[Aviso] total diferente de 62 — conferir arquivos antes de concluir qualquer coisa.")

    info = load_enunciados()
    sem_enunciado = []
    for q in questoes:
        meta = info.get(q["id"], {})
        q["materia"] = meta.get("materia")
        q["topico"] = meta.get("topico")
        q["enunciado"] = meta.get("enunciado")
        if not q["enunciado"]:
            sem_enunciado.append(q["id"])
            # fallback honesto: usa o início da solução do modelo como contexto
            q["contexto_fallback"] = (meta.get("solucao_modelo_a") or "")[:800]
    if sem_enunciado:
        print(f"[Aviso] {len(sem_enunciado)} questões sem enunciado (usando solução como contexto): {sem_enunciado}")
    sem_rotulo = [q["id"] for q in questoes if not q["principal"] and not q["auxiliares"]]
    if sem_rotulo:
        print(f"[Aviso] questões sem rótulo de método (ancoragem só pelo enunciado): {sem_rotulo}")
    return questoes


# -------------------------------------------------------------- lemas
def load_lemas():
    catalog = load_json("lemas_3k.json")
    vectors = load_json("lemas_vetores_3k.json")
    families = {f["id"]: f for f in load_json("lemas_super_familias_3k.json")}
    by_id = {l["id"]: l for l in catalog}
    ids = [v["id"] for v in vectors]
    mat = np.asarray([v["vetor"] for v in vectors], dtype=np.float32)
    mat /= np.linalg.norm(mat, axis=1, keepdims=True) + 1e-12
    n_fam = 1 + max(f["super_family_id"] for f in families.values())
    print(f"[Lemas] {len(ids)} vetores {mat.shape[1]}d | {n_fam} super-famílias | versão {VERSAO_VETORES}")
    return ids, mat, by_id, families, n_fam


# ---------------------------------------------------------- encoding
def get_encoder():
    import torch
    from sentence_transformers import SentenceTransformer

    device = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"[Encoder] {MODEL_ID} em {device}" + (f" ({torch.cuda.get_device_name(0)})" if device == "cuda" else ""))
    return SentenceTransformer(MODEL_ID, device=device)


def encode(model, texts):
    if not texts:
        return np.zeros((0, 1024), dtype=np.float32)
    return np.asarray(model.encode(texts, batch_size=64, normalize_embeddings=True), dtype=np.float32)


def label_query(label):
    # mesmo formato de S_exp dos lemas ("Título: ...") para alinhar os espaços
    return "Título: " + label.replace("-", " ").replace("_", " ").strip()


def enunciado_query(q):
    parts = []
    if q.get("materia"):
        parts.append(f"Matéria: {q['materia']}")
    if q.get("topico"):
        parts.append(f"Tópico: {q['topico']}")
    parts.append(f"Enunciado: {q.get('enunciado') or q.get('contexto_fallback') or ''}")
    return ". ".join(parts)


# -------------------------------------------------------- ancoragem
def ancorar(questoes, lemma_ids, L, by_id, families):
    model = get_encoder()
    E_q = encode(model, [enunciado_query(q) for q in questoes])
    all_labels = sorted({lab for q in questoes for lab in q["principal"] + q["auxiliares"]})
    E_lab = dict(zip(all_labels, encode(model, [label_query(l) for l in all_labels])))
    print(f"[Encoder] {len(questoes)} enunciados + {len(all_labels)} rótulos distintos codificados")

    S_enun_lema = E_q @ L.T  # (62, 3000)
    resultados = []
    for qi, q in enumerate(questoes):
        sim_enun = S_enun_lema[qi]
        weighted = [(lab, W_PRINCIPAL) for lab in q["principal"]] + [(lab, W_AUXILIAR) for lab in q["auxiliares"]]
        if weighted:
            per_label = np.stack([w * (E_lab[lab] @ L.T) for lab, w in weighted])  # (n_lab, 3000)
            sim_met = per_label.max(axis=0)
            best_label_idx = per_label.argmax(axis=0)
            score = W_METODO * sim_met + W_ENUNCIADO * sim_enun
        else:
            per_label, sim_met, best_label_idx = None, np.zeros_like(sim_enun), None
            score = sim_enun.copy()

        cand = set(np.argsort(-sim_enun)[:TOP_CANDIDATOS]) | set(np.argsort(-sim_met)[:TOP_CANDIDATOS])
        top = sorted(cand, key=lambda j: -score[j])[:TOP_ANCORA]
        ancoras = []
        for rank, j in enumerate(top, 1):
            lid = lemma_ids[j]
            lem, fam = by_id.get(lid, {}), families.get(lid, {})
            ancoras.append(
                {
                    "rank": rank,
                    "lema_id": lid,
                    "codigo": lem.get("codigo"),
                    "titulo": lem.get("titulo"),
                    "materia_lema": lem.get("materia"),
                    "origem": lem.get("origem"),
                    "score": round(float(score[j]), 4),
                    "sim_metodo": round(float(sim_met[j]), 4),
                    "sim_enunciado": round(float(sim_enun[j]), 4),
                    "rotulo_que_casou": weighted[best_label_idx[j]][0] if weighted else None,
                    "super_family_id": fam.get("super_family_id"),
                    "super_family_secundaria_id": fam.get("super_family_secundaria_id"),
                }
            )
        gap = ancoras[0]["score"] - ancoras[1]["score"] if len(ancoras) > 1 else None
        resultados.append(
            {
                **{k: q.get(k) for k in ("id", "lote", "materia", "topico", "verificada", "fonte_rotulo", "principal", "auxiliares")},
                "tipo": "AI_INTERPRETATION",
                "status": "hipotese_vetorial",
                "modelo_encoder": MODEL_ID,
                "versao_vetores_lemas": VERSAO_VETORES,
                "pesos": {"metodo": W_METODO, "enunciado": W_ENUNCIADO},
                "ancoras": ancoras,
                "gap_top1_top2": round(gap, 4) if gap is not None else None,
                "baixa_confianca": bool(ancoras[0]["sim_metodo"] < LIMIAR_BAIXA_CONFIANCA) if weighted else True,
            }
        )
    return resultados, E_q


# ------------------------------------------- similaridade questões
def matrizes_similaridade(resultados, E_q, lemma_ids, L, n_fam):
    idx = {lid: j for j, lid in enumerate(lemma_ids)}
    n = len(resultados)
    S_enun = E_q @ E_q.T

    perfis_lema = np.zeros((n, L.shape[1]), dtype=np.float32)
    perfis_fam = np.zeros((n, n_fam), dtype=np.float32)
    sets = []
    for i, r in enumerate(resultados):
        s = set()
        for a in r["ancoras"]:
            w = max(a["score"], 0.0)
            perfis_lema[i] += w * L[idx[a["lema_id"]]]
            if a["super_family_id"] is not None:
                perfis_fam[i, a["super_family_id"]] += w
            if a["super_family_secundaria_id"] is not None:
                perfis_fam[i, a["super_family_secundaria_id"]] += 0.5 * w
            s.add(a["lema_id"])
        sets.append(s)
    perfis_lema /= np.linalg.norm(perfis_lema, axis=1, keepdims=True) + 1e-12
    perfis_fam /= np.linalg.norm(perfis_fam, axis=1, keepdims=True) + 1e-12
    S_lema = perfis_lema @ perfis_lema.T
    S_fam = perfis_fam @ perfis_fam.T
    shared = np.array([[len(a & b) for b in sets] for a in sets], dtype=np.int32)
    return S_enun, S_lema, S_fam, shared


def spearman(a, b):
    ra = np.argsort(np.argsort(a)).astype(float)
    rb = np.argsort(np.argsort(b)).astype(float)
    return float(np.corrcoef(ra, rb)[0, 1])


def analisar(resultados, S_enun, S_lema, S_fam, shared):
    n = len(resultados)
    iu = np.triu_indices(n, 1)
    materias = [r.get("materia") or "?" for r in resultados]
    same = np.array([[a == b for b in materias] for a in materias])[iu]

    def intra_inter(S):
        v = S[iu]
        return {"intra_materia": round(float(v[same].mean()), 4) if same.any() else None,
                "inter_materia": round(float(v[~same].mean()), 4) if (~same).any() else None}

    def silhouette_materia(S):
        if len(set(materias)) < 2:
            return None
        from sklearn.metrics import silhouette_score
        D = np.clip(1.0 - S, 0.0, 2.0)
        np.fill_diagonal(D, 0.0)
        return round(float(silhouette_score(D, materias, metric="precomputed")), 4)

    rel = {
        "n_questoes": n,
        "n_verificadas": sum(r["verificada"] for r in resultados),
        "n_baixa_confianca": sum(r["baixa_confianca"] for r in resultados),
        "distribuicao_materias": dict(Counter(materias)),
        "spearman": {
            "enun_vs_lema": round(spearman(S_enun[iu], S_lema[iu]), 4),
            "enun_vs_fam": round(spearman(S_enun[iu], S_fam[iu]), 4),
            "lema_vs_fam": round(spearman(S_lema[iu], S_fam[iu]), 4),
        },
        "media_intra_inter": {"S_enun": intra_inter(S_enun), "S_lema": intra_inter(S_lema), "S_fam": intra_inter(S_fam)},
        "silhouette_por_materia": {"S_enun": silhouette_materia(S_enun), "S_lema": silhouette_materia(S_lema), "S_fam": silhouette_materia(S_fam)},
        "pares_com_lema_em_comum": int((shared[iu] > 0).sum()),
        "total_pares": int(len(iu[0])),
    }

    lemas_freq = Counter((a["lema_id"], a["titulo"]) for r in resultados for a in r["ancoras"][:1])
    rel["top1_mais_frequentes"] = [{"lema_id": k[0], "titulo": k[1], "n_questoes": c} for k, c in lemas_freq.most_common(10)]

    def pares(score_vec, k=10):
        order = np.argsort(-score_vec)[:k]
        out = []
        for o in order:
            i, j = iu[0][o], iu[1][o]
            ri, rj = resultados[i], resultados[j]
            comuns = sorted({a["titulo"] for a in ri["ancoras"]} & {a["titulo"] for a in rj["ancoras"]})
            out.append({"q_a": ri["id"], "q_b": rj["id"], "materia_a": ri.get("materia"), "materia_b": rj.get("materia"),
                        "S_enun": round(float(S_enun[i, j]), 4), "S_lema": round(float(S_lema[i, j]), 4),
                        "S_fam": round(float(S_fam[i, j]), 4), "lemas_em_comum": comuns})
        return out

    rel["pares_mais_parecidos_por_lema"] = pares(S_lema[iu])
    rel["mesmo_metodo_enunciado_diferente"] = pares(S_lema[iu] - S_enun[iu])
    rel["falsos_amigos_enunciado_parecido_metodo_diferente"] = pares(S_enun[iu] - S_lema[iu])
    return rel


def main():
    questoes = load_questoes()
    lemma_ids, L, by_id, families, n_fam = load_lemas()
    resultados, E_q = ancorar(questoes, lemma_ids, L, by_id, families)
    S_enun, S_lema, S_fam, shared = matrizes_similaridade(resultados, E_q, lemma_ids, L, n_fam)
    relatorio = analisar(resultados, S_enun, S_lema, S_fam, shared)

    Path(OUT_ANCORAGEM).write_text(json.dumps(resultados, ensure_ascii=False, indent=2), encoding="utf-8")
    np.savez_compressed(OUT_MATRIZES, ids=np.array([r["id"] for r in resultados]),
                        S_enun=S_enun, S_lema=S_lema, S_fam=S_fam, lemas_em_comum=shared)
    Path(OUT_RELATORIO).write_text(json.dumps(relatorio, ensure_ascii=False, indent=2), encoding="utf-8")
    for p in (OUT_ANCORAGEM, OUT_MATRIZES, OUT_RELATORIO):
        sync_to_drive(p)
    print(f"[OK] {OUT_ANCORAGEM}, {OUT_MATRIZES}, {OUT_RELATORIO} gravados (local + Drive)")


if __name__ == "__main__":
    main()
