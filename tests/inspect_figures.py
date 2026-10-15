import fitz

def detailed_inspection():
    print("================== AFA 2011 ==================")
    doc2011 = fitz.open("data/sources/afa/raw/2011/afa_2011_madematica.pdf")
    for i, page in enumerate(doc2011):
        # Look for question 6 or chart
        imgs = page.get_images()
        draws = page.get_drawings()
        txt = page.get_text()
        if "cadetes" in txt.lower() or "gráfico" in txt.lower() or "06" in txt or " 6 -" in txt or len(imgs) > 0 or len(draws) > 15:
            print(f"Page {i+1} (idx {i}): {len(imgs)} imgs, {len(draws)} draws | text snippet: {repr(txt[:100])}")
            for img in imgs:
                xref = img[0]
                rects = page.get_image_rects(xref)
                bimg = doc2011.extract_image(xref)
                print(f"   Image xref={xref}, size=({bimg['width']},{bimg['height']}), rects={rects}")

    print("\n================== AFA 2012 ==================")
    doc2012 = fitz.open("data/sources/afa/raw/2012/afa_2012_madematica.pdf")
    for i, page in enumerate(doc2012):
        imgs = page.get_images()
        draws = page.get_drawings()
        txt = page.get_text()
        found_target = False
        for q in [10, 12, 20]:
            if f" {q} " in txt or f" {q:02d} " in txt or f"QUESTÃO {q}" in txt or f"QUESTO {q}" in txt:
                found_target = True
                break
        if found_target or len(imgs) > 0 or len(draws) > 20:
            print(f"Page {i+1} (idx {i}): {len(imgs)} imgs, {len(draws)} draws | text snippet: {repr(txt[:80])}")
            for img in imgs:
                xref = img[0]
                rects = page.get_image_rects(xref)
                bimg = doc2012.extract_image(xref)
                print(f"   Image xref={xref}, size=({bimg['width']},{bimg['height']}), ext={bimg['ext']}, rects={rects}")

if __name__ == "__main__":
    detailed_inspection()
