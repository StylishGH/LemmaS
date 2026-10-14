import json
from pathlib import Path

NOTEBOOK_PATH = Path(r"D:\dev\mathai-web\data\notebooks\gerenciador_questoes.ipynb")

def main():
    with open(NOTEBOOK_PATH, "r", encoding="utf-8") as f:
        nb = json.load(f)

    # Remove the cells we previously appended (from section 8 onwards)
    cells_cleaned = []
    for cell in nb["cells"]:
        source_str = "".join(cell.get("source", []))
        if "## 8. Ingestão e Integração Canônica com Supabase" in source_str:
            break
        cells_cleaned.append(cell)
    nb["cells"] = cells_cleaned

    # Remove any trailing empty cells
    while nb["cells"] and not nb["cells"][-1].get("source"):
        nb["cells"].pop()

    cell_markdown = {
        "cell_type": "markdown",
        "metadata": {},
        "source": [
            "## 8. Ingestão e Integração Canônica com Supabase (LEMMAS Core)\n",
            "\n",
            "Nesta etapa, preparamos e enviamos os registros para o banco de dados oficial (Supabase PostgreSQL) preservando a integridade matemática e os novos metadados refinados:\n",
            "- **`banca`**: Competição normalizada (ex: `OBM`, `IMO`, `HMMT`, `Baltic Way`)\n",
            "- **`ano`**: Ano resolvido (ex: `2002`)\n",
            "- **`edicao`**: Edição da competição (ex: `XXIV`, `November`, `1st`)\n",
            "- **`etapa`**: Fase ou etapa identificada (ex: `Final Round`, `Nível 2`, `Round 2`)\n",
            "- **`tipo_material`**: Identificação estrutural do material (`competicao`, `shortlist`, `seletiva`, `treinamento`)\n",
            "- **`pais`**: País de origem da competição\n",
            "- **`topico`**: Tópico matemático mapeado para as categorias canônicas do LEMMAS\n",
            "- **`enunciado`**: Enunciado reconstruído em PT-BR (com integridade estrutural e fórmulas LaTeX)\n",
            "- **`gabarito` / `solucao`**: Gabarito e resolução passo a passo (`solutions_markdown`)\n",
            "- **`mathnet_id`**: Identificador original que garante idempotência (upsert sem duplicar)"
        ]
    }

    cell_prep = {
        "cell_type": "code",
        "execution_count": None,
        "metadata": {},
        "outputs": [],
        "source": [
            "# ==============================================================================\n",
            "# 8.1. MAPEAMENTO E PREPARAÇÃO DOS REGISTROS PARA O SUPABASE\n",
            "# ==============================================================================\n",
            "import sys\n",
            "import importlib\n",
            "from pathlib import Path\n",
            "import json\n",
            "import numpy as np\n",
            "import pandas as pd\n",
            "\n",
            "# Garante acesso ao módulo src.database.db do LEMMAS\n",
            "NOTEBOOK_DIR = Path().resolve()\n",
            "PROJECT_ROOT = NOTEBOOK_DIR.parent.parent if NOTEBOOK_DIR.name == 'notebooks' else NOTEBOOK_DIR.parent\n",
            "if str(PROJECT_ROOT) not in sys.path:\n",
            "    sys.path.insert(0, str(PROJECT_ROOT))\n",
            "\n",
            "# Recarrega o módulo em memória para o kernel vivo do Jupyter reconhecer as atualizações\n",
            "import src.database.db\n",
            "importlib.reload(src.database.db)\n",
            "if 'db_supabase' in sys.modules:\n",
            "    import db_supabase\n",
            "    importlib.reload(db_supabase)\n",
            "\n",
            "from src.database.db import get_supabase, inserir_questoes_lote\n",
            "import scripts.ingest.mathnet_taxonomy\n",
            "importlib.reload(scripts.ingest.mathnet_taxonomy)\n",
            "from scripts.ingest.mathnet_taxonomy import traduzir_taxonomia_mathnet\n",
            "\n",
            "def extrair_str_segura(v):\n",
            "    \"\"\"Converte com segurança valores nulos, arrays numpy e strings <NA> para None ou texto limpo.\"\"\"\n",
            "    if v is None:\n",
            "        return None\n",
            "    if isinstance(v, (list, np.ndarray)):\n",
            "        return ', '.join(str(x) for x in v) if len(v) > 0 else None\n",
            "    if pd.isna(v):\n",
            "        return None\n",
            "    s = str(v).strip()\n",
            "    return None if s.lower() in ('<na>', 'nan', 'none', '') else s\n",
            "\n",
            "# 2. Preenche tipo_material padrão como 'competicao' caso não seja shortlist/seletiva/treinamento\n",
            "df['tipo_material_final'] = df['tipo_material'].fillna('competicao')\n",
            "\n",
            "# 3. Filtra questões elegíveis:\n",
            "#    - Possui enunciado traduzido / validado\n",
            "#    - Pertence a bancas consolidadas (> 50 questões no banco)\n",
            "bancas_top = df['banca'].value_counts()[lambda x: x > 50].index.tolist()\n",
            "mascara_elegiveis = (\n",
            "    df['enunciado_ptbr_reconstruido'].notna() &\n",
            "    df['banca'].isin(bancas_top)\n",
            ")\n",
            "\n",
            "df_pronto_banco = df[mascara_elegiveis].copy()\n",
            "\n",
            "print(f'Total de questões estruturadas prontas para o Supabase: {len(df_pronto_banco)}')\n",
            "print(f'Bancas contempladas (> 50 questões): {len(bancas_top)}')\n",
            "print('\\nDistribuição por Tipo de Material:')\n",
            "print(df_pronto_banco['tipo_material_final'].value_counts())"
        ]
    }

    cell_format = {
        "cell_type": "code",
        "execution_count": None,
        "metadata": {},
        "outputs": [],
        "source": [
            "# ==============================================================================\n",
            "# 8.2. CONVERSÃO PARA O FORMATO CANÔNICO DO LEMMAS\n",
            "# ==============================================================================\n",
            "\n",
            "registros_para_inserir = []\n",
            "\n",
            "for _, row in df_pronto_banco.iterrows():\n",
            "    # Enunciado em português com fallback\n",
            "    enunciado_final = extrair_str_segura(row.get('enunciado_ptbr_reconstruido'))\n",
            "    if not enunciado_final:\n",
            "        enunciado_final = extrair_str_segura(row.get('enunciado')) or ''\n",
            "        \n",
            "    ano_val = int(row['ano']) if pd.notna(row.get('ano')) else None\n",
            "    gabarito_val = extrair_str_segura(row.get('gabarito')) or 'Discursiva'\n",
            "    solucao_val = extrair_str_segura(row.get('solucao_markdown'))\n",
            "    topico_val = normalizar_topico_lemmas(row.get('topico'))\n",
            "    subtopico_val = extrair_str_segura(row.get('topico'))\n",
            "\n",
            "    registro = {\n",
            "        'materia': 'Matemática',\n",
            "        'topico': topico_val,\n",
            "        'subtopico': subtopico_val,\n",
            "        'dificuldade': 5,  # Nível Olímpico / Avançado\n",
            "        'banca': str(row['banca']),\n",
            "        'ano': ano_val,\n",
            "        'edicao': extrair_str_segura(row.get('edicao_competicao')),\n",
            "        'etapa': extrair_str_segura(row.get('etapa')),\n",
            "        'tipo_material': str(row['tipo_material_final']),\n",
            "        'pais': extrair_str_segura(row.get('pais')),\n",
            "        'enunciado': enunciado_final,\n",
            "        'gabarito': gabarito_val,\n",
            "        'solucao': solucao_val,\n",
            "        'figura_path': None,\n",
            "        'tipo': 'discursiva',\n",
            "        'mathnet_id': str(row['id']),\n",
            "        'estrategias_esperadas': [topico_val, 'Demonstração Axiomática'],\n",
            "    }\n",
            "    registros_para_inserir.append(registro)\n",
            "\n",
            "print(f'Total de registros formatados: {len(registros_para_inserir)}')\n",
            "print('\\nExemplo de Registro Formatado:')\n",
            "import pprint\n",
            "pprint.pprint(registros_para_inserir[0])"
        ]
    }

    cell_ingest = {
        "cell_type": "code",
        "execution_count": None,
        "metadata": {},
        "outputs": [],
        "source": [
            "# ==============================================================================\n",
            "# 8.3. INGESTÃO NO SUPABASE (LOTE CONFIGURÁVEL COM UPSERT IDEMPOTENTE)\n",
            "# ==============================================================================\n",
            "# Defina a quantidade de questões a inserir agora (ex: 200 de teste, ou todas as 18.000)\n",
            "LOTE_INICIAL = 200  # Ajuste para len(registros_para_inserir) para importar todo o acervo\n",
            "\n",
            "# Prioriza as questões da OBM (Brasil) e competições internacionais clássicas (IMO, Baltic Way, HMMT)\n",
            "def criterio_prioridade(r):\n",
            "    b = r['banca']\n",
            "    if b == 'OBM': return 0\n",
            "    if b == 'IMO': return 1\n",
            "    if b == 'Baltic Way': return 2\n",
            "    if b == 'HMMT': return 3\n",
            "    return 4\n",
            "\n",
            "registros_priorizados = sorted(registros_para_inserir, key=criterio_prioridade)\n",
            "lote_envio = registros_priorizados[:LOTE_INICIAL]\n",
            "\n",
            "print(f'Iniciando envio de {len(lote_envio)} questões para o Supabase PostgreSQL...')\n",
            "total_salvas = inserir_questoes_lote(lote_envio, chunk_size=50)\n",
            "print(f'Sucesso! {total_salvas} questões inseridas/atualizadas com sucesso no Supabase!')"
        ]
    }

    cell_audit = {
        "cell_type": "code",
        "execution_count": None,
        "metadata": {},
        "outputs": [],
        "source": [
            "# ==============================================================================\n",
            "# 8.4. AUDITORIA AO VIVO DO BANCO SUPABASE\n",
            "# ==============================================================================\n",
            "supabase = get_supabase()\n",
            "\n",
            "# 1. Contagem total de questões no banco\n",
            "res_count = supabase.table('questoes').select('id', count='exact').execute()\n",
            "print(f'Total Geral de Questões no Banco LEMMAS: {res_count.count}')\n",
            "\n",
            "# 2. Últimas questões inseridas com os novos metadados\n",
            "res_recentes = supabase.table('questoes') \\\n",
            "    .select('id, banca, ano, edicao, etapa, tipo_material, pais, topico, mathnet_id') \\\n",
            "    .not_.is_('mathnet_id', 'null') \\\n",
            "    .order('id', desc=True) \\\n",
            "    .limit(10) \\\n",
            "    .execute()\n",
            "\n",
            "df_auditoria = pd.DataFrame(res_recentes.data)\n",
            "display(df_auditoria)\n",
            "\n",
            "# 3. Distribuição por tipo de material no banco\n",
            "res_materiais = supabase.table('questoes') \\\n",
            "    .select('tipo_material') \\\n",
            "    .not_.is_('tipo_material', 'null') \\\n",
            "    .execute()\n",
            "df_mat = pd.DataFrame(res_materiais.data)\n",
            "if not df_mat.empty:\n",
            "    print('\\nDistribuição por Tipo de Material no Supabase:')\n",
            "    display(df_mat['tipo_material'].value_counts())"
        ]
    }

    nb["cells"].extend([cell_markdown, cell_prep, cell_format, cell_ingest, cell_audit])

    with open(NOTEBOOK_PATH, "w", encoding="utf-8") as f:
        json.dump(nb, f, indent=1, ensure_ascii=False)

    print(f"Notebook atualizado com sucesso! Total de células agora: {len(nb['cells'])}")

if __name__ == "__main__":
    main()
