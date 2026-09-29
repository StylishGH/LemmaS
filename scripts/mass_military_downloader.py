import os
import re
import urllib.parse
import requests
from bs4 import BeautifulSoup
from concurrent.futures import ThreadPoolExecutor

BASE_DIR = r"D:\Downloads"

# Mapping of target folders to Cursos Azambuja pages
AZAMBUJA_SOURCES = {
    r"Exercito\EsPCEx": "https://cursosazambuja.com.br/provas-e-gabaritos-cursos-azambuja/2/espcex-cadetes-do-exercito",
    r"Exercito\ESA": "https://cursosazambuja.com.br/provas-e-gabaritos-cursos-azambuja/38/esa-sargentos-do-exercito",
    r"Exercito\IME": "https://cursosazambuja.com.br/provas-e-gabaritos-cursos-azambuja/543/instituto-militar-de-engenharia-ime",
    r"Exercito\EsFCEx": "https://cursosazambuja.com.br/provas-e-gabaritos-cursos-azambuja/652/esfcex-escola-de-formacao-complementar-do-exercito",
    r"Aeronautica\AFA": "https://cursosazambuja.com.br/provas-e-gabaritos-cursos-azambuja/107/afa-academia-da-forca-aerea",
    r"Aeronautica\EEAr": "https://cursosazambuja.com.br/provas-e-gabaritos-cursos-azambuja/325/escola-de-especialistas-de-aeronautica-eear",
    r"Aeronautica\EPCAR": "https://cursosazambuja.com.br/provas-e-gabaritos-cursos-azambuja/121/epcar-cadetes-do-ar",
    r"Aeronautica\ITA": "https://cursosazambuja.com.br/provas-e-gabaritos-cursos-azambuja/335/instituto-tecnologico-de-aeronautica-ita",
    r"Marinha\Colegio Naval": "https://cursosazambuja.com.br/provas-e-gabaritos-cursos-azambuja/426/colegio-naval",
    r"Policia_Militar\Brigada_Militar_RS": "https://cursosazambuja.com.br/provas-e-gabaritos-cursos-azambuja/134/concurso-da-brigada-militar"
}

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
}

def extract_year(text, href):
    # Search for year 1990 to 2026
    m = re.search(r'/(19\d{2}|20\d{2})/', href)
    if m:
        return m.group(1)
    m = re.search(r'[-_](19\d{2}|20\d{2})[-_.]', href)
    if m:
        return m.group(1)
    m = re.search(r'(19\d{2}|20\d{2})', href)
    if m:
        return m.group(1)
    m = re.search(r'(19\d{2}|20\d{2})', text)
    if m:
        return m.group(1)
    return "Outros"

def download_file(url, target_path):
    if os.path.exists(target_path) and os.path.getsize(target_path) > 1000:
        return f"ALREADY_EXISTS: {target_path}"
    
    try:
        r = requests.get(url, headers=HEADERS, timeout=30, stream=True)
        if r.status_code == 200:
            content_type = r.headers.get('Content-Type', '').lower()
            # Safety check: make sure it's not a block page
            first_chunk = next(r.iter_content(chunk_size=1024), b'')
            if b'<!DOCTYPE html' in first_chunk or b'<html' in first_chunk:
                return f"SKIPPED_HTML_BLOCK: {url}"
            
            os.makedirs(os.path.dirname(target_path), exist_ok=True)
            with open(target_path, 'wb') as f:
                f.write(first_chunk)
                for chunk in r.iter_content(chunk_size=16384):
                    if chunk:
                        f.write(chunk)
            size_kb = os.path.getsize(target_path) / 1024
            return f"DOWNLOADED ({size_kb:.1f} KB): {target_path}"
        else:
            return f"FAILED HTTP {r.status_code}: {url}"
    except Exception as e:
        return f"ERROR: {url} -> {e}"

def run_azambuja_harvest():
    print("=== INICIANDO COLETA NO CURSOS AZAMBUJA (2000-2024 E ANTERIORES) ===")
    tasks = []
    
    for subfolder, page_url in AZAMBUJA_SOURCES.items():
        print(f"Buscando links em: {subfolder} ({page_url})")
        try:
            r = requests.get(page_url, headers=HEADERS, timeout=20)
            if r.status_code != 200:
                print(f"Erro ao acessar {page_url}: Status {r.status_code}")
                continue
            
            soup = BeautifulSoup(r.text, 'html.parser')
            for a in soup.find_all('a', href=True):
                href = a['href']
                if href.lower().endswith('.pdf'):
                    full_url = urllib.parse.urljoin(page_url, href)
                    text = a.text.strip()
                    year = extract_year(text, href)
                    
                    # Sanitize filename
                    filename = urllib.parse.unquote(href.split('/')[-1]).replace(' ', '_')
                    dest_path = os.path.join(BASE_DIR, subfolder, str(year), filename)
                    tasks.append((full_url, dest_path))
        except Exception as e:
            print(f"Falha na listagem de {subfolder}: {e}")
            
    print(f"\nTotal de arquivos mapeados no Azambuja: {len(tasks)}")
    
    with ThreadPoolExecutor(max_workers=8) as executor:
        futures = [executor.submit(download_file, url, path) for url, path in tasks]
        for f in futures:
            res = f.result()
            if "DOWNLOADED" in res:
                print(res)
    print("=== COLETA AZAMBUJA CONCLUÍDA ===")

if __name__ == "__main__":
    run_azambuja_harvest()
