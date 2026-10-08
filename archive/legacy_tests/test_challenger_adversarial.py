"""
Script de Testes Adversariais - Challenger 2
Stress-testing de Multitenancy, Controle de Acesso, Configuração e Higiene do Repositório.
"""

import os
import sys
import io
import json
import sqlite3
import tempfile
from pathlib import Path
from unittest.mock import MagicMock, patch

# Configurar stdout para UTF-8 no Windows
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

# Schema SQL path
SCHEMA_PATH = BASE_DIR / "src" / "database" / "schema.sql"

def criar_banco_teste_arquivo():
    """Cria um arquivo de banco SQLite temporário com o schema completo do MathAI."""
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".db")
    tmp_path = tmp.name
    tmp.close()
    con = sqlite3.connect(tmp_path)
    con.row_factory = sqlite3.Row
    con.execute("PRAGMA foreign_keys = ON;")
    with open(SCHEMA_PATH, "r", encoding="utf-8") as f:
        schema_sql = f.read()
    con.executescript(schema_sql)
    con.commit()
    con.close()
    return tmp_path

def conectar_banco(db_path):
    con = sqlite3.connect(db_path)
    con.row_factory = sqlite3.Row
    con.execute("PRAGMA foreign_keys = ON;")
    return con


def test_1_mandatory_aluno_id():
    print("=" * 70)
    print("TESTE 1: aluno_id Obrigatório em attempts.py (FIX-04)")
    print("=" * 70)

    import src.database.attempts as attempts_mod

    # 1.1 Testar obter_historico_tentativas sem argumento
    print("\n--- 1.1: Chamada sem aluno_id em obter_historico_tentativas ---")
    try:
        attempts_mod.obter_historico_tentativas()
        print("❌ FALHA: obter_historico_tentativas() permitiu chamada sem argumentos!")
        assert False, "obter_historico_tentativas() deve exigir aluno_id"
    except TypeError as e:
        print(f"✔ SUCESSO: TypeError levantado corretamente: {e}")

    # 1.2 Testar obter_metricas_estudante sem argumento
    print("\n--- 1.2: Chamada sem aluno_id em obter_metricas_estudante ---")
    try:
        attempts_mod.obter_metricas_estudante()
        print("❌ FALHA: obter_metricas_estudante() permitiu chamada sem argumentos!")
        assert False, "obter_metricas_estudante() deve exigir aluno_id"
    except TypeError as e:
        print(f"✔ SUCESSO: TypeError levantado corretamente: {e}")

    # 1.3 Testar fallback fail-closed quando aluno_id=None
    print("\n--- 1.3: Chamada com aluno_id=None (Comportamento Fail-Closed) ---")
    db_none = criar_banco_teste_arquivo()
    try:
        with patch("src.database.attempts.pegar_conexao", side_effect=lambda: conectar_banco(db_none)):
            hist_none = attempts_mod.obter_historico_tentativas(None)
            print(f"Histórico com aluno_id=None: {hist_none}")
            assert hist_none == [], f"Esperado [], obteve {hist_none}"
            print("✔ SUCESSO: obter_historico_tentativas(None) retorna lista vazia.")

            metr_none = attempts_mod.obter_metricas_estudante(None)
            print(f"Métricas com aluno_id=None: {metr_none}")
            assert metr_none["total_resolvidas"] == 0
            assert metr_none["total_acertos"] == 0
            assert metr_none["taxa_acerto"] == 0.0
            assert metr_none["materias"] == []
            print("✔ SUCESSO: obter_metricas_estudante(None) retorna métricas zeradas sem crash.")
    finally:
        if os.path.exists(db_none):
            os.remove(db_none)

    # 1.4 Testar Isolamento Multitenant (Aluno 1 vs Aluno 2)
    print("\n--- 1.4: Isolamento Multi-tenant (Aluno 101 vs Aluno 202) ---")
    db_iso = criar_banco_teste_arquivo()
    con_init = conectar_banco(db_iso)
    cur = con_init.cursor()

    # Inserir usuários
    cur.execute("INSERT INTO usuarios (id, nome, email, senha_hash) VALUES (101, 'Aluno Um', 'aluno1@test.com', 'hash1')")
    cur.execute("INSERT INTO usuarios (id, nome, email, senha_hash) VALUES (202, 'Aluno Dois', 'aluno2@test.com', 'hash2')")

    # Inserir questões
    cur.execute("INSERT INTO questoes (id, materia, topico, enunciado, gabarito) VALUES (1, 'Álgebra', 'Polinômios', 'Enunciado Q1', 'A')")
    cur.execute("INSERT INTO questoes (id, materia, topico, enunciado, gabarito) VALUES (2, 'Geometria', 'Triângulos', 'Enunciado Q2', 'B')")
    cur.execute("INSERT INTO questoes (id, materia, topico, enunciado, gabarito) VALUES (3, 'Cálculo', 'Limites', 'Enunciado Q3', 'C')")
    con_init.commit()
    con_init.close()

    try:
        # Usar patch em pegar_conexao para que as funções usem nosso banco isolado
        with patch("src.database.attempts.pegar_conexao", side_effect=lambda: conectar_banco(db_iso)):
            # Aluno 101 resolve Q1 (acertou, 60s) e Q2 (errou, 120s)
            attempts_mod.registrar_tentativa(
                questao_id=1, tempo_segundos=60, acertou=True, aluno_id=101,
                estrategia_usada="Fatoração", tipo_erro="nenhum", confianca_aluno=4
            )
            attempts_mod.registrar_tentativa(
                questao_id=2, tempo_segundos=120, acertou=False, aluno_id=101,
                estrategia_usada="Geometria Analítica", tipo_erro="conta_sinal", confianca_aluno=2
            )

            # Aluno 202 resolve Q3 (acertou, 40s), Q3 (acertou, 30s) e Q1 (acertou, 50s)
            attempts_mod.registrar_tentativa(
                questao_id=3, tempo_segundos=40, acertou=True, aluno_id=202,
                estrategia_usada="L'Hopital", tipo_erro="nenhum", confianca_aluno=5
            )
            attempts_mod.registrar_tentativa(
                questao_id=3, tempo_segundos=30, acertou=True, aluno_id=202,
                estrategia_usada="L'Hopital", tipo_erro="nenhum", confianca_aluno=5
            )
            attempts_mod.registrar_tentativa(
                questao_id=1, tempo_segundos=50, acertou=True, aluno_id=202,
                estrategia_usada="Substituição", tipo_erro="nenhum", confianca_aluno=4
            )

            # Verificar histórico do Aluno 101
            h101 = attempts_mod.obter_historico_tentativas(101)
            print(f"Aluno 101 - Total de tentativas no histórico: {len(h101)}")
            assert len(h101) == 2, f"Esperado 2 tentativas para aluno 101, obteve {len(h101)}"
            materias_101 = {row["materia"] for row in h101}
            assert materias_101 == {"Álgebra", "Geometria"}, f"Matérias inesperadas: {materias_101}"
            assert "Cálculo" not in materias_101, "VAZAMENTO: Matéria 'Cálculo' do Aluno 202 apareceu no Aluno 101!"

            # Verificar histórico do Aluno 202
            h202 = attempts_mod.obter_historico_tentativas(202)
            print(f"Aluno 202 - Total de tentativas no histórico: {len(h202)}")
            assert len(h202) == 3, f"Esperado 3 tentativas para aluno 202, obteve {len(h202)}"
            materias_202 = {row["materia"] for row in h202}
            assert "Geometria" not in materias_202, "VAZAMENTO: Matéria 'Geometria' do Aluno 101 apareceu no Aluno 202!"

            # Verificar métricas do Aluno 101
            m101 = attempts_mod.obter_metricas_estudante(101)
            print(f"Aluno 101 - Métricas: resolvidas={m101['total_resolvidas']}, acertos={m101['total_acertos']}, taxa={m101['taxa_acerto']}%, tempo_medio={m101['tempo_medio']}s")
            assert m101["total_resolvidas"] == 2
            assert m101["total_acertos"] == 1
            assert m101["taxa_acerto"] == 50.0
            assert m101["tempo_medio"] == 90.0
            mats_101_nomes = [m["materia"] for m in m101["materias"]]
            assert "Cálculo" not in mats_101_nomes, "VAZAMENTO: Métricas por matéria de 202 vazaram para 101!"
            estrats_101 = [e["estrategia_usada"] for e in m101["estrategias"]]
            assert "L'Hopital" not in estrats_101, "VAZAMENTO: Estratégia de 202 vazou para 101!"
            erros_101 = [err["tipo_erro"] for err in m101["erros"]]
            assert erros_101 == ["conta_sinal"]

            # Verificar métricas do Aluno 202
            m202 = attempts_mod.obter_metricas_estudante(202)
            print(f"Aluno 202 - Métricas: resolvidas={m202['total_resolvidas']}, acertos={m202['total_acertos']}, taxa={m202['taxa_acerto']}%, tempo_medio={m202['tempo_medio']}s")
            assert m202["total_resolvidas"] == 3
            assert m202["total_acertos"] == 3
            assert m202["taxa_acerto"] == 100.0
            assert m202["tempo_medio"] == 40.0
            assert len(m202["erros"]) == 0

            # Aluno 303 (zero tentativas)
            m303 = attempts_mod.obter_metricas_estudante(303)
            print(f"Aluno 303 (sem dados) - resolvidas={m303['total_resolvidas']}, taxa={m303['taxa_acerto']}%")
            assert m303["total_resolvidas"] == 0
            assert m303["total_acertos"] == 0
            assert m303["taxa_acerto"] == 0.0
            assert m303["materias"] == []

            # Verificar isolamento em revisao_espacada (SM-2)
            con_check = conectar_banco(db_iso)
            cur_check = con_check.cursor()
            cur_check.execute("SELECT aluno_id, item_id, repeticoes FROM revisao_espacada")
            revs = cur_check.fetchall()
            print(f"Revisões espaçadas cadastradas: {[dict(r) for r in revs]}")
            # Q1 foi resolvida tanto por 101 quanto por 202: devem existir 2 registros distintos
            q1_revs = [r for r in revs if r["item_id"] == 1]
            assert len(q1_revs) == 2, f"Esperado 2 registros de SM-2 para Q1, obteve {len(q1_revs)}"
            aluno_ids_q1 = {r["aluno_id"] for r in q1_revs}
            assert aluno_ids_q1 == {101, 202}, "Revisão espaçada não isolou por aluno!"
            con_check.close()
    finally:
        if os.path.exists(db_iso):
            os.remove(db_iso)

    print("✔ SUCESSO: Todos os testes de aluno_id obrigatório e isolamento passaram!\n")


