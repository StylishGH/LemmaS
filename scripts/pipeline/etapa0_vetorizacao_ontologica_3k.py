"""Etapa Zero da spec v2 (v2.1 — Vetorização Corrigida com Título + Dígitos no Esqueleto LaTeX + ML Super-Famílias).

Entrada: lemas_3k.json (2.000 do banco + 1.000 propostos, ids 2–3001).
Correspondência de campos com a spec: titulo = titulo, materia = materia,
condicao = gatilho_reconhecimento, descricao = intuicao_prova, formula = formula_latex.

Correções da Vetorização (v2.1):
1. S_exp: BGE-M3 sobre título + matéria + condição + explicação (título como 1º campo
   para evitar colapso de vetores em lemas propostos com explicação em template).
2. S_form: TF-IDF do esqueleto de operadores LaTeX mantendo dígitos (\\d+), descartando
   apenas letras de variáveis mudas (diferencia \\frac{4}{3}\\pi R^3 de \\frac{1}{3}\\pi r^2 h).
3. Checkpoint parcial novo (lemas_vetores_3k_v2_parcial.jsonl) e remoção do parcial antigo
   para jamais misturar vetores sem título com vetores novos.
4. Classificador topológico de pares (thresholds mantidos: s_exp >= 0.88 e s_form >= 0.80)
   + Descoberta não supervisionada de Super-Famílias (Centered SVD 128D + Spherical K-Means
   por Cosine Silhouette Score + Soft-Assignment von Mises-Fisher).
"""

from collections import Counter
import json
import math
import re
import shutil
from pathlib import Path

import numpy as np

CATALOG_PATH = "lemas_3k.json"
VECTORS_PATH = "lemas_vetores_3k.json"
SIMILARITY_PATH = "lemas_similaridade_top10_3k.json"
MATRIX_PATH = "lemas_similaridade_3k.npy"
FORM_MATRIX_PATH = "lemas_similaridade_form_3k.npy"
ORDER_PATH = "lemas_3k_ordem.json"
DUPLICATES_PATH = "lemas_duplicatas_3k.json"
COUSINS_PATH = "lemas_primos_3k.json"
ISOMORPHISMS_PATH = "lemas_isomorfismos_3k.json"
FAMILIES_PATH = "lemas_super_familias_3k.json"
ML_METRICS_PATH = "lemas_super_familias_metricas_ml.json"
OLD_PARTIAL_PATH = "lemas_vetores_3k_parcial.jsonl"
PARTIAL_PATH = "lemas_vetores_3k_v2_parcial.jsonl"
DRIVE_DIR = Path("/content/drive/MyDrive/lemmas-pipeline")

MODEL_ID = "BAAI/bge-m3"
BATCH_SIZE = 250
TOP_K = 10
TOP_CLASSIFY = 8

# Hiperparâmetros do pipeline ML de Super-Famílias
SVD_COMPONENTS = 128
K_CANDIDATES = [35, 45, 55, 65, 75, 85]
WEIGHT_EXP = 0.75
WEIGHT_FORM = 0.25
VMF_KAPPA = 15.0
VMF_MIN_SECOND_PROB = 0.22
VMF_MIN_SECOND_SIM = 0.25
ORPHAN_MAX_SIM = 0.28


def semantic_text(lemma):
    parts = []
    if lemma.get("titulo"):
        parts.append(f"Título: {lemma['titulo']}")
    if lemma.get("materia"):
        parts.append(f"Matéria: {lemma['materia']}")
    if lemma.get("gatilho_reconhecimento"):
        parts.append(f"Quando aplicar (Gatilho): {lemma['gatilho_reconhecimento']}")
    if lemma.get("intuicao_prova"):
        parts.append(f"Explicação da propriedade: {lemma['intuicao_prova']}")
    return ". ".join(parts)


