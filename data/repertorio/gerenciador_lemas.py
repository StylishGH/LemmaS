#!/usr/bin/env python3
"""
Gerenciador e Sincronizador de Lemas Fundamentais (LemmaS Repertório).
Permite adicionar lemas ao arquivo canônico data/repertorio/lemas_fundamentais.json
e ao banco Supabase (tabela conceitos) com verificação estrita de duplicatas.

Uso:
  # 1. Sincronizar todos os lemas do JSON com o Supabase (sem duplicar):
  python gerenciador_lemas.py --sincronizar

  # 2. Auditar e verificar lemas e possíveis duplicatas:
  python gerenciador_lemas.py --auditar

  # 3. Adicionar um novo lema individualmente:
  python gerenciador_lemas.py --adicionar \\
    --nome "Lema de Schur" \\
    --materia "Álgebra" \\
    --topico "Desigualdades Algébricas" \\
    --gatilho "Quando há soma simétrica de três variáveis não-negativas com expoente r > 0" \\
    --acao "Aplique a desigualdade de Schur nos termos ordenados" \\
    --formula "$$\\sum x^r(x-y)(x-z) \\ge 0$$"

  # 4. Adicionar lemas a partir de outro arquivo JSON:
  python gerenciador_lemas.py --arquivo novos_lemas.json
"""

import os
import sys
import json
import argparse
import unicodedata
from pathlib import Path
from typing import Dict, List, Optional, Tuple

# Blindagem contra encoding cp1252 do terminal Windows
if sys.platform == "win32" and hasattr(sys.stdout, "buffer"):
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

# Caminhos canônicos do projeto
SCRIPT_DIR = Path(__file__).resolve().parent
JSON_LEMAS_PATH = SCRIPT_DIR / "lemas_fundamentais.json"
PROJECT_ROOT = SCRIPT_DIR.parents[1]
BACKEND_ENV = PROJECT_ROOT / "backend" / ".env"
FRONTEND_ENV = PROJECT_ROOT / "frontend" / ".env.local"


def normalizar_texto(texto: str) -> str:
    """Normaliza texto removendo espaços extras e padronizando Unicode."""
    if not texto:
        return ""
    texto = unicodedata.normalize("NFC", texto)
    return " ".join(texto.strip().split())


def normalizar_chave(texto: str) -> str:
    """Normaliza para chave de busca case-insensitive e sem acentos."""
    if not texto:
        return ""
    norm = unicodedata.normalize("NFKD", texto)
    sem_acentos = "".join(c for c in norm if not unicodedata.combining(c))
    return " ".join(sem_acentos.strip().lower().split())


def carregar_env() -> Dict[str, str]:
    """Carrega variáveis de ambiente de backend/.env ou frontend/.env.local."""
    env = dict(os.environ)
    for p in [BACKEND_ENV, FRONTEND_ENV]:
        if p.exists():
            for line in p.read_text(encoding="utf-8").splitlines():
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    k, v = line.split("=", 1)
                    k = k.strip()
                    v = v.strip().strip('"').strip("'")
                    if k not in env:
                        env[k] = v
    return env


def obter_cliente_supabase():
    """Inicializa e retorna o cliente Supabase."""
    env = carregar_env()
    url = env.get("SUPABASE_URL") or env.get("NEXT_PUBLIC_SUPABASE_URL")
    key = env.get("SUPABASE_KEY") or env.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")

    if not url or not key:
        print("⚠️  Aviso: Credenciais do Supabase não encontradas no ambiente.")
        print("   O script funcionará normalmente operando sobre o arquivo JSON local.")
        return None

    try:
        from supabase import create_client
        return create_client(url, key)
    except Exception as e:
        print(f"⚠️  Não foi possível conectar ao Supabase: {e}")
        return None


