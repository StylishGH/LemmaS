import fitz

def analyze_pages():
    print("================== AFA 2012 ==================")
    doc2012 = fitz.open('data/sources/afa/raw/2012/afa_2012_madematica.pdf')

    for pno in [10, 12, 19]: # Page 11 (Q10), Page 13 (Q12), Page 20 (Q20)
        p = doc2012[pno]
        print(f"\n=== PAGE {pno+1} (idx {pno}) ===")
        draws = p.get_drawings()
        inner_draws = [d for d in draws if d['rect'].height < 700 and d['rect'].width < 480]
        print(f"Total draws: {len(draws)}, inner draws: {len(inner_draws)}")
        if inner_draws:
            r = fitz.Rect()
            for d in inner_draws:
                r |= d['rect']
            print(f"Union of inner draws: {r}")
        
        # Images
        imgs = p.get_images()
        print(f"Images count: {len(imgs)}")
        for img in imgs:
            xref = img[0]
            rects = p.get_image_rects(xref)
            print(f"  Image xref={xref}, rects={rects}")

        # Text blocks
        blocks = p.get_text('blocks')
        for b in blocks:
            text = b[4].strip().replace('\n', ' ')
            if "QUEST" in text.upper() or "FIGURA" in text.upper() or len(text) < 40:
                print(f"  Block ({b[0]:.1f}, {b[1]:.1f}, {b[2]:.1f}, {b[3]:.1f}): {repr(text)}")

if __name__ == "__main__":
    analyze_pages()
