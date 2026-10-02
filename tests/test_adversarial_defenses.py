"""
Testes Adversariais de Segurança — MathAI
Foco:
1. Validação de força de senha (FIX-07)
2. Mitigação de XSS / Escapamento de HTML (FIX-08)
3. Hashing bcrypt e migração transparente de SHA-256 com auto-rehash (FIX-01)
4. Lógica de Rate Limiting no login (FIX-06)
"""

import sys
import io
import os
import json
import sqlite3
import hashlib
import tempfile
import unittest
from datetime import datetime, timedelta
from pathlib import Path

# Configura encoding
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

import bcrypt
import html
import streamlit as st

import src.database.users as users_module
from src.database.users import (
    _hash_senha,
    _verificar_senha,
    fazer_login,
    verificar_codigo_otp,
    gerar_codigo_verificacao,
    criar_sessao_lembrada,
    verificar_token_sessao,
    encerrar_sessao_por_token,
    criar_oauth_state,
    consumir_oauth_state,
    JANELA_BLOQUEIO_MINUTOS,
    MAX_TENTATIVAS_OTP
)


def extrair_erros_senha(c_senha: str) -> list[str]:
    """
    Replica exatamente as regras de validação de senha implementadas em login.py (L890-897).
    """
    erros = []
    if not c_senha:
        erros.append("Senha é obrigatória.")
    elif len(c_senha) < 8:
        erros.append("Senha deve ter pelo menos 8 caracteres.")
    elif not any(c.isdigit() for c in c_senha):
        erros.append("Senha deve conter pelo menos 1 número.")
    elif not any(c.isalpha() for c in c_senha):
        erros.append("Senha deve conter pelo menos 1 letra.")
    return erros