def normalize_latex_skeleton(latex_str):
    if not isinstance(latex_str, str) or not latex_str.strip():
        return ""
    tokens = re.findall(r"\\[a-zA-Z]+|\d+|[\+\-\=\<\>\^\{\}\(\)\[\]\|]", latex_str)
    return " ".join(tokens)


def count_latex_commands(latex_str):
    if not isinstance(latex_str, str):
        return 0
    return len(re.findall(r"\\[a-zA-Z]+", latex_str))


def sync_to_drive(path):
    if DRIVE_DIR.parent.exists():
        DRIVE_DIR.mkdir(parents=True, exist_ok=True)
        shutil.copy(path, DRIVE_DIR / Path(path).name)


def purge_old_partial():
    """Remove o checkpoint antigo (sem título) local e no Drive para evitar contaminação."""
    local_old = Path(OLD_PARTIAL_PATH)
    if local_old.exists():
        local_old.unlink()
        print(f"[Limpeza] Checkpoint antigo removido: {local_old}")
    if DRIVE_DIR.parent.exists():
        drive_old = DRIVE_DIR / OLD_PARTIAL_PATH
        if drive_old.exists():
            drive_old.unlink()
            print(f"[Limpeza] Checkpoint antigo removido do Drive: {drive_old}")


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


def append_partial(path, records):
    with open(path, "a", encoding="utf-8") as f:
        for record in records:
            f.write(json.dumps(record, ensure_ascii=False) + "\n")
    sync_to_drive(path)


def encode_all(catalog):
    purge_old_partial()
    vectors = load_partial(PARTIAL_PATH)
    done = {r["id"] for r in vectors}
    pending = [lemma for lemma in catalog if lemma["id"] not in done]
    if not pending:
        print(
            f"[Cache BGE-M3 v2.1] {len(vectors)}/{len(catalog)} vetores já presentes em {PARTIAL_PATH}."
        )
        return vectors

    import torch
    from sentence_transformers import SentenceTransformer

    device = "cuda" if torch.cuda.is_available() else "cpu"
    if device == "cuda":
        print(f"[GPU Ativa] Codificando com {MODEL_ID} na GPU: {torch.cuda.get_device_name(0)}")
    else:
        print(f"[Aviso CPU] GPU não detectada; codificando em CPU.")
    model = SentenceTransformer(MODEL_ID, device=device)
    for start in range(0, len(pending), BATCH_SIZE):
        chunk = pending[start:start + BATCH_SIZE]
        embeddings = model.encode(
            [semantic_text(lemma) for lemma in chunk],
            batch_size=64,
            normalize_embeddings=True,
            show_progress_bar=True,
        )
        records = [
            {
                "id": lemma["id"],
                "codigo": lemma["codigo"],
                "origem": lemma.get("origem"),
                "vetor": embedding.tolist(),
            }
            for lemma, embedding in zip(chunk, embeddings)
        ]
        vectors.extend(records)
        append_partial(PARTIAL_PATH, records)
        print(f"vetorizados {len(vectors)}/{len(catalog)}")
    return vectors


def build_similarity(vectors):
    by_id = {v["id"]: v for v in vectors}
    ids = [v["id"] for v in vectors]
    matrix = np.array([v["vetor"] for v in vectors], dtype=np.float32)
    sims = matrix @ matrix.T
    np.fill_diagonal(sims, 1.0)
    sims_top = sims.copy()
    np.fill_diagonal(sims_top, -np.inf)
    order = [
        {"id": v["id"], "codigo": v["codigo"], "origem": v.get("origem")}
        for v in vectors
    ]
    results = []
    k = min(TOP_K, len(ids) - 1)
    for i, lemma_id in enumerate(ids):
        top = np.argpartition(sims_top[i], -k)[-k:]
        top = top[np.argsort(-sims_top[i][top])]
        results.append(
            {
                "id": lemma_id,
                "codigo": by_id[lemma_id]["codigo"],
                "origem": by_id[lemma_id].get("origem"),
                "similares": [
                    {
                        "id": ids[j],
                        "codigo": by_id[ids[j]]["codigo"],
                        "origem": by_id[ids[j]].get("origem"),
                        "cosseno": round(float(sims[i][j]), 4),
                    }
                    for j in top
                ],
            }
        )
    return results, sims, order, matrix


