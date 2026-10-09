import json
import re

with open("scripts/script_9.txt", "r", encoding="utf-8") as f:
    raw = f.read()

# Extract content passed to enqueue(...)
# The format is window.__reactRouterContext.streamController.enqueue("...")
prefix = 'window.__reactRouterContext.streamController.enqueue("'
suffix = '");'

if raw.startswith(prefix) and raw.endswith(suffix):
    payload_str = raw[len(prefix):-len(suffix)]
    # Unescape json string
    payload_json = json.loads('"' + payload_str + '"')
else:
    payload_json = raw

# The payload is Remix turbo-stream serialization (like React Server Components / Devalue format)
# Let's search for human-readable sentences or Portuguese text
lines = payload_json.split("\n")
print(f"Total lines in stream: {len(lines)}")

text_blocks = []
for line in lines:
    # Find text sequences in JSON lines
    matches = re.findall(r'"([^"\\]*(?:\\.[^"\\]*)*)"', line)
    for m in matches:
        # Check if it has Portuguese words or math discussion
        if len(m) > 40 and ("MathAI" in m or "treinamento" in m or "questão" in m or "modelo" in m or "dataset" in m or "aluno" in m or "banco" in m or "fine-tuning" in m or "LLM" in m or "passo" in m):
            text_blocks.append(m.encode("utf-8").decode("unicode_escape", errors="ignore"))

print(f"Extracted {len(text_blocks)} text blocks.")
with open("scripts/extracted_conversation.txt", "w", encoding="utf-8") as f:
    for i, block in enumerate(text_blocks):
        f.write(f"\n--- BLOCO {i+1} ---\n{block}\n")

print("Saved to scripts/extracted_conversation.txt")