def criar_banco_teste(db_path: str):
    """
    Cria banco SQLite com o esquema usado pelo módulo de usuários do MathAI,
    incluindo as tabelas de segurança criadas por _garantir_tabelas_e_migracao():
    tentativas_login (rate limit server-side), oauth_states (anti login-CSRF)
    e sessoes_lembradas (tokens guardados apenas em hash).
    """
    con = sqlite3.connect(db_path)
    cur = con.cursor()
    cur.execute("""
        CREATE TABLE usuarios (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            senha_hash TEXT NOT NULL,
            idade INTEGER,
            celular TEXT,
            cpf TEXT,
            cep TEXT,
            logradouro TEXT,
            numero TEXT,
            bairro TEXT,
            cidade TEXT,
            estado TEXT,
            escolaridade TEXT,
            faculdade TEXT,
            curso TEXT,
            motivos TEXT DEFAULT '[]',
            concursos_foco TEXT DEFAULT '[]',
            verificado INTEGER NOT NULL DEFAULT 1,
            criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    cur.execute("""
        CREATE TABLE IF NOT EXISTS codigos_verificacao (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT NOT NULL,
            codigo TEXT NOT NULL,
            expira_em TIMESTAMP NOT NULL,
            usado INTEGER NOT NULL DEFAULT 0,
            criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            tentativas INTEGER NOT NULL DEFAULT 0
        )
    """)
    cur.execute("""
        CREATE TABLE IF NOT EXISTS tentativas_login (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT NOT NULL,
            ip TEXT,
            sucesso INTEGER NOT NULL DEFAULT 0,
            criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    cur.execute("""
        CREATE TABLE IF NOT EXISTS oauth_states (
            state TEXT PRIMARY KEY,
            criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    cur.execute("""
        CREATE TABLE IF NOT EXISTS sessoes_lembradas (
            token TEXT PRIMARY KEY,
            usuario_id INTEGER NOT NULL,
            expira_em TIMESTAMP NOT NULL,
            criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    con.commit()
    con.close()


def obter_conexao_teste(db_path: str):
    con = sqlite3.connect(db_path)
    con.row_factory = sqlite3.Row
    return con


class TestPasswordStrengthValidation(unittest.TestCase):
    """
    Validação adversarial de limites de senha (FIX-07).
    """

    def test_01_empty_password(self):
        erros = extrair_erros_senha("")
        self.assertIn("Senha é obrigatória.", erros)

    def test_02_less_than_8_chars(self):
        # 1 caractere
        self.assertIn("Senha deve ter pelo menos 8 caracteres.", extrair_erros_senha("a"))
        # 7 dígitos
        self.assertIn("Senha deve ter pelo menos 8 caracteres.", extrair_erros_senha("1234567"))
        # 7 letras
        self.assertIn("Senha deve ter pelo menos 8 caracteres.", extrair_erros_senha("abcdefg"))
        # 7 mistos
        self.assertIn("Senha deve ter pelo menos 8 caracteres.", extrair_erros_senha("Abc123!"))
        # 7 espaços
        self.assertIn("Senha deve ter pelo menos 8 caracteres.", extrair_erros_senha("       "))

    def test_03_digits_only_rejected(self):
        # 8 dígitos
        erros = extrair_erros_senha("12345678")
        self.assertIn("Senha deve conter pelo menos 1 letra.", erros)
        # 12 dígitos
        erros = extrair_erros_senha("123456789012")
        self.assertIn("Senha deve conter pelo menos 1 letra.", erros)

    def test_04_letters_only_rejected(self):
        # 8 letras minúsculas
        erros = extrair_erros_senha("abcdefgh")
        self.assertIn("Senha deve conter pelo menos 1 número.", erros)
        # 8 letras maiúsculas
        erros = extrair_erros_senha("ABCDEFGH")
        self.assertIn("Senha deve conter pelo menos 1 número.", erros)
        # Misto maiúsculas e minúsculas
        erros = extrair_erros_senha("AbcDefGhIj")
        self.assertIn("Senha deve conter pelo menos 1 número.", erros)

    def test_05_symbols_only_rejected(self):
        # 8 símbolos
        erros = extrair_erros_senha("!@#$%^&*")
        self.assertIn("Senha deve conter pelo menos 1 número.", erros)

    def test_06_symbols_and_digits_no_letters_rejected(self):
        erros = extrair_erros_senha("!@#$%^&1")
        self.assertIn("Senha deve conter pelo menos 1 letra.", erros)

    def test_07_symbols_and_letters_no_digits_rejected(self):
        erros = extrair_erros_senha("!@#$%^&a")
        self.assertIn("Senha deve conter pelo menos 1 número.", erros)

    def test_08_valid_mixed_passwords(self):
        # 8 caracteres: 7 dígitos, 1 letra
        self.assertEqual(extrair_erros_senha("1234567a"), [])
        # 8 caracteres: 1 letra, 7 dígitos
        self.assertEqual(extrair_erros_senha("a1234567"), [])
        # 8 caracteres: 7 letras, 1 dígito
        self.assertEqual(extrair_erros_senha("abcdefg1"), [])
        # 8 caracteres: 1 dígito, 7 letras
        self.assertEqual(extrair_erros_senha("1abcdefg"), [])
        # Letras + dígitos + símbolos
        self.assertEqual(extrair_erros_senha("Abc123!@#"), [])
        self.assertEqual(extrair_erros_senha("S3nh@F0rt3!"), [])
        self.assertEqual(extrair_erros_senha("Matematica2026"), [])

    def test_09_unicode_and_portuguese_accents(self):
        # Letras acentuadas são aceitas como letras por c.isalpha()
        self.assertEqual(extrair_erros_senha("áéíóú123"), [])
        self.assertEqual(extrair_erros_senha("Coração1"), [])

    def test_10_bcrypt_max_72_bytes_boundary(self):
        """
        Adversarial: Bcrypt tem limite nativo de 72 bytes.
        Verifica o comportamento de _hash_senha para 72 bytes e para > 72 bytes.
        """
        senha_72_bytes = "A" * 70 + "1b"
        hash_result = _hash_senha(senha_72_bytes)
        self.assertTrue(hash_result.startswith("$2b$"))
        self.assertTrue(_verificar_senha(senha_72_bytes, hash_result))

        # Senha com 100 bytes: no bcrypt nativo, senhas > 72 bytes levantam ValueError
        senha_100_bytes = "A" * 98 + "1b"
        with self.assertRaises(ValueError):
            _hash_senha(senha_100_bytes)


class TestHtmlEscapingXSS(unittest.TestCase):
    """
    Validação adversarial de injeção XSS e sanitização HTML (FIX-08).
    """

    PAYLOADS = [
        "<script>alert(1)</script>",
        '"><img src=x onerror=alert(1)>',
        "<svg/onload=alert('XSS')>",
        "' onmouseover='alert(1)'",
        '<iframe src="javascript:alert(1)"></iframe>',
        '"><script src=http://evil.com/x.js></script>',
        '<b onfocus=alert(1) tabindex=1>click</b>',
        '& < > " \''
    ]

    def test_01_html_escape_neutralizes_all_payloads(self):
        for payload in self.PAYLOADS:
            escaped = html.escape(payload)
            # Nenhuma tag HTML crua pode permanecer
            self.assertNotIn("<script>", escaped.lower())
            self.assertNotIn("<img", escaped.lower())
            self.assertNotIn("<svg", escaped.lower())
            self.assertNotIn("<iframe", escaped.lower())
            self.assertNotIn("<b ", escaped.lower())
            self.assertNotIn("<", escaped)
            self.assertNotIn(">", escaped)

    def test_02_login_page_2fa_email_escaping(self):
        """
        Em login.py (L487, 496):
        email_seguro = html.escape(email_verif)
        <b style="...">{email_seguro}</b>
        """
        for payload in self.PAYLOADS:
            email_malicioso = f"user+{payload}@example.com"
            email_seguro = html.escape(email_malicioso)
            card_html = f'<b style="color: #4f46e5;">{email_seguro}</b>'
            self.assertNotIn("<script>", card_html.lower())
            self.assertNotIn("<img", card_html.lower())
            self.assertNotIn("<svg", card_html.lower())
            # Verifica que caracteres perigosos foram substituídos por entidades
            if "<" in payload:
                self.assertNotIn("<", email_seguro)
                self.assertIn("&lt;", email_seguro)
            if ">" in payload:
                self.assertNotIn(">", email_seguro)
                self.assertIn("&gt;", email_seguro)
            if '"' in payload:
                self.assertNotIn('"', email_seguro)
                self.assertIn("&quot;", email_seguro)

    def test_03_perfil_page_escaping(self):
        """
        Em perfil.py (L143-165):
        nome_seguro = html.escape(nome_completo)
        email_seguro = html.escape(email_usuario)
        tag_subtitulo_seguro = html.escape(tag_subtitulo)
        iniciais_seguro = html.escape(iniciais)
        """
        malicious_name = '<script>alert("nome")</script>'
        malicious_email = '"><img src=x onerror=alert(1)>'
        malicious_tag = '<svg onload=alert(1)>'
        malicious_iniciais = '"><b onmouseover="alert(1)">'

        nome_seg = html.escape(malicious_name)
        email_seg = html.escape(malicious_email)
        tag_seg = html.escape(malicious_tag)
        iniciais_seg = html.escape(malicious_iniciais)

        rendered_block = f"""
        <div>{iniciais_seg}</div>
        <h2>{nome_seg}</h2>
        <span>{email_seg}</span>
        <span>{tag_seg}</span>
        """
        self.assertNotIn("<script>", rendered_block)
        self.assertNotIn("<img", rendered_block)
        self.assertNotIn("<svg", rendered_block)
        self.assertNotIn("<b ", rendered_block)
        self.assertIn("&lt;script&gt;", rendered_block)
        self.assertIn("&quot;&gt;&lt;img", rendered_block)

    def test_04_audit_g_pic_vulnerability_in_login(self):
        """
        AUDITORIA ADVERSARIAL:
        Em login.py linha 310:
        g_pic = g_user.get("picture", "")
        '<img src="' + g_pic + '" style="...">'
        Constata que g_pic sem html.escape() permite quebra de atributo se vier com aspas duplas.
        """
        malicious_pic = 'https://example.com/pic.png" onerror="alert(1)'
        raw_img_tag = '<img src="' + malicious_pic + '" style="width: 64px; height: 64px;">'
        
        has_xss_vector = 'onerror="alert(1)"' in raw_img_tag
        self.assertTrue(
            has_xss_vector,
            "Alerta de segurança: g_pic sem html.escape() permite quebra de atributo se o picture contiver aspas duplas!"
        )

        pic_seguro = html.escape(malicious_pic)
        mitigated_img_tag = '<img src="' + pic_seguro + '" style="width: 64px; height: 64px;">'
        self.assertNotIn('onerror="alert(1)"', mitigated_img_tag)
        self.assertIn('&quot;', mitigated_img_tag)


class TestBcryptHashingAndLegacyMigration(unittest.TestCase):
    """
    Validação adversarial de hashing bcrypt, fallback SHA-256 e auto-rehash (FIX-01).
    """

    def setUp(self):
        self.temp_db_file = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
        self.temp_db_file.close()
        self.db_path = self.temp_db_file.name

        criar_banco_teste(self.db_path)

        self.orig_pegar_conexao = users_module.pegar_conexao
        users_module.pegar_conexao = lambda: obter_conexao_teste(self.db_path)

    def tearDown(self):
        users_module.pegar_conexao = self.orig_pegar_conexao
        try:
            os.remove(self.db_path)
        except OSError:
            pass

    def test_01_bcrypt_hash_properties(self):
        senha = "MinhaSenhaForte2026!"
        h1 = _hash_senha(senha)
        h2 = _hash_senha(senha)

        # Deve começar com $2b$
        self.assertTrue(h1.startswith("$2b$"))
        self.assertTrue(h2.startswith("$2b$"))

        # Salting automático: dois hashes da mesma senha devem ser diferentes
        self.assertNotEqual(h1, h2)

        # Verificação positiva
        self.assertTrue(_verificar_senha(senha, h1))
        self.assertTrue(_verificar_senha(senha, h2))

        # Verificação negativa
        self.assertFalse(_verificar_senha("SenhaErrada123!", h1))

    def test_02_legacy_sha256_verification(self):
        senha_legada = "SenhaLegada123"
        hash_sha256 = hashlib.sha256(senha_legada.encode("utf-8")).hexdigest()

        # Confirma que é hash de 64 caracteres hexadecimais
        self.assertEqual(len(hash_sha256), 64)
        self.assertFalse(hash_sha256.startswith("$2b$"))

        # Verificação positiva com fallback SHA-256
        self.assertTrue(_verificar_senha(senha_legada, hash_sha256))

        # Verificação negativa com fallback SHA-256
        self.assertFalse(_verificar_senha("SenhaIncorreta", hash_sha256))

    def test_03_corrupt_hash_handling_and_none_vulnerability(self):
        """
        Integridade com hashes corrompidos.

        Antes, _verificar_senha com hash_armazenado=None levantava AttributeError
        (um NULL no banco derrubava o login com erro 500). Agora retorna False.
        """
        self.assertFalse(_verificar_senha("senha", ""))
        self.assertFalse(_verificar_senha("senha", "hash_invalido"))
        self.assertFalse(_verificar_senha("senha", "$2b$incompleto"))

        # Hash ausente (NULL no banco) não pode mais explodir
        self.assertFalse(_verificar_senha("senha", None))
        self.assertFalse(_verificar_senha("senha", 12345))  # type: ignore[arg-type]
        self.assertFalse(_verificar_senha("", _hash_senha("qualquer123")))

    def test_04_auto_rehash_migration_on_login(self):
        """
        Teste de integração empírico:
        1. Usuário registrado com SHA-256 no banco.
        2. Usuário faz login com sucesso.
        3. O banco de dados deve ser automaticamente atualizado para hash bcrypt ($2b$).
        4. O hash antigo SHA-256 não deve mais existir no banco.
        """
        email = "legado@mathai.com"
        senha = "SenhaLegada2026!"
        hash_antigo = hashlib.sha256(senha.encode("utf-8")).hexdigest()

        con = sqlite3.connect(self.db_path)
        cur = con.cursor()
        cur.execute("""
            INSERT INTO usuarios (nome, email, senha_hash, verificado)
            VALUES (?, ?, ?, 1)
        """, ("Aluno Legado", email, hash_antigo))
        con.commit()

        # Confirma estado inicial no banco
        cur.execute("SELECT senha_hash FROM usuarios WHERE email = ?", (email,))
        hash_no_banco_inicial = cur.fetchone()[0]
        self.assertEqual(hash_no_banco_inicial, hash_antigo)
        con.close()

        # Limpa session state antes do login
        for k in list(st.session_state.keys()):
            del st.session_state[k]

        # Executa login
        res_login = fazer_login(email, senha)
        self.assertTrue(res_login["ok"], f"Login falhou: {res_login.get('erro')}")

        # Consulta banco após o login
        con = sqlite3.connect(self.db_path)
        cur = con.cursor()
        cur.execute("SELECT senha_hash FROM usuarios WHERE email = ?", (email,))
        hash_no_banco_pos_login = cur.fetchone()[0]
        con.close()

        # O hash deve ter sido migrado para $2b$
        self.assertNotEqual(hash_no_banco_pos_login, hash_antigo)
        self.assertTrue(hash_no_banco_pos_login.startswith("$2b$"))

        # O novo hash deve verificar a senha perfeitamente
        self.assertTrue(_verificar_senha(senha, hash_no_banco_pos_login))

        # Segundo login subsequente deve continuar funcionando com o hash bcrypt
        res_login_2 = fazer_login(email, senha)
        self.assertTrue(res_login_2["ok"])


class _BaseUsuariosComBanco(unittest.TestCase):
    """
    Base para os testes do módulo de usuários com banco SQLite temporário.
    Não contém testes próprios — só infraestrutura (setUp/tearDown e helpers).
    """

    def setUp(self):
        self.temp_db_file = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
        self.temp_db_file.close()
        self.db_path = self.temp_db_file.name
        criar_banco_teste(self.db_path)

        self.orig_pegar_conexao = users_module.pegar_conexao
        users_module.pegar_conexao = lambda: obter_conexao_teste(self.db_path)

        for k in list(st.session_state.keys()):
            del st.session_state[k]

    def tearDown(self):
        users_module.pegar_conexao = self.orig_pegar_conexao
        try:
            os.remove(self.db_path)
        except OSError:
            pass

    def _criar_usuario(self, email="aluno@mathai.com", senha="SenhaCorreta123!", verificado=1):
        con = sqlite3.connect(self.db_path)
        con.execute(
            "INSERT INTO usuarios (nome, email, senha_hash, verificado) VALUES (?, ?, ?, ?)",
            ("Usuario Teste", email, _hash_senha(senha), verificado),
        )
        con.commit()
        con.close()

    def _falhas_no_banco(self, email="aluno@mathai.com"):
        con = sqlite3.connect(self.db_path)
        n = con.execute(
            "SELECT COUNT(*) FROM tentativas_login WHERE email = ? AND sucesso = 0", (email,)
        ).fetchone()[0]
        con.close()
        return n

    def _nova_sessao(self):
        """Simula o atacante abrindo uma sessão nova (era o bypass do contador antigo)."""
        for k in list(st.session_state.keys()):
            del st.session_state[k]


class TestRateLimitingLogic(_BaseUsuariosComBanco):
    """
    Rate limit server-side contra força bruta (FIX-06).

    A versão anterior deste teste validava um contador guardado em
    st.session_state — que era justamente a falha: qualquer sessão nova (aba
    anônima, cookies apagados) zerava o contador e liberava mais 5 tentativas.
    Agora o estado vive na tabela tentativas_login, e os testes abaixo provam
    que o bloqueio sobrevive à troca de sessão.
    """

    def setUp(self):
        super().setUp()
        self._criar_usuario(verificado=1)

    def test_01_lockout_after_5_failed_attempts_existing_user(self):
        email = "aluno@mathai.com"
        senha_errada = "SenhaErrada999!"

        # Tentativas 1 a 4: falha padrão, contabilizada no banco
        for i in range(1, 5):
            res = fazer_login(email, senha_errada)
            self.assertFalse(res["ok"])
            self.assertEqual(res["erro"], "E-mail ou senha incorretos.")
            self.assertEqual(self._falhas_no_banco(email), i)

        # Tentativa 5: atinge o limite e bloqueia
        res_5 = fazer_login(email, senha_errada)
        self.assertFalse(res_5["ok"])
        self.assertIn("Conta temporariamente bloqueada por excesso de tentativas", res_5["erro"])

        # Tentativa 6 (bloqueio ativo): rejeita imediatamente com contagem de segundos
        res_6 = fazer_login(email, senha_errada)
        self.assertFalse(res_6["ok"])
        self.assertIn("Muitas tentativas. Tente novamente em", res_6["erro"])

        # Tentativa 7 mesmo com a SENHA CORRETA deve ser bloqueada enquanto bloqueio ativo
        res_correta_durante_bloqueio = fazer_login(email, "SenhaCorreta123!")
        self.assertFalse(res_correta_durante_bloqueio["ok"])
        self.assertIn("Muitas tentativas. Tente novamente em", res_correta_durante_bloqueio["erro"])

    def test_02_lockout_after_5_failed_attempts_nonexistent_user(self):
        email = "inexistente@mathai.com"
        senha_qualquer = "QualquerSenha123!"

        for i in range(1, 5):
            res = fazer_login(email, senha_qualquer)
            self.assertFalse(res["ok"])
            self.assertEqual(res["erro"], "E-mail ou senha incorretos.")

        res_5 = fazer_login(email, senha_qualquer)
        self.assertFalse(res_5["ok"])
        self.assertIn("Conta temporariamente bloqueada por excesso de tentativas", res_5["erro"])

        res_6 = fazer_login(email, senha_qualquer)
        self.assertFalse(res_6["ok"])
        self.assertIn("Muitas tentativas. Tente novamente em", res_6["erro"])

    def test_02b_bloqueio_sobrevive_a_sessao_nova(self):
        """REGRESSÃO DA FALHA ORIGINAL.

        Com o contador em st.session_state, abrir uma sessão nova zerava o
        bloqueio. Com o estado no banco, o atacante continua barrado — que é o
        ponto central da correção.
        """
        email = "aluno@mathai.com"
        senha_errada = "SenhaErrada999!"
        for _ in range(5):
            fazer_login(email, senha_errada)

        self._nova_sessao()  # atacante abre aba anônima / limpa cookies
        res = fazer_login(email, senha_errada)
        self.assertFalse(res["ok"])
        self.assertIn("Muitas tentativas. Tente novamente em", res["erro"])

        # ...e nem com a senha correta numa sessão nova
        self._nova_sessao()
        res_correta = fazer_login(email, "SenhaCorreta123!")
        self.assertFalse(res_correta["ok"])
        self.assertIn("Muitas tentativas. Tente novamente em", res_correta["erro"])

        # E o contador antigo em session_state não existe mais
        self.assertNotIn(f"login_tentativas_{email}", st.session_state)
        self.assertNotIn(f"login_bloqueio_{email}", st.session_state)

    def test_02c_bloqueio_por_ip_pega_forca_bruta_distribuida(self):
        """Varrer vários e-mails do mesmo IP (password spraying) também bloqueia."""
        ip = "203.0.113.9"
        for i in range(5):
            fazer_login(f"alvo{i}@mathai.com", "Errada123!", ip=ip)

        res = fazer_login("outro@mathai.com", "Errada123!", ip=ip)
        self.assertFalse(res["ok"])
        self.assertIn("Muitas tentativas. Tente novamente em", res["erro"])

    def test_03_successful_login_clears_failure_counter(self):
        email = "aluno@mathai.com"
        senha_correta = "SenhaCorreta123!"
        senha_errada = "SenhaErrada999!"

        # 3 tentativas falhadas → 3 falhas no banco
        for _ in range(3):
            fazer_login(email, senha_errada)
        self.assertEqual(self._falhas_no_banco(email), 3)

        # Login bem-sucedido zera o histórico
        res_sucesso = fazer_login(email, senha_correta)
        self.assertTrue(res_sucesso["ok"])
        self.assertEqual(self._falhas_no_banco(email), 0)

        # Próxima tentativa errada começa do 1, não do 4
        fazer_login(email, senha_errada)
        self.assertEqual(self._falhas_no_banco(email), 1)

    def test_04_lockout_expiration(self):
        email = "aluno@mathai.com"
        senha_errada = "SenhaErrada999!"

        # Provoca bloqueio (5 tentativas)
        for _ in range(5):
            fazer_login(email, senha_errada)

        # Simula a passagem do tempo: envelhece os registros além da janela
        con = sqlite3.connect(self.db_path)
        antigo = (datetime.now() - timedelta(minutes=JANELA_BLOQUEIO_MINUTOS + 1)).strftime("%Y-%m-%d %H:%M:%S")
        con.execute("UPDATE tentativas_login SET criado_em = ?", (antigo,))
        con.commit()
        con.close()

        # Tentativa após a expiração: não é mais barrada pelo rate limiter
        res = fazer_login(email, senha_errada)
        self.assertEqual(res["erro"], "E-mail ou senha incorretos.")

    def test_05_email_case_insensitivity_and_whitespace(self):
        # " Aluno@MathAI.COM " deve compartilhar a mesma cota que "aluno@mathai.com"
        senha_errada = "Errada123!"

        fazer_login(" Aluno@MathAI.COM ", senha_errada)
        fazer_login("aluno@mathai.com", senha_errada)
        fazer_login("ALUNO@MATHAI.COM", senha_errada)

        self.assertEqual(self._falhas_no_banco("aluno@mathai.com"), 3)


class TestSessionTokenHashing(_BaseUsuariosComBanco):
    """O banco não pode guardar o token de sessão em claro (vazamento = sequestro)."""

    def setUp(self):
        super().setUp()
        self._criar_usuario(verificado=1)

    def _token_no_banco(self):
        con = sqlite3.connect(self.db_path)
        token = con.execute("SELECT token FROM sessoes_lembradas").fetchone()[0]
        con.close()
        return token

    def test_01_banco_guarda_apenas_o_hash(self):
        token = criar_sessao_lembrada(1)
        guardado = self._token_no_banco()

        self.assertNotEqual(guardado, token)
        self.assertEqual(guardado, hashlib.sha256(token.encode("utf-8")).hexdigest())

    def test_02_token_valido_autentica_e_valor_do_banco_nao(self):
        token = criar_sessao_lembrada(1)
        usuario = verificar_token_sessao(token)
        self.assertIsNotNone(usuario)
        assert usuario is not None
        self.assertEqual(usuario["email"], "aluno@mathai.com")

        # O que está gravado no banco NÃO serve como credencial
        self.assertIsNone(verificar_token_sessao(self._token_no_banco()))

    def test_03_logout_invalida_o_token(self):
        token = criar_sessao_lembrada(1)
        encerrar_sessao_por_token(token)
        self.assertIsNone(verificar_token_sessao(token))

    def test_04_tokens_invalidos_nao_quebram(self):
        self.assertIsNone(verificar_token_sessao(""))
        self.assertIsNone(verificar_token_sessao(None))  # type: ignore[arg-type]
        self.assertIsNone(verificar_token_sessao(12345))  # type: ignore[arg-type]


class TestOAuthState(_BaseUsuariosComBanco):
    """`state` do OAuth precisa ser single-use (anti login CSRF)."""

    def test_01_state_e_single_use(self):
        state = criar_oauth_state()
        self.assertTrue(consumir_oauth_state(state))
        # Reutilizar o mesmo state tem de ser recusado
        self.assertFalse(consumir_oauth_state(state))

    def test_02_states_invalidos_recusados(self):
        self.assertFalse(consumir_oauth_state("state-que-nao-existe"))
        self.assertFalse(consumir_oauth_state(None))
        self.assertFalse(consumir_oauth_state(""))

    def test_03_states_distintos_sao_independentes(self):
        s1 = criar_oauth_state()
        s2 = criar_oauth_state()
        self.assertNotEqual(s1, s2)
        self.assertTrue(consumir_oauth_state(s2))
        self.assertTrue(consumir_oauth_state(s1))


class TestOtpNaoVazaParaOTerminal(_BaseUsuariosComBanco):
    """O código OTP não pode voltar na resposta da API (nem aparecer na tela)."""

    def test_01_debug_otp_desligado_por_padrao(self):
        original = os.environ.pop("MATHAI_ENV", None)
        try:
            # Ausente → tratado como produção
            self.assertFalse(users_module._ambiente_debug_otp())

            os.environ["MATHAI_ENV"] = "production"
            self.assertFalse(users_module._ambiente_debug_otp())

            # Qualquer valor inesperado também é produção
            os.environ["MATHAI_ENV"] = "staging"
            self.assertFalse(users_module._ambiente_debug_otp())

            # Só o opt-in explícito liga o modo de teste
            os.environ["MATHAI_ENV"] = "development"
            self.assertTrue(users_module._ambiente_debug_otp())
        finally:
            os.environ.pop("MATHAI_ENV", None)
            if original is not None:
                os.environ["MATHAI_ENV"] = original

    def test_02_codigo_teste_vem_vazio_em_producao(self):
        original = os.environ.pop("MATHAI_ENV", None)
        try:
            self._criar_usuario(email="novo@mathai.com", verificado=0)
            codigo = gerar_codigo_verificacao("novo@mathai.com")

            res = verificar_codigo_otp("novo@mathai.com", codigo)
            self.assertTrue(res["ok"])

            # Em modo produção o login de conta não verificada não devolve código
            self._criar_usuario(email="pendente@mathai.com", senha="SenhaCorreta123!", verificado=0)
            res_login = fazer_login("pendente@mathai.com", "SenhaCorreta123!")
            self.assertFalse(res_login["ok"])
            self.assertTrue(res_login.get("pendente_verificacao"))
            self.assertEqual(res_login.get("codigo_teste", ""), "")
        finally:
            os.environ.pop("MATHAI_ENV", None)
            if original is not None:
                os.environ["MATHAI_ENV"] = original

    def test_03_otp_invalida_apos_erros_seguidos(self):
        """6 dígitos não podem ser brute-forçados: o código morre após N erros."""
        email = "otp@mathai.com"
        codigo = gerar_codigo_verificacao(email)
        self.assertEqual(len(codigo), 6)
        self.assertTrue(codigo.isdigit())

        errado = "000000" if codigo != "000000" else "999999"
        for _ in range(MAX_TENTATIVAS_OTP):
            self.assertFalse(verificar_codigo_otp(email, errado)["ok"])

        # Depois do limite o código correto também não vale mais
        self.assertFalse(verificar_codigo_otp(email, codigo)["ok"])

    def test_04_login_page_nao_exibe_mais_o_codigo(self):
        """Regressão: a caixa 'Modo de Teste / Dev' do login.py não pode voltar."""
        fonte = (BASE_DIR / "src" / "app" / "pages" / "login.py").read_text(encoding="utf-8")
        self.assertNotIn("otp-code-text", fonte)
        self.assertNotIn("Modo de Teste / Dev", fonte)

    def test_05_login_escapa_a_foto_do_google(self):
        """g_pic é o único valor interpolado direto em HTML: tem de ser escapado."""
        fonte = (BASE_DIR / "src" / "app" / "pages" / "login.py").read_text(encoding="utf-8")
        self.assertIn("pic_seguro = html.escape", fonte)
        self.assertIn("'<img src=\"' + pic_seguro", fonte)
        self.assertNotIn("'<img src=\"' + g_pic", fonte)


if __name__ == "__main__":
    unittest.main(verbosity=2)