def build_form_matrix(catalog, semantic_docs):
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.metrics.pairwise import cosine_similarity
    from sklearn.preprocessing import normalize

    n = len(catalog)
    skeletons = []
    for lemma, doc in zip(catalog, semantic_docs):
        skeleton = normalize_latex_skeleton(lemma.get("formula_latex") or "")
        if not skeleton:
            skeleton = normalize_latex_skeleton(doc)
        skeletons.append(skeleton)
    # Unigramas + Bigramas estruturais (ngram_range=(1, 2)): preserva a posição dos dígitos e
    # operadores (ex.: '^ 3' != '^ 2' e '{ 4' != '{ 1'), diferenciando Esfera de Cone sem alterar thresholds.
    tfidf = TfidfVectorizer(token_pattern=r"[^\s]+", ngram_range=(1, 2))
    token_counts = np.array([len(s.split()) for s in skeletons], dtype=np.int32)
    try:
        mat_form_sparse = tfidf.fit_transform(skeletons)
        mat_form_dense = normalize(mat_form_sparse, norm="l2").toarray().astype(np.float32)
        sim_form = cosine_similarity(mat_form_sparse)
    except ValueError:
        mat_form_dense = np.zeros((n, 1), dtype=np.float32)
        sim_form = np.zeros((n, n), dtype=np.float32)
    np.fill_diagonal(sim_form, 1.0)
    return sim_form, mat_form_dense, token_counts, skeletons


def classify_pairs(ids, by_id, sim_exp, sim_form, token_counts=None):
    duplicates, cousins, isomorphisms = [], [], []
    n = len(ids)
    k = min(TOP_CLASSIFY, n - 1)
    for i in range(n):
        # 1. Vizinhança semântica (duplicatas e primos)
        scores_e = sim_exp[i].copy()
        scores_e[i] = -np.inf
        top_e = np.argpartition(scores_e, -k)[-k:]
        top_e = top_e[np.argsort(-scores_e[top_e])]
        for j in top_e:
            s_e = float(sim_exp[i, j])
            s_f = float(sim_form[i, j])
            if s_e >= 0.70:
                if i < j and s_e >= 0.88 and s_f >= 0.80:
                    duplicates.append(
                        {
                            "canonical_lemma_id": ids[i],
                            "duplicate_lemma_id": ids[j],
                            "titulo_A": by_id[ids[i]].get("titulo"),
                            "titulo_B": by_id[ids[j]].get("titulo"),
                            "sim_explicacao": round(s_e, 4),
                            "sim_formula": round(s_f, 4),
                        }
                    )
                else:
                    cousins.append(
                        {
                            "lemma_id": ids[i],
                            "cousin_lemma_id": ids[j],
                            "affinity_score": round(0.75 * s_e + 0.25 * s_f, 4),
                            "sim_explicacao": round(s_e, 4),
                            "sim_formula": round(s_f, 4),
                        }
                    )

        # 2. Vizinhança estrutural LaTeX (isomorfismos reais: fórmula idêntica, domínio distinto)
        if token_counts is not None and token_counts[i] < 5:
            continue
        scores_f = sim_form[i].copy()
        scores_f[i] = -np.inf
        top_f = np.argpartition(scores_f, -k)[-k:]
        top_f = top_f[np.argsort(-scores_f[top_f])]
        for j in top_f:
            if i >= j:
                continue
            if token_counts is not None and token_counts[j] < 5:
                continue
            if (
                count_latex_commands(by_id[ids[i]].get("formula_latex")) < 2
                or count_latex_commands(by_id[ids[j]].get("formula_latex")) < 2
            ):
                continue
            s_e = float(sim_exp[i, j])
            s_f = float(sim_form[i, j])
            if s_e < 0.70 and s_f >= 0.90:
                isomorphisms.append(
                    {
                        "lemma_id": ids[i],
                        "isomorfo_id": ids[j],
                        "titulo_A": by_id[ids[i]].get("titulo"),
                        "materia_A": by_id[ids[i]].get("materia"),
                        "titulo_B": by_id[ids[j]].get("titulo"),
                        "materia_B": by_id[ids[j]].get("materia"),
                        "sim_explicacao": round(s_e, 4),
                        "sim_formula": round(s_f, 4),
                    }
                )
    return duplicates, cousins, isomorphisms


