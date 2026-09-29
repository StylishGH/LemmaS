import os
import re
import urllib.parse
import requests
from bs4 import BeautifulSoup
from concurrent.futures import ThreadPoolExecutor

BASE_DIR = r"D:\Downloads\Bombeiros_Militares\CBMERJ"

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
}

def extract_year(text, href):
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
        r = requests.get(url, headers=HEADERS, timeout=30, stream=True, verify=False)
        if r.status_code == 200:
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

def run_cbmerj_harvest():
    import urllib3
    urllib3.disable_warnings()
    print("=== INICIANDO COLETA CFO CBMERJ / UERJ ===")
    
    pages = [
        'https://www.vestibular.uerj.br/?page_id=7069',
        'https://www.vestibular.uerj.br/?page_id=14964',
        'https://www.vestibular.uerj.br/?page_id=16355',
        'https://www.vestibular.uerj.br/?page_id=10197',
        'https://www.vestibular.uerj.br/?page_id=7747'
    ]
    
    tasks = []
    seen_urls = set()
    
    for p in pages:
        try:
            r = requests.get(p, headers=HEADERS, verify=False, timeout=15)
            soup = BeautifulSoup(r.text, 'html.parser')
            for a in soup.find_all('a', href=True):
                href = a['href']
                if href.lower().endswith('.pdf'):
                    full_url = urllib.parse.urljoin(p, href)
                    if full_url in seen_urls:
                        continue
                    seen_urls.add(full_url)
                    
                    text = a.text.strip()
                    # Filter for relevant exams: prova, gabarito, matematica, cbmerj
                    combo = (text + " " + href).lower()
                    if any(w in combo for w in ['prova', 'gabarito', 'matematica', 'matemática', 'cbmerj', '1eq', '2eq', 'ed_']):
                        year = extract_year(text, href)
                        filename = urllib.parse.unquote(href.split('/')[-1]).replace(' ', '_')
                        dest = os.path.join(BASE_DIR, str(year), filename)
                        tasks.append((full_url, dest))
        except Exception as e:
            print(f"Erro ao ler {p}: {e}")
            
    print(f"Total de provas/gabaritos CBMERJ/UERJ mapeados: {len(tasks)}")
    
    with ThreadPoolExecutor(max_workers=8) as executor:
        futures = [executor.submit(download_file, url, path) for url, path in tasks]
        for f in futures:
            res = f.result()
            if "DOWNLOADED" in res:
                print(res)
                
    print("=== COLETA CBMERJ CONCLUÍDA ===")

if __name__ == "__main__":
    run_cbmerj_harvest()
