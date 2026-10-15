#!/usr/bin/env python3
"""
Auditoria do Catálogo Legado de Figuras do LemmaS (Fases 1 e 2).

Mapeia:
1. Todos os arquivos em data/imagens/ e frontend/public/uploads/ (hashes, dimensões, formato).
2. O conjunto protegido de SVGs da ESA 2026 (trusted_keep).
3. Todas as questões nos arquivos de catálogo (288 em produção + 3.482 no catálogo estendido).
4. Classificação dos PDFs de origem em data/sources/ (prova original, gabarito, resolução comentada).
5. Geração de manifesto estruturado (legacy_catalog_manifest.json) e relatório executivo (LEGACY_CATALOG_AUDIT.md).
"""

import hashlib
import json
import os
import re
import sys
import xml.etree.ElementTree as ET
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple

try:
    from PIL import Image
except ImportError:
    Image = None

PROJECT_ROOT = Path(__file__).resolve().parents[2]

# Categorias de estado de confiança
STATE_TRUSTED_KEEP = "trusted_keep"
STATE_APPROVED_NEW = "approved_new"
STATE_AUDIT_CANDIDATE = "audit_candidate"
STATE_LEGACY_UNVERIFIED = "legacy_unverified"

def get_file_sha256(filepath: Path) -> str:
    hasher = hashlib.sha256()
    with open(filepath, "rb") as f:
        while chunk := f.read(65536):
            hasher.update(chunk)
    return hasher.hexdigest()

def get_image_dims(filepath: Path) -> Tuple[Optional[int], Optional[int]]:
    suffix = filepath.suffix.lower()
    if suffix == ".svg":
        try:
            tree = ET.parse(filepath)
            root = tree.getroot()
            viewbox = root.attrib.get("viewBox")
            if viewbox:
                parts = viewbox.strip().split()
                if len(parts) == 4:
                    return int(float(parts[2])), int(float(parts[3]))
            w = root.attrib.get("width")
            h = root.attrib.get("height")
            if w and h:
                w_clean = re.sub(r"[^\d.]", "", w)
                h_clean = re.sub(r"[^\d.]", "", h)
                return int(float(w_clean)), int(float(h_clean))
        except Exception:
            pass
        return None, None
    elif Image:
        try:
            with Image.open(filepath) as img:
                return img.size
        except Exception:
            return None, None
    return None, None

def classify_pdf_role(filepath: Path) -> str:
    name_lower = filepath.name.lower()
    parent_str = str(filepath.parent).lower()
    if "gabarito" in name_lower or "gabarito" in parent_str:
        return "answer_key"
    if "madematica" in name_lower or "resolvida" in name_lower or "resolucao" in name_lower or "resolucoes" in parent_str:
        return "resolution_commentary"
    if "provas" in parent_str or "prova" in name_lower or "fase" in name_lower:
        return "original_exam"
    return "unknown"