def test_2_dataset_export_idor():
    print("=" * 70)
    print("TESTE 2: Prevenção de IDOR no Dataset Export (FIX-03)")
    print("=" * 70)

    import src.app.pages.dataset_export as de_mod

    # 2.1 Verificar que _listar_alunos NÃO existe mais no módulo
    print("\n--- 2.1: Verificar ausência da função inativa _listar_alunos ---")
    assert not hasattr(de_mod, "_listar_alunos"), "❌ FALHA: _listar_alunos() ainda existe em dataset_export.py!"
    print("✔ SUCESSO: _listar_alunos() foi devidamente removido do código.")

    # 2.2 Testar acesso deslogado em dataset_export.show()
    print("\n--- 2.2: Teste de Acesso Deslogado (st.session_state sem aluno_id) ---")
    mock_st = MagicMock()
    mock_st.session_state = {}  # Deslogado

    with patch("src.app.pages.dataset_export.st", mock_st):
        de_mod.show()
        # Verificar que warning foi exibido
        mock_st.warning.assert_called_with("Você precisa estar logado para acessar esta página.")
        # Verificar que não chamou dataframe nem download_button
        mock_st.dataframe.assert_not_called()
        mock_st.download_button.assert_not_called()
        print("✔ SUCESSO: show() abortou imediatamente com aviso amigável quando deslogado.")

    # 2.3 Testar acesso autenticado e isolamento de dados no show()
    print("\n--- 2.3: Teste de Acesso Autenticado e Isolamento IDOR no show() ---")
    db_de = criar_banco_teste_arquivo()
    con_init = conectar_banco(db_de)
    cur = con_init.cursor()

    cur.execute("INSERT INTO usuarios (id, nome, email, senha_hash) VALUES (101, 'Aluno Um', 'a1@test.com', 'h1')")
    cur.execute("INSERT INTO usuarios (id, nome, email, senha_hash) VALUES (202, 'Aluno Dois', 'a2@test.com', 'h2')")
    cur.execute("INSERT INTO questoes (id, materia, topico, enunciado, gabarito) VALUES (1, 'Física', 'Cinemática', 'Q1', 'A')")

    # Inserir diagnósticos IA para 101 e 202
    cur.execute("""
        INSERT INTO diagnosticos_ia (id, questao_id, aluno_id, modelo_gemini, justificativa_texto, diagnostico)
        VALUES (1, 1, 101, 'gemini-flash', 'Justificativa Secreta Aluno 101', 'Diagnóstico Aluno 101')
    """)
    cur.execute("""
        INSERT INTO diagnosticos_ia (id, questao_id, aluno_id, modelo_gemini, justificativa_texto, diagnostico)
        VALUES (2, 1, 202, 'gemini-flash', 'Justificativa Secreta Aluno 202 - DADO PRIVADO', 'Diagnóstico Aluno 202')
    """)
    con_init.commit()
    con_init.close()

    mock_st_auth = MagicMock()
    mock_st_auth.session_state = {"aluno_id": 101}
    mock_st_auth.columns.side_effect = lambda n: [MagicMock() for _ in range(n if isinstance(n, int) else len(n))]

    try:
        with patch("src.app.pages.dataset_export.st", mock_st_auth), \
             patch("src.app.pages.dataset_export.pegar_conexao", side_effect=lambda: conectar_banco(db_de)):
            de_mod.show()
            # Verificar chamadas de download_button
            download_calls = mock_st_auth.download_button.call_args_list
            print(f"Chamadas de download_button: {len(download_calls)}")
            
            # Verificar o conteúdo dos dados baixados
            json_data_bytes = None
            for call in download_calls:
                kwargs = call[1] if call[1] else {}
                if "json" in kwargs.get("file_name", ""):
                    json_data_bytes = kwargs.get("data")

            assert json_data_bytes is not None, "Botão de download JSON não foi chamado!"
            json_str = json_data_bytes.decode("utf-8") if isinstance(json_data_bytes, bytes) else json_data_bytes
            print(f"Payload JSON exportado:\n{json_str[:300]}...")

            assert "Aluno 101" in json_str or "101" in json_str, "Dados do Aluno 101 não encontrados!"
            assert "Justificativa Secreta Aluno 202 - DADO PRIVADO" not in json_str, \
                "🚨 CRÍTICO (IDOR): Dados do Aluno 202 foram exportados para o Aluno 101!"
            print("✔ SUCESSO: Exportação estritamente isolada! Nenhum dado do Aluno 202 vazou.")

        # 2.4 Teste direto de _carregar_dados_dataset(aluno_id)
        print("\n--- 2.4: Teste direto de _carregar_dados_dataset com aluno_id ---")
        with patch("src.app.pages.dataset_export.pegar_conexao", side_effect=lambda: conectar_banco(db_de)):
            rows_101 = de_mod._carregar_dados_dataset(101)
            assert len(rows_101) == 1
            assert rows_101[0]["aluno_id"] == 101

            rows_202 = de_mod._carregar_dados_dataset(202)
            assert len(rows_202) == 1
            assert rows_202[0]["aluno_id"] == 202

            print("✔ SUCESSO: _carregar_dados_dataset() filtra com sucesso por aluno_id.")
    finally:
        if os.path.exists(db_de):
            os.remove(db_de)


