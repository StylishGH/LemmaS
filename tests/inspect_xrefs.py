import fitz
from pathlib import Path

def inspect_existing_figures():
    print("=== INSPECTING EXISTING SVGS & CORRESPONDING IMAGES ===")
    doc2012 = fitz.open('data/sources/afa/raw/2012/afa_2012_madematica.pdf')
    doc2011 = fitz.open('data/sources/afa/raw/2011/afa_2011_madematica.pdf')

    # AFA 2011 Q06
    p2011_4 = doc2011[3]
    print("\n--- AFA 2011 Q06 ---")
    for img in p2011_4.get_images():
        if img[0] == 179:
            info = doc2011.extract_image(179)
            print(f"xref 179: format={info['ext']}, size=({info['width']}x{info['height']}), bytes={len(info['image'])}")
            print(f"rect in PDF: {p2011_4.get_image_rects(179)}")

    # AFA 2012 Q10
    print("\n--- AFA 2012 Q10 ---")
    p2012_12 = doc2012[11] # page 12
    for img in p2012_12.get_images():
        if img[0] == 413:
            info = doc2012.extract_image(413)
            print(f"xref 413: format={info['ext']}, size=({info['width']}x{info['height']}), bytes={len(info['image'])}")
            print(f"rect in PDF: {p2012_12.get_image_rects(413)}")

    # AFA 2012 Q12
    print("\n--- AFA 2012 Q12 ---")
    p2012_13 = doc2012[12] # page 13
    for img in p2012_13.get_images():
        if img[0] == 218:
            info = doc2012.extract_image(218)
            print(f"xref 218: format={info['ext']}, size=({info['width']}x{info['height']}), bytes={len(info['image'])}")
            print(f"rect in PDF: {p2012_13.get_image_rects(218)}")

    # AFA 2012 Q20
    print("\n--- AFA 2012 Q20 ---")
    p2012_20 = doc2012[19] # page 20
    for img in p2012_20.get_images():
        if img[0] == 247:
            info = doc2012.extract_image(247)
            print(f"xref 247: format={info['ext']}, size=({info['width']}x{info['height']}), bytes={len(info['image'])}")
            print(f"rect in PDF: {p2012_20.get_image_rects(247)}")

if __name__ == "__main__":
    inspect_existing_figures()
