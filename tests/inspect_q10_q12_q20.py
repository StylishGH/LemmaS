import fitz

def inspect_q10_q12_q20():
    doc = fitz.open('data/sources/afa/raw/2012/afa_2012_madematica.pdf')
    for pno in [10, 11, 12, 19]:
        p = doc[pno]
        print(f"\n================ PAGE {pno+1} ================")
        draws = p.get_drawings()
        imgs = p.get_images()
        print(f"Draws: {len(draws)}, Imgs: {len(imgs)}")
        for i, d in enumerate(draws):
            r = d['rect']
            if r.height < 700 and r.width < 500:
                print(f"  Draw {i}: rect=({r.x0:.1f}, {r.y0:.1f}, {r.x1:.1f}, {r.y1:.1f}), items={len(d['items'])}")
        for img in imgs:
            xref = img[0]
            print(f"  Img xref={xref}, rects={p.get_image_rects(xref)}")
        for b in p.get_text('blocks'):
            txt = b[4].strip().replace('\n', ' ')
            if "QUEST" in txt.upper() or "FIGURA" in txt.upper() or "TABELA" in txt.upper() or len(txt) < 30:
                print(f"  Text ({b[0]:.1f}, {b[1]:.1f}, {b[2]:.1f}, {b[3]:.1f}): {repr(txt[:60])}")

if __name__ == "__main__":
    inspect_q10_q12_q20()