def cluster_families_ml(emb_exp, tfidf_form_dense, catalog):
    """Descobre Super-Famílias via Centralização Anisotrópica + SVD + Spherical K-Means + Softmax vMF."""
    from sklearn.cluster import KMeans
    from sklearn.decomposition import TruncatedSVD
    from sklearn.metrics import calinski_harabasz_score, silhouette_score
    from sklearn.preprocessing import normalize

    n = emb_exp.shape[0]
    emb_centered = emb_exp - emb_exp.mean(axis=0, keepdims=True) if n > 2 else emb_exp
    norm_exp = normalize(emb_centered, norm="l2") * math.sqrt(WEIGHT_EXP)
    norm_form = normalize(tfidf_form_dense, norm="l2") * math.sqrt(WEIGHT_FORM)
    x_fused = normalize(np.hstack([norm_exp, norm_form]), norm="l2")
    if n > 2:
        x_fused = x_fused - x_fused.mean(axis=0, keepdims=True)

    n_comp = min(SVD_COMPONENTS, x_fused.shape[1] - 1, n - 1)
    if n_comp >= 2:
        svd = TruncatedSVD(n_components=n_comp, random_state=42)
        x_reduced = normalize(svd.fit_transform(x_fused), norm="l2")
        explained_var = float(svd.explained_variance_ratio_.sum())
        var_curve = [round(float(v), 6) for v in np.cumsum(svd.explained_variance_ratio_)]
    else:
        x_reduced = normalize(x_fused, norm="l2")
        explained_var = 1.0
        var_curve = [1.0]

    valid_ks = [k for k in K_CANDIDATES if 2 <= k < n]
    if not valid_ks:
        valid_ks = [max(2, min(n - 1, 2))] if n > 2 else [1]

    best_k = valid_ks[0]
    best_score = -1.0
    best_model = None
    k_evaluations = []

    for k in valid_ks:
        kmeans = KMeans(n_clusters=k, n_init=10, random_state=42)
        labels = kmeans.fit_predict(x_reduced)
        score = float(silhouette_score(x_reduced, labels, metric="cosine")) if k > 1 else 0.0
        ch_score = float(calinski_harabasz_score(x_reduced, labels)) if k > 1 else 0.0
        inertia = float(kmeans.inertia_)
        k_evaluations.append(
            {
                "k": k,
                "silhouette_cosine": round(score, 4),
                "calinski_harabasz": round(ch_score, 2),
                "inertia": round(inertia, 2),
            }
        )
        print(
            f"[ML Super-Famílias] K={k:2d} -> Silhouette (Cosine): {score:.4f} | "
            f"Calinski-Harabasz: {ch_score:6.2f} | Inertia: {inertia:.2f}"
        )
        if score > best_score:
            best_score = score
            best_k = k
            best_model = kmeans

    print(
        f"[ML Selecionado] K={best_k} Super-Famílias "
        f"(Silhouette={best_score:.4f} | SVD {n_comp}D variância explicada={explained_var:.2%})"
    )

    centroids = normalize(best_model.cluster_centers_, norm="l2")
    sim_to_centroids = x_reduced @ centroids.T

    logits = VMF_KAPPA * sim_to_centroids
    logits_shifted = logits - logits.max(axis=1, keepdims=True)
    exp_logits = np.exp(logits_shifted)
    vmf_probs = exp_logits / exp_logits.sum(axis=1, keepdims=True)

    if best_k >= 2:
        top2_idx = np.argsort(-sim_to_centroids, axis=1)[:, :2]
        top2_sim = np.take_along_axis(sim_to_centroids, top2_idx, axis=1)
        top2_prob = np.take_along_axis(vmf_probs, top2_idx, axis=1)
    else:
        top2_idx = np.zeros((n, 2), dtype=int)
        top2_sim = np.hstack([sim_to_centroids, np.full((n, 1), -1.0)])
        top2_prob = np.hstack([np.ones((n, 1)), np.zeros((n, 1))])

    families = []
    n_hybrids = 0
    n_orphans = 0
    cluster_members = {cid: [] for cid in range(best_k)}

    for idx, lemma in enumerate(catalog):
        prim_id = int(top2_idx[idx, 0])
        sec_id = int(top2_idx[idx, 1])
        s1 = float(top2_sim[idx, 0])
        s2 = float(top2_sim[idx, 1])
        p1 = float(top2_prob[idx, 0])
        p2 = float(top2_prob[idx, 1])
        margin = s1 - s2

        is_orphan = bool(s1 < ORPHAN_MAX_SIM)
        is_hybrid = bool(
            best_k >= 2
            and not is_orphan
            and p2 >= VMF_MIN_SECOND_PROB
            and s2 >= VMF_MIN_SECOND_SIM
        )
        if is_hybrid:
            n_hybrids += 1
        if is_orphan:
            n_orphans += 1

        cluster_members[prim_id].append((idx, s1, lemma))

        families.append(
            {
                "id": lemma["id"],
                "codigo": lemma["codigo"],
                "titulo": lemma.get("titulo"),
                "materia": lemma.get("materia"),
                "origem": lemma.get("origem"),
                "super_family_id": prim_id,
                "score_primaria": round(s1, 4),
                "prob_vmf_primaria": round(p1, 4),
                "super_family_secundaria_id": sec_id if is_hybrid else None,
                "score_secundaria": round(s2, 4),
                "prob_vmf_secundaria": round(p2, 4),
                "margem_voronoi": round(margin, 4),
                "is_hibrido": is_hybrid,
                "is_orfao_atipico": is_orphan,
            }
        )

    family_summaries = []
    n_interdisciplinary = 0
    for cid in range(best_k):
        members = cluster_members[cid]
        if not members:
            continue
        members_sorted = sorted(members, key=lambda t: -t[1])
        _, medoid_sim, medoid_lemma = members_sorted[0]
        mat_counts = Counter((m[2].get("materia") or "Sem Matéria") for m in members)
        dom_mat, dom_count = mat_counts.most_common(1)[0]
        purity = dom_count / len(members)
        if len(mat_counts) >= 3 or purity < 0.70:
            n_interdisciplinary += 1
        family_summaries.append(
            {
                "super_family_id": cid,
                "tamanho_primario": len(members),
                "medoid_id": medoid_lemma["id"],
                "medoid_titulo": medoid_lemma.get("titulo"),
                "materia_dominante": dom_mat,
                "pureza_materia_dominante": round(purity, 4),
                "n_materias_distintas": len(mat_counts),
                "distribuicao_materias": dict(mat_counts.most_common(5)),
                "medoid_sim_centroide": round(float(medoid_sim), 4),
            }
        )

    ml_report = {
        "versao_vetorizacao": "v2.1 (titulo em S_exp + digitos em S_form)",
        "metodo": "Anisotropy-Centered SVD + Spherical K-Means + von Mises-Fisher (vMF) Soft-Clustering",
        "pesos_fusao_produto_interno": {"semantica_bge_m3": WEIGHT_EXP, "esqueleto_latex_tfidf": WEIGHT_FORM},
        "svd_n_components": n_comp,
        "svd_explained_variance_total": round(explained_var, 4),
        "svd_cumulative_variance_curve": var_curve,
        "k_candidates_avaliados": k_evaluations,
        "best_k": best_k,
        "best_silhouette_cosine": round(best_score, 4),
        "vmf_kappa": VMF_KAPPA,
        "vmf_min_second_prob": VMF_MIN_SECOND_PROB,
        "vmf_min_second_sim": VMF_MIN_SECOND_SIM,
        "orphan_max_sim": ORPHAN_MAX_SIM,
        "total_lemas": n,
        "lemas_hibridos_fronteira": n_hybrids,
        "pct_hibridos": round(100.0 * n_hybrids / max(n, 1), 2),
        "lemas_orfaos_atipicos": n_orphans,
        "pct_orfaos": round(100.0 * n_orphans / max(n, 1), 2),
        "familias_interdisciplinares": n_interdisciplinary,
        "resumo_super_familias": family_summaries,
    }
    return families, ml_report


