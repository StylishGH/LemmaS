#!/usr/bin/env python3
"""
Script de validação e análise de traduções MathNet.
Criado para preparar dados para portfólio/ML job interview.
"""

import json
from pathlib import Path
from collections import defaultdict

INPUT_FILE = Path("data/translations/mathnet_enunciados_ptbr.jsonl")

def analyze_translations():
    """Analisa distribuição de status e padrões."""
    
    by_status = defaultdict(list)
    by_model = defaultdict(int)
    math_integrity = 0
    total = 0
    
    with open(INPUT_FILE, 'r', encoding='utf-8') as f:
        for line in f:
            try:
                obj = json.loads(line.strip())
                total += 1
                
                status = obj.get('status', 'unknown')
                by_status[status].append(obj.get('id'))
                
                if obj.get('integridade_matematica', False):
                    math_integrity += 1
                    
                model = obj.get('modelo', 'none')
                by_model[model] += 1
                
            except json.JSONDecodeError:
                continue
    
    # Resultados
    print(f"\n{'='*60}")
    print(f"ANÁLISE DE TRADUÇÕES")
    print(f"{'='*60}")
    print(f"Total de registros: {total}")
    print(f"\nPor Status:")
    for status, ids in sorted(by_status.items()):
        print(f"  {status}: {len(ids)} ({100*len(ids)/total:.1f}%)")
    
    print(f"\nPor Modelo:")
    for model, count in sorted(by_model.items()):
        print(f"  {model}: {count}")
    
    print(f"\nPreservação Matemática:")
    print(f"  Integrado: {math_integrity}/{total} ({100*math_integrity/total:.1f}%)")
    
    # Exportar para CSV
    csv_path = INPUT_FILE.parent / "mathnet_analysis.csv"
    with open(csv_path, 'w', encoding='utf-8') as f:
        f.write("id,status,modelo,math_spans,integridade_matematica,tam_enunciado\n")
        with open(INPUT_FILE, 'r', encoding='utf-8') as src:
            for line in src:
                try:
                    obj = json.loads(line.strip())
                    f.write(f"{obj.get('id','')},{obj.get('status','')},{obj.get('modelo','')},"
                           f"{obj.get('math_spans','')},{obj.get('integridade_matematica','')},"
                           f"{len(str(obj.get('enunciado_original','')))}\n")
                except:
                    pass
    
    print(f"\nExportado análise para: {csv_path}")
    print(f"{'='*60}\n")

if __name__ == "__main__":
    analyze_translations()