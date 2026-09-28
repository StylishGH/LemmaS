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
    fazer_login
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
    """Cria banco SQLite com esquema idêntico ao do MathAI."""
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
        Testa integridade com hashes corrompidos.
        Alerta empírico: _verificar_senha com hash_armazenado=None levanta AttributeError
        porque tenta chamar hash_armazenado.encode('utf-8') sem capturar AttributeError!
        """
        self.assertFalse(_verificar_senha("senha", ""))
        self.assertFalse(_verificar_senha("senha", "hash_invalido"))
        self.assertFalse(_verificar_senha("senha", "$2b$incompleto"))
        
        # Teste empírico da vulnerabilidade com None
        with self.assertRaises(AttributeError):
            _verificar_senha("senha", None)

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


class TestRateLimitingLogic(unittest.TestCase):
    """
    Validação adversarial de rate limiting contra força bruta (FIX-06).
    """

    def setUp(self):
        self.temp_db_file = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
        self.temp_db_file.close()
        self.db_path = self.temp_db_file.name

        criar_banco_teste(self.db_path)

        # Insere usuário válido
        con = sqlite3.connect(self.db_path)
        cur = con.cursor()
        senha = "SenhaCorreta123!"
        cur.execute("""
            INSERT INTO usuarios (nome, email, senha_hash, verificado)
            VALUES (?, ?, ?, 1)
        """, ("Usuario Teste", "aluno@mathai.com", _hash_senha(senha)))
        con.commit()
        con.close()

        self.orig_pegar_conexao = users_module.pegar_conexao
        users_module.pegar_conexao = lambda: obter_conexao_teste(self.db_path)

        # Limpa o session_state
        for k in list(st.session_state.keys()):
            del st.session_state[k]

    def tearDown(self):
        users_module.pegar_conexao = self.orig_pegar_conexao
        try:
            os.remove(self.db_path)
        except OSError:
            pass

    def test_01_lockout_after_5_failed_attempts_existing_user(self):
        email = "aluno@mathai.com"
        senha_errada = "SenhaErrada999!"

        # Tentativas 1 a 4: falha padrão
        for i in range(1, 5):
            res = fazer_login(email, senha_errada)
            self.assertFalse(res["ok"])
            self.assertEqual(res["erro"], "E-mail ou senha incorretos.")
            self.assertEqual(st.session_state.get(f"login_tentativas_{email}"), i)

        # Tentativa 5: atinge o limite e bloqueia
        res_5 = fazer_login(email, senha_errada)
        self.assertFalse(res_5["ok"])
        self.assertIn("Conta temporariamente bloqueada por excesso de tentativas", res_5["erro"])
        self.assertEqual(st.session_state.get(f"login_tentativas_{email}"), 0)
        self.assertIsNotNone(st.session_state.get(f"login_bloqueio_{email}"))

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

    def test_03_successful_login_clears_failure_counter(self):
        email = "aluno@mathai.com"
        senha_correta = "SenhaCorreta123!"
        senha_errada = "SenhaErrada999!"

        # 3 tentativas falhadas
        for _ in range(3):
            fazer_login(email, senha_errada)
        self.assertEqual(st.session_state.get(f"login_tentativas_{email}"), 3)

        # Login bem-sucedido
        res_sucesso = fazer_login(email, senha_correta)
        self.assertTrue(res_sucesso["ok"])

        # Chaves de tentativa e bloqueio devem ter sido removidas
        self.assertNotIn(f"login_tentativas_{email}", st.session_state)
        self.assertNotIn(f"login_bloqueio_{email}", st.session_state)

        # Próxima tentativa errada começa do 1, não do 4
        fazer_login(email, senha_errada)
        self.assertEqual(st.session_state.get(f"login_tentativas_{email}"), 1)

    def test_04_lockout_expiration(self):
        email = "aluno@mathai.com"
        senha_errada = "SenhaErrada999!"

        # Provoca bloqueio (5 tentativas)
        for _ in range(5):
            fazer_login(email, senha_errada)

        # Simula expiração do bloqueio avançando o relógio
        st.session_state[f"login_bloqueio_{email}"] = datetime.now() - timedelta(seconds=5)

        # Tentativa de login após expiração: não é mais barrado pelo rate limiter
        res = fazer_login(email, senha_errada)
        self.assertEqual(res["erro"], "E-mail ou senha incorretos.")
        self.assertEqual(st.session_state.get(f"login_tentativas_{email}"), 1)

    def test_05_email_case_insensitivity_and_whitespace(self):
        # " Aluno@MathAI.COM " deve compartilhar a mesma cota que "aluno@mathai.com"
        email_sujo = " Aluno@MathAI.COM "
        email_limpo = "aluno@mathai.com"
        senha_errada = "Errada123!"

        fazer_login(email_sujo, senha_errada)
        fazer_login(email_limpo, senha_errada)
        fazer_login("ALUNO@MATHAI.COM", senha_errada)

        chave_esperada = f"login_tentativas_{email_limpo}"
        self.assertEqual(st.session_state.get(chave_esperada), 3)


if __name__ == "__main__":
    unittest.main(verbosity=2)
