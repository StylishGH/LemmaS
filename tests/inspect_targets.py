import fitz
import re
from pathlib import Path

def inspect():
    print("=== EXISTING SVGs ===")
    for path in [
        'data/imagens/afa/2011/afa_2011_q06_fig1.svg',
        'data/imagens/afa/2012/afa_2012_q10_fig1.svg',
        'data/imagens/afa/2012/afa_2012_q12_fig1.svg',
        'data/imagens/afa/2012/afa_2012_q20_fig1.svg'
    ]:
        p = Path(path)
        txt = p.read_text(encoding='utf-8')[:600]
        m_w = re.search(r'width="([0-9\.]+)"', txt)
        m_h = re.search(r'height="([0-9\.]+)"', txt)
        m_vb = re.search(r'viewBox="([0-9\.\s]+)"', txt)
        print(f"{p.name}: size={p.stat().st_size:,} bytes | w={m_w.group(1) if m_w else '?'}, h={m_h.group(1) if m_h else '?'}, viewBox={m_vb.group(1) if m_vb else '?'}")

    print("\n=== AFA 2011 PDF PAGE 4 (Q06) ===")
    doc2011 = fitz.open("data/sources/afa/raw/2011/afa_2011_madematica.pdf")
    page_q06 = doc2011[3]  # Page 4
    print("Page 4 rect:", page_q06.rect)
    for img in page_q06.get_images():
        xref = img[0]
        rects = page_q06.get_image_rects(xref)
        info = doc2011.extract_image(xref)
        print(f"  xref {xref}: rects={rects}, format={info['ext']}, size=({info['width']}x{info['height']})")

    # Check page 3 as well (which has question without resolution)
    page_q06_p3 = doc2011[2] # Page 3
    print("Page 3 rect:", page_q06_p3.rect)
    print("Page 3 images:", len(page_q06_p3.get_images()))
    draws_p3 = page_q06_p3.get_drawings()
    print("Page 3 drawings:", len(draws_p3))
    if draws_p3:
        # Bounding box of drawings
        r = fitz.Rect()
        for d in draws_p3:
            r |= d["rect"]
        print("  Drawings union rect:", r)

    print("\n=== AFA 2012 TARGETS ===")
    doc2012 = fitz.open("data/sources/afa/raw/2012/afa_2012_madematica.pdf")
    # Q10 on page 11 (idx 10)
    p10 = doc2012[10]
    print("Q10 (Page 11) rect:", p10.rect)
    draws_q10 = p10.get_drawings()
    print(f"  Drawings count: {len(draws_q10)}, Images: {len(p10.get_images())}")
    r10 = fitz.Rect()
    for d in draws_q10:
        r10 |= d["rect"]
    print("  Q10 drawings union rect:", r10)

    # Q12 on page 13 (idx 12)
    p12 = doc2012[12]
    print("Q12 (Page 13) rect:", p12.rect)
    print(f"  Drawings count: {len(p12.get_drawings())}, Images: {len(p12.get_images())}")
    for img in p12.get_images():
        xref = img[0]
        print(f"  xref {xref}: rects={p12.get_image_rects(xref)}, size=({doc2012.extract_image(xref)['width']}x{doc2012.extract_image(xref)['height']})")

    # Q20 on page 19 (idx 18)
    p20 = doc2012[18]
    print("Q20 (Page 19) rect:", p20.rect)
    draws_q20 = p20.get_drawings()
    print(f"  Drawings count: {len(draws_q20)}, Images: {len(p20.get_images())}")
    r20 = fitz.Rect()
    for d in draws_q20:
        r20 |= d["rect"]
    print("  Q20 drawings union rect:", r20)

if __name__ == "__main__":
    inspect()