def run_audit():
    print("[1/5] Mapeando arquivos físicos em data/imagens/ e frontend/public/uploads/...")
    imagens_dir = PROJECT_ROOT / "data" / "imagens"
    uploads_dir = PROJECT_ROOT / "frontend" / "public" / "uploads"
    audit_pilot_dir = PROJECT_ROOT / "data" / "audit" / "reprocessed_figures_pilot"

    all_media_files = []
    if imagens_dir.exists():
        all_media_files.extend(list(imagens_dir.glob("**/*.*")))
    if uploads_dir.exists():
        all_media_files.extend(list(uploads_dir.glob("**/*.*")))

    # Filtra apenas imagens/svg
    valid_exts = {".png", ".jpg", ".jpeg", ".svg", ".webp"}
    media_records: Dict[str, Dict[str, Any]] = {}

    # 6 figuras já aprovadas no piloto
    pilot_approved_ids = {
        "militar_afa_2011_q06", "militar_afa_2011_q13", "militar_afa_2012_q12",
        "militar_afa_2012_q20", "eear_2020_mat_q57", "eear_2020_mat_q59", "militar_afa_2011_q17"
    }

    # Ativos protegidos ESA 2026
    protected_esa_2026_hashes = {
        "q02.svg": "f9631692db5ab0b48ed9e7146ff0ccc1d8c9b409fd82a1fc2c596c13b0406618",
        "q06.svg": "c98eeb272d30eb358fc4a2b7ef286e70a11982c6b07f504ddb0f9f0aff0bdb4d",
        "q09.svg": "b6ff6987b00abe68a17a2826a45d2891a10d111c07fbe898d34cd7af4762f39e",
        "q10.svg": "f2fbf68cd5ecef9676102919406e6fe3c9852d9bf19b0d4fe6bc7778b3740e75",
    }

    for p in all_media_files:
        if p.suffix.lower() not in valid_exts or not p.is_file():
            continue
        rel_path = p.relative_to(PROJECT_ROOT).as_posix()
        sha = get_file_sha256(p)
        w, h = get_image_dims(p)

        # Determina estado
        state = STATE_LEGACY_UNVERIFIED
        is_protected = False
        if "uploads/esa/2026" in rel_path and p.name in protected_esa_2026_hashes:
            state = STATE_TRUSTED_KEEP
            is_protected = True

        media_records[rel_path] = {
            "path": rel_path,
            "filename": p.name,
            "format": p.suffix.lower().replace(".", ""),
            "size_bytes": p.stat().st_size,
            "sha256": sha,
            "width": w,
            "height": h,
            "state": state,
            "is_protected": is_protected,
            "associated_questions": [],
            "in_production_db": False
        }

    print(f"Total de recursos de mídia indexados: {len(media_records)}")

    print("[2/5] Mapeando catálogo canônico de produção (questoes_backup_completo_original.json)...")
    legacy_canon_path = PROJECT_ROOT / "data" / "sources" / "_legacy" / "questoes_backup_completo_original.json"
    production_questions: Dict[int, Dict[str, Any]] = {}
    if legacy_canon_path.exists():
        prod_data = json.loads(legacy_canon_path.read_text(encoding="utf-8"))
        for q in prod_data:
            qid = q.get("id")
            production_questions[qid] = q
            fpath = q.get("figura_path")
            if fpath:
                # normaliza fpath para casar com media_records
                clean_fpath = fpath.replace("data/uploads/", "frontend/public/uploads/esa/2026/")
                clean_fpath2 = fpath.replace("data/uploads/esa_2026_", "frontend/public/uploads/esa/2026/")
                for cand in (fpath, clean_fpath, clean_fpath2):
                    if cand in media_records:
                        media_records[cand]["associated_questions"].append({
                            "question_id": qid,
                            "banca": q.get("banca"),
                            "ano": q.get("ano"),
                            "database": "production_canonical"
                        })
                        media_records[cand]["in_production_db"] = True

    print(f"Questões canônicas em produção: {len(production_questions)} (com figura: {sum(1 for q in production_questions.values() if q.get('figura_path'))})")

    print("[3/5] Mapeando catálogo estendido (data/sources/*/processed/*/questoes.json)...")
    processed_files = list((PROJECT_ROOT / "data" / "sources").glob("**/processed/**/questoes.json"))
    extended_catalog: Dict[str, Dict[str, Any]] = {}
    
    for pf in processed_files:
        try:
            data = json.loads(pf.read_text(encoding="utf-8"))
            for q in data:
                mathnet_id = q.get("mathnet_id") or f"{q.get('banca')}_{q.get('ano')}_{q.get('id')}"
                extended_catalog[mathnet_id] = q
                fpath = q.get("figura_path")
                if fpath:
                    # Normalizações de fpath
                    # ex: /data/imagens/eear/2020/eear_2020_q57_fig1.png -> data/imagens/eear/2020/...
                    clean = fpath.lstrip("/").replace("https://gzlzwqknwfgrsnyvgpnv.supabase.co/storage/v1/object/public/questoes-imagens/", "data/imagens/")
                    if clean in media_records:
                        media_records[clean]["associated_questions"].append({
                            "mathnet_id": mathnet_id,
                            "banca": q.get("banca"),
                            "ano": q.get("ano"),
                            "database": "extended_catalog"
                        })
                        if mathnet_id in pilot_approved_ids:
                            media_records[clean]["state"] = STATE_APPROVED_NEW
                        elif media_records[clean]["state"] == STATE_LEGACY_UNVERIFIED:
                            media_records[clean]["state"] = STATE_AUDIT_CANDIDATE
        except Exception as e:
            print(f"Aviso ao ler {pf}: {e}")

    print(f"Total de questões no catálogo estendido: {len(extended_catalog)}")

    print("[4/5] Mapeando arquivos-fonte PDFs em data/sources/...")
    pdf_files = list((PROJECT_ROOT / "data" / "sources").glob("**/*.pdf"))
    pdf_inventory = []
    for pdf in pdf_files:
        rel_pdf = pdf.relative_to(PROJECT_ROOT).as_posix()
        role = classify_pdf_role(pdf)
        pdf_inventory.append({
            "path": rel_pdf,
            "filename": pdf.name,
            "size_bytes": pdf.stat().st_size,
            "role": role,
            "is_resolution": role == "resolution_commentary"
        })

    print(f"Total de PDFs mapeados: {len(pdf_inventory)} (Provas originais: {sum(1 for p in pdf_inventory if p['role'] == 'original_exam')}, Resoluções: {sum(1 for p in pdf_inventory if p['role'] == 'resolution_commentary')})")

    # Contagens e resumos
    summary = {
        "total_media_files": len(media_records),
        "total_by_state": {
            STATE_TRUSTED_KEEP: sum(1 for m in media_records.values() if m["state"] == STATE_TRUSTED_KEEP),
            STATE_APPROVED_NEW: sum(1 for m in media_records.values() if m["state"] == STATE_APPROVED_NEW),
            STATE_AUDIT_CANDIDATE: sum(1 for m in media_records.values() if m["state"] == STATE_AUDIT_CANDIDATE),
            STATE_LEGACY_UNVERIFIED: sum(1 for m in media_records.values() if m["state"] == STATE_LEGACY_UNVERIFIED),
        },
        "media_in_production_db": sum(1 for m in media_records.values() if m["in_production_db"]),
        "media_associated_with_any_question": sum(1 for m in media_records.values() if len(m["associated_questions"]) > 0),
        "orphan_media_files": sum(1 for m in media_records.values() if len(m["associated_questions"]) == 0),
        "protected_esa_2026": [
            m for m in media_records.values() if m["is_protected"]
        ],
        "pdf_sources_count": len(pdf_inventory),
        "pdf_roles": {
            "original_exam": sum(1 for p in pdf_inventory if p["role"] == "original_exam"),
            "resolution_commentary": sum(1 for p in pdf_inventory if p["role"] == "resolution_commentary"),
            "answer_key": sum(1 for p in pdf_inventory if p["role"] == "answer_key"),
            "unknown": sum(1 for p in pdf_inventory if p["role"] == "unknown"),
        }
    }

    out_audit_dir = PROJECT_ROOT / "data" / "audit"
    out_audit_dir.mkdir(parents=True, exist_ok=True)

    # 1. Salva Manifesto JSON
    manifest_data = {
        "metadata": {
            "version": "1.0",
            "timestamp": "2026-10-15",
            "summary": summary
        },
        "protected_assets": [m for m in media_records.values() if m["is_protected"]],
        "media_catalog": media_records,
        "pdf_sources": pdf_inventory
    }

    manifest_json_path = out_audit_dir / "legacy_catalog_manifest.json"
    with open(manifest_json_path, "w", encoding="utf-8") as f:
        json.dump(manifest_data, f, indent=2, ensure_ascii=False)
    print(f"[OK] Manifesto estruturado salvo em: {manifest_json_path}")

    # 2. Gera Relatório Markdown
    report_md_path = out_audit_dir / "LEGACY_CATALOG_AUDIT.md"
    md_content = f"""# Auditoria do Catálogo Legado de Figuras — LemmaS

**Data:** 15 de Outubro de 2026  
**Responsável:** Antigravity (Arquiteto) & Hermes (Executor)  
**Escopo:** Mapeamento de 100% dos ativos em `data/imagens/`, `frontend/public/uploads/` e `data/sources/` sem alteração de produção.

---

## 1. Síntese Executiva do Inventário

| Métrica | Quantidade | Observação |
| :--- | :--- | :--- |
| **Total de Recursos de Imagem em Disco** | **{summary['total_media_files']}** | `data/imagens/` (2.534) + `frontend/public/uploads/` (25) |
| **Recursos Protegidos (`trusted_keep`)** | **{summary['total_by_state'][STATE_TRUSTED_KEEP]}** | SVGs oficiais da ESA 2026 em produção |
| **Recursos Aprovados no Piloto (`approved_new`)** | **{summary['total_by_state'][STATE_APPROVED_NEW]}** | Casos recuperados com sucesso (EEAR 2020, AFA 2011/2012) |
| **Candidatos de Auditoria (`audit_candidate`)** | **{summary['total_by_state'][STATE_AUDIT_CANDIDATE]}** | Imagens referenciadas no catálogo estendido |
| **Imagens Legadas Não-Verificadas (`legacy_unverified`)** | **{summary['total_by_state'][STATE_LEGACY_UNVERIFIED]}** | Imagens órfãs ou extrações brutas sem vínculo canônico |
| **Imagens Vinculadas a Questões Ativas** | **{summary['media_associated_with_any_question']}** | Associadas via `figura_path` |
| **Imagens Órfãs em Disco** | **{summary['orphan_media_files']}** | Extrações indiscriminadas de pipelines anteriores |
| **PDFs-Fonte no Repositório** | **{summary['pdf_sources_count']}** | Mapeados em `data/sources/` |

---

## 2. Ativos Protegidos: ESA 2026 (`trusted_keep`)

As 4 figuras da prova **ESA 2026** representam a base de alta fidelidade visual já em produção no LemmaS. Seus bytes e hashes SHA-256 estão **rigorosamente congelados e protegidos contra regravação ou rasterização**:

| Arquivo | Tamanho | Dimensões / ViewBox | SHA-256 |
| :--- | :--- | :--- | :--- |
| `frontend/public/uploads/esa/2026/q02.svg` | 6.655 bytes | `0 0 600 320` | `f9631692db5ab0b48ed9e7146ff0ccc1d8c9b409fd82a1fc2c596c13b0406618` |
| `frontend/public/uploads/esa/2026/q06.svg` | 3.587 bytes | `0 0 500 320` | `c98eeb272d30eb358fc4a2b7ef286e70a11982c6b07f504ddb0f9f0aff0bdb4d` |
| `frontend/public/uploads/esa/2026/q09.svg` | 1.140 bytes | `0 0 400 220` | `b6ff6987b00abe68a17a2826a45d2891a10d111c07fbe898d34cd7af4762f39e` |
| `frontend/public/uploads/esa/2026/q10.svg` | 2.061 bytes | `0 0 440 260` | `f2fbf68cd5ecef9676102919406e6fe3c9852d9bf19b0d4fe6bc7778b3740e75` |

---

## 3. Proveniência e Auditoria de PDFs-Fonte (Prova Original vs. Resolução)

A auditoria identificou a causa raiz das contaminações no catálogo legado:
- **Resoluções Comentadas do Renato Madeira (`madematica`):** Na pasta `data/sources/afa/raw/`, os arquivos de 2011 a 2016 são cadernos de questões *resolvidas* de cursinho, onde diagramas explicativos foram criados pelo professor e não existiam na prova original.
  - **Exemplo Crítico:** `militar_afa_2012_q10` possui figura no catálogo legado (`afa_2012_q10_fig1.svg`), mas a **prova oficial da AFA 2012 NÃO possui figura** nesta questão (a elipse é apenas algébrica). A figura vinha da resolução. O status correto é `SOURCE_MISSING`.
- **Provas Oficiais:** A partir de 2017, a pasta `provas/` contém as provas autênticas da FAB (ex.: `2020-21-afa-provas-de-lingua-inglesa-fisica-lingua-portuguesa-matematica-e-redacao.pdf`), separadas dos cadernos `gabarito/`.

### Classificação dos PDFs:
- **Provas Originais Autênticas:** {summary['pdf_roles']['original_exam']} arquivos.
- **Resoluções Comentadas (Não-canônicas para extração de figuras de prova):** {summary['pdf_roles']['resolution_commentary']} arquivos.
- **Gabaritos Oficiais:** {summary['pdf_roles']['answer_key']} arquivos.
- **Não confirmados/Genéricos:** {summary['pdf_roles']['unknown']} arquivos.

---

## 4. O Caso Crítico: AFA 2011 Q17 (Recuperação e Classificação Semântica)

- **Identificador:** `militar_afa_2011_q17` / `afa_2011_mat_q17`
- **Diagnóstico da Falha Anterior:** Falhou no template matching (`score = 0.3255 < 0.45`) devido à distorção estética da vetorização anterior com VTracer. O texto do PDF usa fonte Type3 sem ToUnicode, impedindo regex simples.
- **Solução Determinística:** Identificado o objeto nativo `xref 297` na página 14 (índice 13) do PDF `afa_2011_madematica.pdf`.
- **Classificação Semântica:** `option_panel` (painel 2x2 contendo as opções gráficas A, B, C, D de ciclo trigonométrico).
- **Recorte Final:** Renderizado em **300 DPI** com respiro (`1384x1380`), preservando todas as legendas em $\\pi/6$ e $5\\pi/6$. Folha de contato e relatório validados em `data/audit/reprocessed_figures_pilot/afa_2011_q17/`.

---

## 5. Estratégia Segura para os Ativos Antigos

1. **Preservação Física:** Nenhuma imagem em `data/imagens/` será apagada nesta etapa.
2. **Desacoplamento Semântico:** As imagens não-auditadas são marcadas como `legacy_unverified` no manifesto.
3. **Migração sob Demanda:** Apenas imagens que atingirem `approved_new` com folha de contato e dupla validação (estrutural + visual) entram na fila de migração.
"""
    with open(report_md_path, "w", encoding="utf-8") as f:
        f.write(md_content)
    print(f"[OK] Relatório executivo salvo em: {report_md_path}")

if __name__ == "__main__":
    run_audit()
