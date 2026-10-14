import json

with open("scripts/efomm_classificadas.json", "r", encoding="utf-8") as f:
    data = json.load(f)

for item in data:
    if 1281 <= item["id"] <= 1295:
        item["materia"] = "Física"
        if "Termom" in item.get("subtopico", "") or "Termologia" in item.get("topico", ""):
            item["topico"] = "Termodinâmica"
        elif "circuito" in item.get("subtopico", "").lower() or "resistor" in item.get("subtopico", "").lower():
            item["topico"] = "Eletrodinâmica"
        elif "cargas" in item.get("subtopico", "").lower() or "potencial el" in item.get("subtopico", "").lower():
            item["topico"] = "Eletrostática"
        elif "magnét" in item.get("subtopico", "").lower() or "ampère" in item.get("subtopico", "").lower():
            item["topico"] = "Eletromagnetismo"
        elif "onda" in item.get("topico", "").lower() or "frequência" in item.get("subtopico", "").lower():
            item["topico"] = "Ondulatória"
        elif "óptica" in item.get("topico", "").lower() or "espelho" in item.get("subtopico", "").lower() or "lente" in item.get("subtopico", "").lower():
            item["topico"] = "Óptica"
        elif "trabalho" in item.get("subtopico", "").lower() or "força" in item.get("subtopico", "").lower():
            item["topico"] = "Mecânica"
    elif item["id"] == 1296:
        item["materia"] = "Inglês"
        item["topico"] = "Interpretação de Texto"
        item["subtopico"] = "Reading Comprehension"

with open("scripts/efomm_classificadas.json", "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

sql_statements = []
for item in data:
    qid = item["id"]
    materia = item["materia"].replace("'", "''")
    topico = item["topico"].replace("'", "''")
    subtopico = (item.get("subtopico") or "").replace("'", "''")
    sql_statements.append(f"UPDATE questoes SET materia = '{materia}', topico = '{topico}', subtopico = '{subtopico}' WHERE id = {qid};")

with open("scripts/update_efomm_topics.sql", "w", encoding="utf-8") as f:
    f.write("\n".join(sql_statements))

# Create chunks of 50 statements
for i in range(0, len(sql_statements), 50):
    chunk = sql_statements[i:i+50]
    with open(f"scripts/chunk_{i//50}.sql", "w", encoding="utf-8") as out:
        out.write("BEGIN;\n" + "\n".join(chunk) + "\nCOMMIT;\n")

print(f"Total SQL statements: {len(sql_statements)} em {len(range(0, len(sql_statements), 50))} chunks.")