def test_3_dashboard_unauthenticated():
    print("=" * 70)
    print("TESTE 3: Acesso ao Dashboard sem Autenticação")
    print("=" * 70)

    import src.app.pages.dashboard as dash_mod

    # 3.1 Testar show() quando session_state está vazio
    print("\n--- 3.1: show() com st.session_state vazio ---")
    mock_st = MagicMock()
    mock_st.session_state = {}

    with patch("src.app.pages.dashboard.st", mock_st), \
         patch("src.app.pages.dashboard.obter_metricas_estudante") as mock_metr, \
         patch("src.app.pages.dashboard.obter_historico_tentativas") as mock_hist:
        dash_mod.show()
        mock_st.warning.assert_called_with("Você precisa estar logado para acessar esta página.")
        mock_metr.assert_not_called()
        mock_hist.assert_not_called()
        print("✔ SUCESSO: Dashboard aborta imediatamente quando deslogado, sem consultar banco.")

    # 3.2 Testar show() quando aluno_id é None explicitamente
    print("\n--- 3.2: show() com aluno_id=None ---")
    mock_st = MagicMock()
    mock_st.session_state = {"aluno_id": None}

    with patch("src.app.pages.dashboard.st", mock_st), \
         patch("src.app.pages.dashboard.obter_metricas_estudante") as mock_metr, \
         patch("src.app.pages.dashboard.obter_historico_tentativas") as mock_hist:
        dash_mod.show()
        mock_st.warning.assert_called_with("Você precisa estar logado para acessar esta página.")
        mock_metr.assert_not_called()
        mock_hist.assert_not_called()
        print("✔ SUCESSO: Dashboard aborta imediatamente quando aluno_id=None.")

    # 3.3 Testar show() autenticado com 0 tentativas
    print("\n--- 3.3: show() autenticado com 0 tentativas (Estado Vazio) ---")
    mock_st_auth = MagicMock()
    mock_st_auth.session_state = {"aluno_id": 999}
    db_dash = criar_banco_teste_arquivo()

    try:
        with patch("src.app.pages.dashboard.st", mock_st_auth), \
             patch("src.database.attempts.pegar_conexao", side_effect=lambda: conectar_banco(db_dash)):
            dash_mod.show()
            # Deve exibir info de estado vazio e retornar
            mock_st_auth.info.assert_called()
            args = mock_st_auth.info.call_args[0][0]
            assert "Você ainda não registrou nenhuma tentativa" in args
            print(f"✔ SUCESSO: Estado vazio exibido corretamente: '{args}'")
    finally:
        if os.path.exists(db_dash):
            os.remove(db_dash)


