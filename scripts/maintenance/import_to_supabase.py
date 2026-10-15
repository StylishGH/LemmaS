#!/usr/bin/env python3
"""
Script de importação para Supabase - demonstra habilidades de dados engenharia.
"""

import json
import os
from pathlib import Path
from typing import Dict, Any
try:
    from supabase import create_client, SupabaseClient
    SUPABASE_AVAILABLE = True
except ImportError:
    SUPABASE_AVAILABLE = False

SUPABASE_URL = os.getenv("SUPABASE_URL", "https://YOUR-PROJECT.supabase.co")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "YOUR-KEY-HERE")

INPUT_FILE = Path("data/translations/mathnet_enunciados_ptbr.jsonl")

def chunk_dict(d: Dict, chunk_size: int = 50):
    """Divide dicionário em chunks para batch processing."""
    items = list(d.items())
    for i in range(0, len(items), chunk_size):
        yield dict(items[i:i + chunk_size])

def clean_object(obj: Dict[str, Any]) -> Dict[str, Any]:
    """Limpa e prepara objeto para inserção no Supabase."""
    # Mapear campos para o schema SQL
    mapping = {
        'id': obj.get('id'),
        'idioma_origem': obj.get('idioma_origem'),
        'idioma_rotulo': obj.get('idioma_rotulo'),
        'modelo': obj.get('modelo'),
        'licenca_modelo': obj.get('licenca_modelo'),
        'identificador_idioma': obj.get('identificador_idioma'),
        'geracao': json.dumps(obj.get('geracao', {})),
        'dispositivo': obj.get('dispositivo'),
        'hash_original_sha256': obj.get('hash_original_sha256'),
        'enunciado_original': obj.get('enunciado_original'),
        'math_spans': obj.get('math_spans'),
        'integridade_matematica': obj.get('integridade_matematica', False),
        'status': obj.get('status'),
        'revisao_humana': obj.get('revisao_humana'),
        'enunciado_ptbr': obj.get('enunciado_ptbr'),
    }
    return {k: v for k, v in mapping.items() if v is not None}

def import_to_supabase():
    """Importa traduções para Supabase em batches."""
    
    if not SUPABASE_AVAILABLE:
        print("❌ Instale supabase-py: pip install supabase-py")
        return
    
    if SUPABASE_URL == "https://YOUR-PROJECT.supabase.co":
        print("⚠️ Configure SUPABASE_URL e SUPABASE_KEY como variáveis de ambiente")
        return
    
    client = create_client(SUPABASE_URL, SUPABASE_KEY)
    
    # Ler todos os dados
    records = []
    with open(INPUT_FILE, 'r', encoding='utf-8') as f:
        for line in f:
            try:
                obj = json.loads(line.strip())
                records.append(clean_object(obj))
            except:
                continue
    
    print(f"📦 {len(records)} registros para importar")
    
    # Importar em batches de 50
    success = 0
    failed = 0
    
    for chunk in chunk_dict({i: r for i, r in enumerate(records)}, 50):
        try:
            result = client.table('mathnet_enunciados').upsert(chunk).execute()
            success += len(chunk)
            print(f"✅ Lote importado: {success}/{len(records)}")
        except Exception as e:
            failed += len(chunk)
            print(f"❌ Erro: {e}")
    
    print(f"\n📊 Resumo: {success} sucesso, {failed} falhas")

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument('--dry-run', action='store_true', help='Apenas validar sem importar')
    args = parser.parse_args()
    
    if args.dry_run:
        print("🔍 Modo dry-run - validando estrutura...")
        sample = None
        with open(INPUT_FILE, 'r') as f:
            sample = json.loads(f.readline())
        print("Sample object:")
        print(json.dumps(clean_object(sample), indent=2, ensure_ascii=False))
    else:
        import_to_supabase()