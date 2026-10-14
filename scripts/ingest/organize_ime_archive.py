"""
Organiza o acervo histórico do IME (1996 a 2019) descompactado para a estrutura
canônica de dados do LEMMAS: data/sources/ime/raw/<ano>/
"""
import os
import re
import shutil
import hashlib
from pathlib import Path

SRC_BASE = Path(r"C:\Users\guigu\.gemini\antigravity-cli\brain\556a6cff-aa3d-4b38-8405-e37fd9e5332a\scratch\ime_raw\provas_anteriores")
DEST_BASE = Path(r"D:\dev\mathai-web\data\sources\ime\raw")

def get_target_year(folder_name: str) -> str:
    m = re.match(r"provas(\d{2})_(\d{2})", folder_name)
    if not m:
        return ""
    y1 = int(m.group(1))
    ano = 1900 + y1 if y1 >= 90 else 2000 + y1
    return str(ano)

def normalize_file_name(folder_name: str, filename: str, target_year: str) -> str:
    # Ignora arquivos de backup ou requerimentos em branco
    if filename.endswith(".old") or filename.endswith(".bak") or filename == "ReqRRQME.pdf":
        return ""
    
    # Ignora duplicatas exatas em 2008
    if folder_name == "provas08_09":
        if filename in ["Fisica.pdf", "Matematica.pdf", "Linguas.pdf", "Quimica.pdf"]:
            return ""
            
    # Ignora gabarito preliminar obsoleto em 2012 (já existe o Definitivo)
    if folder_name == "provas12_13":
        if filename in ["gabarito_CFG-Objetiva-2012-2013.pdf", "Gabarito_CFG.pdf"]:
            return ""
            
    # Ignora scans inferiores de 2010 (já existem os digitais *_CFG_2010.pdf)
    if folder_name == "provas10_11":
        if filename in ["Fisica.pdf", "Matematica.pdf", "Port_Ing.pdf", "Quimica.pdf"]:
            return ""
            
    # Em 2006: nomes descritivos claros
    if folder_name == "provas06_07":
        mapping = {
            "mme.pdf": "CFG-MAT-Objetiva-2006-2007.pdf",
            "fme.pdf": "CFG-FIS-Objetiva-2006-2007.pdf",
            "qme.pdf": "CFG-QUIM-Objetiva-2006-2007.pdf",
            "Gabarito.pdf": "CFG-Gabarito-Objetiva-2006-2007.pdf",
        }
        if filename in mapping:
            return mapping[filename]

    # Para 1996..2005: padroniza nomes como mat.pdf, fisica.pdf, etc.
    y_int = int(target_year)
    if y_int <= 2005:
        ano_prox = f"{y_int + 1}"
        ano_str = f"{target_year}_{ano_prox}"
        fn_low = filename.lower()
        if "mat" in fn_low:
            return f"CFG_Matematica_{ano_str}.pdf"
        elif "fis" in fn_low:
            return f"CFG_Fisica_{ano_str}.pdf"
        elif "qui" in fn_low:
            return f"CFG_Quimica_{ano_str}.pdf"
        elif any(k in fn_low for k in ["port", "por", "ing", "ling"]):
            if "ing" in fn_low and "port" not in fn_low and "por" not in fn_low:
                return f"CFG_Ingles_{ano_str}.pdf"
            elif "port" in fn_low and "ing" not in fn_low:
                return f"CFG_Portugues_{ano_str}.pdf"
            else:
                return f"CFG_Portugues_Ingles_{ano_str}.pdf"
                
    return filename

def file_hash(path: Path) -> str:
    h = hashlib.md5()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()

def main():
    if not SRC_BASE.exists():
        print(f"Diretório fonte não encontrado: {SRC_BASE}")
        return

    DEST_BASE.mkdir(parents=True, exist_ok=True)
    
    total_copiados = 0
    total_ignorados_duplicados = 0
    resumo_por_ano = {}

    for folder in sorted(SRC_BASE.iterdir()):
        if not folder.is_dir():
            continue
        target_year = get_target_year(folder.name)
        if not target_year:
            continue
            
        ano_dest_dir = DEST_BASE / target_year
        ano_dest_dir.mkdir(parents=True, exist_ok=True)
        
        if target_year not in resumo_por_ano:
            resumo_por_ano[target_year] = []

        for f in sorted(folder.iterdir()):
            dest_name = normalize_file_name(folder.name, f.name, target_year)
            if not dest_name:
                continue
                
            dest_file = ano_dest_dir / dest_name
            if dest_file.exists():
                if file_hash(f) == file_hash(dest_file):
                    total_ignorados_duplicados += 1
                    continue
                else:
                    # Nome colide mas hash diferente: prefixar com nome original
                    dest_file = ano_dest_dir / f"extra_{dest_name}"
            
            shutil.copy2(f, dest_file)
            total_copiados += 1
            resumo_por_ano[target_year].append(dest_file.name)

    print(f"=== ORGANIZAÇÃO DO ACERVO HISTÓRICO IME (1996 - 2019) ===")
    print(f"Total de arquivos copiados: {total_copiados}")
    print(f"Arquivos já existentes/duplicados ignorados: {total_ignorados_duplicados}\n")
    
    for ano in sorted(resumo_por_ano.keys(), key=lambda x: int(x)):
        arquivos = resumo_por_ano[ano]
        if arquivos:
            print(f"[{ano}] +{len(arquivos)} arquivos: {', '.join(arquivos)}")
        else:
            print(f"[{ano}] Nenhum arquivo novo (já estava completo)")

if __name__ == "__main__":
    main()
