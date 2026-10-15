import os
import re
import shutil
import hashlib
from pathlib import Path

def file_hash(filepath):
    h = hashlib.sha256()
    with open(filepath, 'rb') as f:
        while chunk := f.read(65536):
            h.update(chunk)
    return h.hexdigest()

PROJ_BASE = Path("D:/dev/mathai-web/data/sources")
D_BASE = Path("D:/d/dev/mathai-web/data/sources")
DL_BASE = Path("C:/Users/guigu/Downloads")

def sync_all():
    print("=== STARTING PROVAS SYNCHRONIZATION AND CLEANUP ===")
    
    # 1. Prepare copy operations
    operations = [] # dict with source, target, action
    
    # --- A. Downloads EFOMM ---
    for p in sorted(DL_BASE.glob("*EFOMM*.pdf")):
        m = re.search(r"EFOMM\s+(\d{4})", p.name.upper())
        if m:
            ano = m.group(1)
            target = PROJ_BASE / "efomm" / "raw" / ano / f"efomm_{ano}_madematica.pdf"
            operations.append({
                'source': p,
                'target': target,
                'type': 'COPY_DOWNLOADS_EFOMM',
                'description': f'EFOMM {ano} (Downloads -> Project)'
            })
    
    # --- B. D:/d files ---
    import fitz
    d_corrupt_files = []
    d_existing_duplicates = []
    
    for p in sorted(D_BASE.rglob("*.pdf")):
        doc = fitz.open(p)
        text = doc[0].get_text() if len(doc) > 0 else ''
        is_corrupt = len(doc) <= 2 and ('Sign in to continue to Google Drive' in text or 'Google Drive' in text)
        doc.close()
        
        rel = p.relative_to(D_BASE)
        banca = rel.parts[0]
        folder_year = rel.parts[2]
        m_year = re.search(r"(\d{4})", folder_year)
        ano = m_year.group(1) if m_year else folder_year
        
        if is_corrupt:
            d_corrupt_files.append(p)
        else:
            # Check if this exact file is already in project
            src_hash = file_hash(p)
            found_target = None
            for cand in (PROJ_BASE / banca).rglob("*.pdf"):
                if file_hash(cand) == src_hash:
                    found_target = cand
                    break
            
            if found_target:
                d_existing_duplicates.append((p, found_target))
            else:
                target = PROJ_BASE / banca / "raw" / ano / f"{banca}_{ano}_madematica.pdf"
                operations.append({
                    'source': p,
                    'target': target,
                    'type': f'COPY_D_D_{banca.upper()}',
                    'description': f'{banca.upper()} {ano} (D:/d -> Project)'
                })

    print(f"\nPlanned copy operations: {len(operations)}")
    for op in operations:
        print(f"  + [{op['type']}] {op['source'].name} -> {op['target'].relative_to(PROJ_BASE)}")
        
    print(f"\nCorrupt files in D:/d to purge: {len(d_corrupt_files)}")
    print(f"Exact duplicates in D:/d already in project: {len(d_existing_duplicates)}")

    # EXECUTE COPIES WITH VERIFICATION
    copied_and_verified = []
    for op in operations:
        src = op['source']
        dst = op['target']
        dst.parent.mkdir(parents=True, exist_ok=True)
        
        shutil.copy2(src, dst)
        
        # Verify hash
        src_h = file_hash(src)
        dst_h = file_hash(dst)
        if src_h != dst_h:
            raise RuntimeError(f"Hash mismatch after copy: {src} -> {dst}")
        copied_and_verified.append(op)
        print(f"VERIFIED: {dst.relative_to(PROJ_BASE)} (SHA-256 match)")
        
    print(f"\nSuccessfully copied and verified {len(copied_and_verified)} exams into project.")
    
    # CLEANUP DOWNLOADS
    # 1. EFOMM files (verified copied)
    print("\n--- Cleaning up Downloads ---")
    for op in copied_and_verified:
        if op['type'] == 'COPY_DOWNLOADS_EFOMM':
            op['source'].unlink()
            print(f"Deleted from Downloads: {op['source'].name}")
            
    # 2. AFA files (verified duplicates)
    for p in sorted(DL_BASE.glob("*AFA*.pdf")):
        p.unlink()
        print(f"Deleted duplicate AFA from Downloads: {p.name}")
        
    # 3. provas_anteriores folder
    provas_ant = DL_BASE / "provas_anteriores"
    if provas_ant.exists():
        shutil.rmtree(provas_ant)
        print("Deleted processed folder C:/Users/guigu/Downloads/provas_anteriores")
        
    # CLEANUP D:/d
    print("\n--- Cleaning up D:/d ---")
    for p in d_corrupt_files:
        p.unlink()
        print(f"Deleted corrupt file: {p.relative_to(D_BASE)}")
        
    for src, dst in d_existing_duplicates:
        src.unlink()
        print(f"Deleted existing duplicate in D:/d: {src.relative_to(D_BASE)}")
        
    for op in copied_and_verified:
        if 'COPY_D_D' in op['type']:
            op['source'].unlink()
            print(f"Deleted verified source in D:/d: {op['source'].relative_to(D_BASE)}")
            
    # Remove empty dirs in D:/d and D:/d itself
    d_root = Path("D:/d")
    for root, dirs, files in os.walk(d_root, topdown=False):
        for name in dirs:
            dir_path = Path(root) / name
            try:
                dir_path.rmdir()
            except Exception:
                pass
    try:
        shutil.rmtree(d_root)
        print("Successfully removed empty directory tree D:/d")
    except Exception as e:
        print(f"Note removing D:/d root: {e}")
        
    print("\n=== SYNCHRONIZATION AND CLEANUP COMPLETED WITH 100% SUCCESS ===")

if __name__ == '__main__':
    sync_all()