def carregar_lemas_json() -> List[Dict[str, str]]:
    """Carrega a lista canônica de lemas do arquivo JSON."""
    if not JSON_LEMAS_PATH.exists():
        return []
    with open(JSON_LEMAS_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def salvar_lemas_json(lemas: List[Dict[str, str]]) -> None:
    """Salva a lista canônica no arquivo JSON formatado."""
    with open(JSON_LEMAS_PATH, "w", encoding="utf-8") as f:
        json.dump(lemas, f, ensure_ascii=False, indent=2)
        f.write("\n")


def existe_lema_no_json(nome: str, lemas: List[Dict[str, str]]) -> Tuple[bool, Optional[Dict[str, str]]]:
    """Verifica se um lema com o mesmo nome normalizado já existe no JSON."""
    chave_busca = normalizar_chave(nome)
    for lema in lemas:
        if normalizar_chave(lema.get("nome", "")) == chave_busca:
            return True, lema
    return False, None


def adicionar_lema(
    lema: Dict[str, str],
    atualizar_se_existir: bool = False,
    sincronizar_db: bool = True
) -> bool:
    """
    Adiciona um lema individual ao JSON e opcionalmente ao Supabase.
    Retorna True se foi adicionado/atualizado e False se foi ignorado por já existir.
    """
    nome = normalizar_texto(lema.get("nome", ""))
    if not nome:
        print("❌ Erro: O lema precisa de um 'nome' válido.")
        return False

    lema_limpo = {
        "nome": nome,
        "materia": normalizar_texto(lema.get("materia", "Matemática")),
        "topico": normalizar_texto(lema.get("topico", "Geral")),
        "gatilho": normalizar_texto(lema.get("gatilho", "")),
        "acao_ou_teorema": normalizar_texto(lema.get("acao_ou_teorema", "")),
        "formula_latex": normalizar_texto(lema.get("formula_latex", ""))
    }

    lemas = carregar_lemas_json()
    ja_existe, lema_existente = existe_lema_no_json(nome, lemas)

    if ja_existe:
        if not atualizar_se_existir:
            print(f"ℹ️  [REPETIDO - IGNORADO]: O lema '{nome}' já existe no repertório. Nenhuma duplicação feita.")
            return False
        else:
            # Atualiza os dados do lema existente
            for idx, item in enumerate(lemas):
                if normalizar_chave(item.get("nome", "")) == normalizar_chave(nome):
                    lemas[idx] = lema_limpo
                    break
            salvar_lemas_json(lemas)
            print(f"🔄 [ATUALIZADO]: Lema '{nome}' atualizado com sucesso no JSON.")
    else:
        lemas.append(lema_limpo)
        salvar_lemas_json(lemas)
        print(f"✅ [ADICIONADO]: Lema '{nome}' incluído no JSON com sucesso! (Total: {len(lemas)})")

    # Sincroniza com Supabase se solicitado
    if sincronizar_db:
        sb = obter_cliente_supabase()
        if sb:
            try:
                # Upsert idempotente no Supabase via RPC segura com SECURITY DEFINER
                sb.rpc("upsert_conceito", {
                    "p_nome": lema_limpo["nome"],
                    "p_materia": lema_limpo["materia"],
                    "p_topico": lema_limpo["topico"],
                    "p_gatilho": lema_limpo["gatilho"],
                    "p_acao_ou_teorema": lema_limpo["acao_ou_teorema"],
                    "p_formula_latex": lema_limpo["formula_latex"]
                }).execute()
                print(f"   ↳ Sincronizado com a tabela 'conceitos' no Supabase.")
            except Exception as e:
                print(f"   ↳ Aviso ao sincronizar com Supabase: {e}")

    return True


def adicionar_em_lote(lista_novos: List[Dict[str, str]], atualizar: bool = False) -> None:
    """Adiciona múltiplos lemas ignorando repetidos."""
    lemas_atuais = carregar_lemas_json()
    chaves_atuais = {normalizar_chave(l.get("nome", "")): idx for idx, l in enumerate(lemas_atuais)}
    
    adicionados = 0
    ignorados = 0
    atualizados = 0

    for item in lista_novos:
        nome = normalizar_texto(item.get("nome", ""))
        if not nome:
            continue
        chave = normalizar_chave(nome)
        
        lema_limpo = {
            "nome": nome,
            "materia": normalizar_texto(item.get("materia", "Matemática")),
            "topico": normalizar_texto(item.get("topico", "Geral")),
            "gatilho": normalizar_texto(item.get("gatilho", "")),
            "acao_ou_teorema": normalizar_texto(item.get("acao_ou_teorema", "")),
            "formula_latex": normalizar_texto(item.get("formula_latex", ""))
        }

        if chave in chaves_atuais:
            if atualizar:
                idx = chaves_atuais[chave]
                lemas_atuais[idx] = lema_limpo
                atualizados += 1
            else:
                ignorados += 1
        else:
            lemas_atuais.append(lema_limpo)
            chaves_atuais[chave] = len(lemas_atuais) - 1
            adicionados += 1

    salvar_lemas_json(lemas_atuais)
    print(f"\n📊 Resumo da Ingestão em Lote:")
    print(f"   • Novos lemas adicionados: {adicionados}")
    print(f"   • Lemas repetidos ignorados: {ignorados}")
    if atualizar:
        print(f"   • Lemas atualizados: {atualizados}")
    print(f"   • Total no acervo local: {len(lemas_atuais)}")


def sincronizar_com_banco() -> None:
    """Sincroniza todos os lemas do JSON local com a tabela conceitos do Supabase."""
    sb = obter_cliente_supabase()
    if not sb:
        print("❌ Não foi possível conectar ao Supabase para sincronização.")
        return

    lemas = carregar_lemas_json()
    print(f"\n🚀 Sincronizando {len(lemas)} lemas do JSON com o Supabase...")

    # Busca nomes já existentes no banco
    res = sb.table("conceitos").select("nome").execute()
    existentes_db = {normalizar_chave(r["nome"]) for r in res.data} if res.data else set()

    novos_para_inserir = []
    ja_no_banco = 0

    for l in lemas:
        if normalizar_chave(l["nome"]) in existentes_db:
            ja_no_banco += 1
        else:
            novos_para_inserir.append(l)

    if novos_para_inserir:
        print(f"   • {len(novos_para_inserir)} lemas inéditos encontrados para inserir no banco.")
        for item in novos_para_inserir:
            sb.rpc("upsert_conceito", {
                "p_nome": item["nome"],
                "p_materia": item.get("materia", "Matemática"),
                "p_topico": item.get("topico", "Geral"),
                "p_gatilho": item.get("gatilho", ""),
                "p_acao_ou_teorema": item.get("acao_ou_teorema", ""),
                "p_formula_latex": item.get("formula_latex", "")
            }).execute()
        print(f"✅ Inserção concluída com sucesso!")
    else:
        print("✨ Todos os lemas do JSON já estão cadastrados no banco de dados. Nenhuma duplicação gerada.")

    print(f"📊 Estado Final:")
    print(f"   • Já estavam no banco: {ja_no_banco}")
    print(f"   • Novos inseridos: {len(novos_para_inserir)}")
    
    total_db = sb.table("conceitos").select("id", count="exact").execute()
    print(f"   • Total de lemas no Supabase: {total_db.count if hasattr(total_db, 'count') and total_db.count is not None else len(res.data) + len(novos_para_inserir)}")


def auditar_repertorio() -> None:
    """Audita a integridade do repertório local e do Supabase."""
    lemas = carregar_lemas_json()
    print(f"\n🔍 Auditoria do Repertório de Lemas Fundamentais:")
    print(f"   • Total de lemas em {JSON_LEMAS_PATH.name}: {len(lemas)}")

    # Contagem de duplicatas no JSON
    vistos = set()
    duplicatas = []
    for l in lemas:
        chave = normalizar_chave(l.get("nome", ""))
        if chave in vistos:
            duplicatas.append(l.get("nome"))
        vistos.add(chave)

    if duplicatas:
        print(f"⚠️  ATENÇÃO: {len(duplicatas)} duplicatas encontradas dentro do JSON:")
        for d in duplicatas:
            print(f"      - {d}")
    else:
        print("   ✅ Zero duplicatas no arquivo JSON.")

    # Matérias contempladas
    materias = {}
    for l in lemas:
        m = l.get("materia", "Sem Matéria")
        materias[m] = materias.get(m, 0) + 1

    print("\n📚 Distribuição por Matéria:")
    for m, c in sorted(materias.items(), key=lambda x: -x[1]):
        print(f"   • {m}: {c} lemas")

    # Comparação com o banco Supabase
    sb = obter_cliente_supabase()
    if sb:
        res = sb.table("conceitos").select("nome").execute()
        db_count = len(res.data) if res.data else 0
        print(f"\n🌐 Status no Supabase:")
        print(f"   • Total de conceitos na tabela: {db_count}")
        if db_count == len(lemas):
            print("   ✅ Banco e JSON estão 100% sincronizados!")
        else:
            print(f"   ℹ️  Diferença de {abs(db_count - len(lemas))} registros entre o banco e o JSON local.")


def main():
    parser = argparse.ArgumentParser(
        description="Gerenciador de Lemas Fundamentais do LemmaS (com prevenção estrita de duplicatas)."
    )
    parser.add_argument("--sincronizar", action="store_true", help="Sincroniza JSON local com a tabela conceitos no Supabase")
    parser.add_argument("--auditar", action="store_true", help="Audita duplicatas e estatísticas do repertório")
    parser.add_argument("--adicionar", action="store_true", help="Adiciona um novo lema individual")
    parser.add_argument("--nome", type=str, help="Nome do lema/teorema")
    parser.add_argument("--materia", type=str, default="Matemática", help="Grande área ou matéria")
    parser.add_argument("--topico", type=str, default="Geral", help="Tópico específico")
    parser.add_argument("--gatilho", type=str, default="", help="Gatilho/contexto de aplicação")
    parser.add_argument("--acao", type=str, default="", help="Ação heurística ou teorema a aplicar")
    parser.add_argument("--formula", type=str, default="", help="Fórmula canônica em LaTeX ($$...$$)")
    parser.add_argument("--arquivo", type=str, help="Caminho de arquivo JSON com lista de lemas para adicionar em lote")
    parser.add_argument("--atualizar", action="store_true", help="Atualiza lema existente em vez de ignorar se já existir")

    args = parser.parse_args()

    # Se nenhum argumento for passado, exibe o menu/auditoria padrão
    if len(sys.argv) == 1:
        auditar_repertorio()
        print("\nDica: Para sincronizar com o banco, execute:")
        print("  python gerenciador_lemas.py --sincronizar")
        return

    if args.auditar:
        auditar_repertorio()
        return

    if args.sincronizar:
        sincronizar_com_banco()
        return

    if args.arquivo:
        caminho = Path(args.arquivo)
        if not caminho.exists():
            print(f"❌ Arquivo não encontrado: {caminho}")
            return
        with open(caminho, "r", encoding="utf-8") as f:
            novos = json.load(f)
        if not isinstance(novos, list):
            print("❌ O arquivo JSON precisa conter uma lista de objetos.")
            return
        adicionar_em_lote(novos, atualizar=args.atualizar)
        return

    if args.adicionar:
        if not args.nome:
            print("❌ O parâmetro --nome é obrigatório para adicionar um lema.")
            return
        novo_lema = {
            "nome": args.nome,
            "materia": args.materia,
            "topico": args.topico,
            "gatilho": args.gatilho,
            "acao_ou_teorema": args.acao,
            "formula_latex": args.formula
        }
        adicionar_lema(novo_lema, atualizar_se_existir=args.atualizar, sincronizar_db=True)
        return


if __name__ == "__main__":
    main()