def validate_rerun(catalog, skeletons, sims, sim_form, duplicates):
    """Executa as 4 validações obrigatórias da correção v2.1."""
    print("\n" + "=" * 95)
    print("VALIDAÇÃO PÓS-RERUN DA VETORIZAÇÃO CORRIGIDA (v2.1)")
    print("=" * 95)

    # 1. Esqueletos de esfera, cone e pirâmide devem diferir
    targets = ["volume da esfera", "volume do cone", "volume da pirâmide"]
    found_idx = {}
    for idx, lemma in enumerate(catalog):
        t_low = (lemma.get("titulo") or "").lower()
        for tgt in targets:
            if tgt in t_low and tgt not in found_idx:
                found_idx[tgt] = idx

    print("1. Esqueletos LaTeX (com dígitos preservados):")
    skel_set = set()
    for tgt in targets:
        if tgt in found_idx:
            i = found_idx[tgt]
            sk = skeletons[i]
            skel_set.add(sk)
            print(
                f"   • {catalog[i].get('titulo')} (ID {catalog[i]['id']}): "
                f"formula='{catalog[i].get('formula_latex')}' -> esqueleto='{sk}'"
            )
    if len(skel_set) == len(found_idx) and len(found_idx) >= 2:
        print("   [PASS] Os esqueletos de esfera, cone e pirâmide são distintos!")
    else:
        print("   [WARN] Verifique os esqueletos acima.")

    # 2. Esfera vs Cone NÃO pode aparecer como duplicata
    esf_cone_dups = [
        d for d in duplicates
        if (
            ("esfera" in (d.get("titulo_A") or "").lower() and "cone" in (d.get("titulo_B") or "").lower())
            or ("cone" in (d.get("titulo_A") or "").lower() and "esfera" in (d.get("titulo_B") or "").lower())
        )
    ]
    if "volume da esfera" in found_idx and "volume do cone" in found_idx:
        ie, ic = found_idx["volume da esfera"], found_idx["volume do cone"]
        print(
            f"2. Volume da Esfera vs Volume do Cone: "
            f"sim_explicacao={sims[ie, ic]:.4f} | sim_formula={sim_form[ie, ic]:.4f} | "
            f"pares em duplicatas={len(esf_cone_dups)}"
        )
    print(f"   [{'PASS' if not esf_cone_dups else 'FAIL'}] Esfera vs Cone fora da lista de duplicatas.")

    # 3. Não pode haver sim_explicacao == 1.0 entre lemas de título e fórmula diferentes
    n = len(catalog)
    false_collapses = []
    for i in range(n):
        for j in range(i + 1, n):
            if sims[i, j] >= 0.9999:
                ta = (catalog[i].get("titulo") or "").strip().lower()
                tb = (catalog[j].get("titulo") or "").strip().lower()
                fa = (catalog[i].get("formula_latex") or "").strip()
                fb = (catalog[j].get("formula_latex") or "").strip()
                if ta != tb and fa != fb:
                    false_collapses.append((catalog[i]["id"], catalog[i].get("titulo"), catalog[j]["id"], catalog[j].get("titulo")))
    print(
        f"3. Colapsos de template (sim_explicacao=1.0 com título e fórmula diferentes): {len(false_collapses)} pares "
        f"[{'PASS' if len(false_collapses) == 0 else 'WARN'}]"
    )

    # 4. Queda de duplicatas em relação aos 8.725 pares antigos
    print(
        f"4. Queda de duplicatas: 8.725 (antigo sem título/dígitos) -> {len(duplicates)} pares agora "
        f"(redução de {8725 - len(duplicates):+d} pares falsos!)."
    )


