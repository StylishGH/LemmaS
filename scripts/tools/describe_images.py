from google import genai
from google.genai import types
import os

client = genai.Client()
model_id = 'gemini-2.5-flash'

paths = [
    r'C:\Users\guigu\AppData\Local\Temp\alethe-clipboard-img-tNRBmz7l.png',
    r'C:\Users\guigu\AppData\Local\Temp\alethe-clipboard-img-p79VQsxu.png',
    r'C:\Users\guigu\AppData\Local\Temp\alethe-clipboard-img-fWrD3k_k.png',
    r'C:\Users\guigu\AppData\Local\Temp\alethe-clipboard-img-rSXN99P7.png'
]

contents = ['Describe what part of the interface the user wants to remove or change based on the fourth image. Also describe the first three briefly.']
for path in paths:
    if os.path.exists(path):
        import PIL.Image
        img = PIL.Image.open(path)
        contents.append(img)
    else:
        print(f'File not found: {path}')

response = client.models.generate_content(
    model=model_id,
    contents=contents,
)
print(response.text)