def test_4_configuration_and_repo_hygiene():
    print("=" * 70)
    print("TESTE 4: Configuração (python-dotenv FIX-09) e Higiene (FIX-05)")
    print("=" * 70)

    # 4.1 Testar parsing do python-dotenv com valores complexos em .env sintético
    print("\n--- 4.1: Teste de parsing do .env com python-dotenv ---")
    conteudo_env_complexo = (
        '# Arquivo .env de teste adversarial\n'
        'TURSO_DATABASE_URL="libsql://mathai-db.turso.io?authToken=abc=123&foo=bar#baz"\n'
        'TURSO_AUTH_TOKEN="ey...token_with_many_===equals=="\n'
        'GEMINI_API_KEY="AIzaSy_Secret_Key_With_#_And_Special_Chars"\n'
        'MATHAI_ENV="production"\n'
        'MATHAI_BASE_URL="http://localhost:8501"\n'
    )

    with tempfile.TemporaryDirectory() as tmp_dir:
        tmp_env = Path(tmp_dir) / ".env"
        tmp_env.write_text(conteudo_env_complexo, encoding="utf-8")

        # Limpar variáveis de ambiente existentes
        for key in ["TURSO_DATABASE_URL", "TURSO_AUTH_TOKEN", "GEMINI_API_KEY", "DATABASE_URL", "AUTH_TOKEN"]:
            os.environ.pop(key, None)

        # Testar com patch em BASE_DIR de db.py
        import src.database.db as db_mod
        with patch.object(db_mod, "BASE_DIR", Path(tmp_dir)):
            url, token = db_mod._obter_credenciais_turso()
            print(f"URL recuperada do .env: {url}")
            print(f"Token recuperado do .env: {token}")
            assert url == "libsql://mathai-db.turso.io?authToken=abc=123&foo=bar#baz", f"URL incorreta: {url}"
            assert token == "ey...token_with_many_===equals==", f"Token incorreto: {token}"
            print("✔ SUCESSO: db.py leu URL e Token com caracteres complexos (=, &, ?, #) perfeitamente via dotenv.")

        # Testar client.py
        import src.ai.client as client_mod
        # Limpar GEMINI_API_KEY
        os.environ.pop("GEMINI_API_KEY", None)

        from dotenv import load_dotenv as real_load_dotenv
        with patch("dotenv.load_dotenv", side_effect=lambda p: real_load_dotenv(tmp_env)):
            chave = client_mod.obter_chave_api()
            print(f"Chave Gemini recuperada: {chave}")
            assert chave == "AIzaSy_Secret_Key_With_#_And_Special_Chars"
            print("✔ SUCESSO: client.py recuperou GEMINI_API_KEY com caracteres especiais perfeitamente.")

    # 4.2 Testar ausência de parsers manuais em db.py e client.py
    print("\n--- 4.2: Verificar ausência de loops manuais de split('=') ---")
    db_src = (BASE_DIR / "src" / "database" / "db.py").read_text(encoding="utf-8")
    client_src = (BASE_DIR / "src" / "ai" / "client.py").read_text(encoding="utf-8")

    assert "splitlines()" not in db_src, "db.py ainda contém splitlines() manual!"
    assert "split(\"=\", 1)" not in db_src, "db.py ainda contém split('=', 1) manual!"
    assert "load_dotenv" in db_src, "db.py não importa load_dotenv!"

    assert "splitlines()" not in client_src, "client.py ainda contém splitlines() manual!"
    assert "split(\"=\", 1)" not in client_src, "client.py ainda contém split('=', 1) manual!"
    assert "load_dotenv" in client_src, "client.py não importa load_dotenv!"
    print("✔ SUCESSO: db.py e client.py usam estritamente python-dotenv, sem resquícios de loops manuais.")

    # 4.3 Testar tracking git e .gitignore para ver_usuarios.py (FIX-05)
    print("\n--- 4.3: Verificar status de git tracking e .gitignore para ver_usuarios.py ---")
    import subprocess

    res_ls = subprocess.run(
        ["git", "ls-files", "ver_usuarios.py"],
        cwd=str(BASE_DIR),
        capture_output=True,
        text=True
    )
    print(f"git ls-files ver_usuarios.py saída: '{res_ls.stdout.strip()}' (rc={res_ls.returncode})")
    assert res_ls.stdout.strip() == "", f"❌ FALHA: ver_usuarios.py ainda está no índice do git! Saída: {res_ls.stdout}"
    print("✔ SUCESSO: ver_usuarios.py NÃO está rastreado no índice Git.")

    gitignore_content = (BASE_DIR / ".gitignore").read_text(encoding="utf-8")
    assert "ver_usuarios.py" in gitignore_content, "❌ FALHA: ver_usuarios.py não está listado em .gitignore!"
    print("✔ SUCESSO: ver_usuarios.py está explicitamente listado no .gitignore.")

    res_ignore = subprocess.run(
        ["git", "check-ignore", "-v", "ver_usuarios.py"],
        cwd=str(BASE_DIR),
        capture_output=True,
        text=True
    )
    print(f"git check-ignore saída: '{res_ignore.stdout.strip()}' (rc={res_ignore.returncode})")
    assert "ver_usuarios.py" in res_ignore.stdout, "❌ FALHA: git check-ignore não confirmou a regra de ignore!"
    print("✔ SUCESSO: git check-ignore confirma que ver_usuarios.py é ignorado.")


def main():
    print("INICIANDO SUITE DE TESTES ADVERSARIAIS - CHALLENGER 2")
    print(f"Diretório base: {BASE_DIR}")
    test_1_mandatory_aluno_id()
    test_2_dataset_export_idor()
    test_3_dashboard_unauthenticated()
    test_4_configuration_and_repo_hygiene()
    print("=" * 70)
    print("🎉 TODOS OS TESTES EMPÍRICOS PASSARAM COM 100% DE SUCESSO!")
    print("=" * 70)


if __name__ == "__main__":
    main()