def resolve_catalog_path():
    p = Path(CATALOG_PATH)
    if p.exists():
        return p
    dp = DRIVE_DIR / CATALOG_PATH
    if dp.exists():
        shutil.copy(dp, p)
        return p
    raise FileNotFoundError(f"Arquivo {CATALOG_PATH} não encontrado em /content nem em {DRIVE_DIR}")


def main():
    cat_path = resolve_catalog_path()
    catalog = json.loads(cat_path.read_text(encoding="utf-8"))
    vectors = encode_all(catalog)
    by_vec = {v["id"]: v for v in vectors}
    vectors = [by_vec[lemma["id"]] for lemma in catalog]
    Path(VECTORS_PATH).write_text(
        json.dumps(vectors, ensure_ascii=False), encoding="utf-8"
    )
    top, sims, order, emb_matrix = build_similarity(vectors)
    Path(SIMILARITY_PATH).write_text(
        json.dumps(top, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    np.save(MATRIX_PATH, sims)
    Path(ORDER_PATH).write_text(
        json.dumps(order, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    semantic_docs = [semantic_text(lemma) for lemma in catalog]
    sim_form, mat_form_dense, token_counts, skeletons = build_form_matrix(catalog, semantic_docs)
    np.save(FORM_MATRIX_PATH, sim_form)
    by_id = {lemma["id"]: lemma for lemma in catalog}
    ids = [lemma["id"] for lemma in catalog]
    duplicates, cousins, isomorphisms = classify_pairs(ids, by_id, sims, sim_form, token_counts)
    Path(DUPLICATES_PATH).write_text(
        json.dumps(duplicates, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    Path(COUSINS_PATH).write_text(
        json.dumps(cousins, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    Path(ISOMORPHISMS_PATH).write_text(
        json.dumps(isomorphisms, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    families, ml_report = cluster_families_ml(emb_matrix, mat_form_dense, catalog)
    Path(FAMILIES_PATH).write_text(
        json.dumps(families, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    Path(ML_METRICS_PATH).write_text(
        json.dumps(ml_report, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    for path in (
        VECTORS_PATH,
        SIMILARITY_PATH,
        MATRIX_PATH,
        FORM_MATRIX_PATH,
        ORDER_PATH,
        DUPLICATES_PATH,
        COUSINS_PATH,
        ISOMORPHISMS_PATH,
        FAMILIES_PATH,
        ML_METRICS_PATH,
    ):
        sync_to_drive(path)
    print(
        f"lemas vetorizados: {len(vectors)}, "
        f"matrizes {sims.shape[0]}x{sims.shape[1]} em {MATRIX_PATH} e {FORM_MATRIX_PATH}, "
        f"duplicatas: {len(duplicates)}, primos: {len(cousins)}, "
        f"isomorfismos: {len(isomorphisms)}, "
        f"super-famílias ML: K={ml_report['best_k']} (Silhouette={ml_report['best_silhouette_cosine']}), "
        f"híbridos vMF: {ml_report['lemas_hibridos_fronteira']} ({ml_report['pct_hibridos']}%), "
        f"órfãos: {ml_report['lemas_orfaos_atipicos']} ({ml_report['pct_orfaos']}%), "
        f"famílias interdisciplinares: {ml_report['familias_interdisciplinares']}/{ml_report['best_k']}"
    )
    validate_rerun(catalog, skeletons, sims, sim_form, duplicates)


if __name__ == "__main__":
    main()
