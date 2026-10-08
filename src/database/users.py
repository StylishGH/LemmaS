"""
MathAI - Gerenciamento de Usuários (Auth & Faturamento)
Cadastro, login, perfil motivacional, dados de faturamento (CPF, CEP, Endereço)
e Verificação em Duas Etapas (2FA / OTP).
"""

import hashlib
import hmac
import json
import os
import re
import secrets
import bcrypt
from datetime import datetime, timedelta
import requests
from src.database.db import pegar_conexao

# ---- Constantes de segurança -------------------------------------------------
MAX_TENTATIVAS_LOGIN = 5          # falhas antes de bloquear
JANELA_BLOQUEIO_MINUTOS = 15      # tempo de bloqueio e janela de contagem
MAX_TENTATIVAS_OTP = 5            # erros de código antes de invalidar o OTP
BCRYPT_MAX_BYTES = 72             # limite nativo do bcrypt


def _ambiente_debug_otp() -> bool:
    """
    True SOMENTE quando o modo de desenvolvimento é ligado explicitamente
    (MATHAI_ENV=development|dev|local). Qualquer outro valor — inclusive a
    variável ausente — é tratado como produção, de modo que o código OTP
    nunca é devolvido ao cliente por padrão.
    """
    return os.environ.get("MATHAI_ENV", "").strip().lower() in ("development", "dev", "local")


def _hash_senha(senha: str) -> str:
    """Gera hash seguro com bcrypt (salt automático, resistente a brute force)."""
    return bcrypt.hashpw(senha.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def _verificar_senha(senha: str, hash_armazenado: str | None) -> bool:
    """
    Verifica a senha contra o hash armazenado.

    - Hashes bcrypt ($2a$/$2b$/$2y$): verificação normal.
    - Hashes legados SHA-256: comparação em tempo constante (hmac.compare_digest),
      e o login rehasha para bcrypt na primeira autenticação bem-sucedida.
    - Hash ausente ou corrompido: retorna False (nunca levanta exceção).
    """
    if not senha or not isinstance(hash_armazenado, str) or not hash_armazenado:
        return False

    if hash_armazenado.startswith(("$2a$", "$2b$", "$2y$")):
        try:
            return bcrypt.checkpw(senha.encode("utf-8"), hash_armazenado.encode("utf-8"))
        except (ValueError, TypeError):
            return False

    # Fallback legado SHA-256 — tempo constante para não vazar o hash por timing
    esperado = hashlib.sha256(senha.encode("utf-8")).hexdigest()
    return hmac.compare_digest(esperado, hash_armazenado)


def _hash_token_sessao(token: str) -> str:
    """Hash determinístico do token de sessão — o banco nunca guarda o token em claro."""
    return hashlib.sha256(str(token).strip().encode("utf-8")).hexdigest()


def _garantir_tabelas_e_migracao():
    """Garante que as tabelas e colunas novas existam no SQLite."""
    con = pegar_conexao()
    cur = con.cursor()

    # 1. Tabela usuarios base
    cur.execute("""
        CREATE TABLE IF NOT EXISTS usuarios (
            id INTEGER PRIMARY KEY SERIAL,
            nome TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            senha_hash TEXT NOT NULL,
            idade INTEGER,
            celular TEXT,
            motivos TEXT,
            criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # Migrações automáticas de colunas para bancos existentes
    novas_colunas = [
        ("cpf", "TEXT"),
        ("cep", "TEXT"),
        ("logradouro", "TEXT"),
        ("numero", "TEXT"),
        ("bairro", "TEXT"),
        ("cidade", "TEXT"),
        ("estado", "TEXT"),
        ("verificado", "INTEGER NOT NULL DEFAULT 0"),
        ("escolaridade", "TEXT"),
        ("faculdade", "TEXT"),
        ("curso", "TEXT"),
        ("concursos_foco", "TEXT")
    ]
    for col, tipo in novas_colunas:
        try:
            cur.execute(f"ALTER TABLE usuarios ADD COLUMN {col} {tipo}")
            con.commit()
        except Exception:
            pass  # Coluna já existe

    # 2. Tabela de códigos 2FA / OTP
    cur.execute("""
        CREATE TABLE IF NOT EXISTS codigos_verificacao (
            id INTEGER PRIMARY KEY SERIAL,
            email TEXT NOT NULL,
            codigo TEXT NOT NULL,
            expira_em TIMESTAMP NOT NULL,
            usado INTEGER NOT NULL DEFAULT 0,
            criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    cur.execute("CREATE INDEX IF NOT EXISTS idx_codigos_email_codigo ON codigos_verificacao (email, codigo)")

    # Migração: contador de erros do OTP (anti brute-force do código de 6 dígitos)
    try:
        cur.execute("ALTER TABLE codigos_verificacao ADD COLUMN tentativas INTEGER NOT NULL DEFAULT 0")
    except Exception:
        pass  # Coluna já existe

    # 3. Controle server-side de tentativas de login (rate limit por e-mail e IP)
    cur.execute("""
        CREATE TABLE IF NOT EXISTS tentativas_login (
            id INTEGER PRIMARY KEY SERIAL,
            email TEXT NOT NULL,
            ip TEXT,
            sucesso INTEGER NOT NULL DEFAULT 0,
            criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    cur.execute("CREATE INDEX IF NOT EXISTS idx_tentativas_login ON tentativas_login (email, criado_em)")

    # 4. States single-use do OAuth Google (proteção contra login CSRF)
    # Tenta criar a tabela com o schema novo. Se falhar, dropamos e recriamos (dados efêmeros).
    try:
        cur.execute("SELECT state_hash, sessao_id FROM oauth_states LIMIT 1")
    except Exception:
        try:
            cur.execute("DROP TABLE IF EXISTS oauth_states")
            con.commit()
        except Exception:
            pass

    cur.execute("""
        CREATE TABLE IF NOT EXISTS oauth_states (
            state_hash TEXT PRIMARY KEY,
            sessao_id TEXT NOT NULL,
            criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # 5. Tabela de sessões autenticadas seguras (por token de cliente no navegador)
    cur.execute("""
        CREATE TABLE IF NOT EXISTS sessoes_lembradas (
            token TEXT PRIMARY KEY,
            usuario_id INTEGER NOT NULL,
            expira_em TIMESTAMP NOT NULL,
            criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (usuario_id) REFERENCES usuarios (id) ON DELETE CASCADE
        )
    """)
    cur.execute("CREATE INDEX IF NOT EXISTS idx_sessoes_token ON sessoes_lembradas (token)")
    con.commit()
    con.close()


# Flag para inicialização lazy (evita deadlock em Python 3.14 + Streamlit hot-reload)
_tabelas_prontas = False


def _garantir_tabelas_lazy():
    """Executa a migração apenas uma vez, na primeira chamada que precisar do banco."""
    global _tabelas_prontas
    if _tabelas_prontas:
        return
    _garantir_tabelas_e_migracao()
    _tabelas_prontas = True


def formatar_cpf(cpf: str) -> str:
    """Extrai apenas dígitos e formata no padrão 000.000.000-00."""
    digitos = re.sub(r"\D", "", cpf or "")
    if len(digitos) == 11:
        return f"{digitos[:3]}.{digitos[3:6]}.{digitos[6:9]}-{digitos[9:]}"
    return cpf.strip() if cpf else ""


def validar_cpf(cpf: str) -> bool:
    """Valida dígitos do CPF (formato e dígitos verificadores básicos)."""
    digitos = re.sub(r"\D", "", cpf or "")
    if len(digitos) != 11:
        return False
    if digitos == digitos[0] * 11:
        return False

    # Primeiro dígito verificador
    soma = sum(int(digitos[i]) * (10 - i) for i in range(9))
    resto = (soma * 10) % 11
    d1 = 0 if resto == 10 else resto
    if d1 != int(digitos[9]):
        return False

    # Segundo dígito verificador
    soma = sum(int(digitos[i]) * (11 - i) for i in range(10))
    resto = (soma * 10) % 11
    d2 = 0 if resto == 10 else resto
    return d2 == int(digitos[10])


def buscar_endereco_por_cep(cep: str) -> dict | None:
    """
    Consulta o webservice público ViaCEP (com fallback para BrasilAPI) para autopreencher endereço.
    Retorna dict com logradouro, bairro, cidade, estado ou None.
    """
    cep_limpo = re.sub(r"\D", "", cep or "")
    if len(cep_limpo) != 8:
        return None

    headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) MathAI/1.0"}

    # 1. Tentativa principal: ViaCEP
    try:
        resp = requests.get(f"https://viacep.com.br/ws/{cep_limpo}/json/", headers=headers, timeout=4.0)
        if resp.status_code == 200:
            dados = resp.json()
            if not dados.get("erro"):
                return {
                    "logradouro": dados.get("logradouro", "") or "",
                    "bairro": dados.get("bairro", "") or "",
                    "cidade": dados.get("localidade", "") or "",
                    "estado": dados.get("uf", "") or ""
                }
    except Exception:
        pass

    # 2. Fallback resiliente: BrasilAPI
    try:
        resp2 = requests.get(f"https://brasilapi.com.br/api/cep/v1/{cep_limpo}", headers=headers, timeout=4.0)
        if resp2.status_code == 200:
            dados2 = resp2.json()
            return {
                "logradouro": dados2.get("street", "") or "",
                "bairro": dados2.get("neighborhood", "") or "",
                "cidade": dados2.get("city", "") or "",
                "estado": dados2.get("state", "") or ""
            }
    except Exception:
        pass

    return None


def gerar_codigo_verificacao(email: str) -> str:
    """
    Gera um código de 6 dígitos numéricos com validade de 15 minutos.
    Invalida códigos anteriores não usados deste e-mail.
    """
    _garantir_tabelas_lazy()
    # Código com gerador criptograficamente seguro (secrets, não random)
    codigo = f"{secrets.randbelow(900000) + 100000}"
    expira_em = (datetime.now() + timedelta(minutes=15)).strftime("%Y-%m-%d %H:%M:%S")

    con = pegar_conexao()
    cur = con.cursor()
    # Invalida códigos antigos
    cur.execute("UPDATE codigos_verificacao SET usado = 1 WHERE email = ? AND usado = 0", (email.lower(),))
    # Insere novo código
    cur.execute(
        "INSERT INTO codigos_verificacao (email, codigo, expira_em) VALUES (?, ?, ?)",
        (email.lower(), codigo, expira_em)
    )
    con.commit()
    con.close()
    return codigo


def enviar_email_codigo(email: str, codigo: str, nome: str = "Aluno") -> bool:
    """
    Envia o código de 6 dígitos para o e-mail cadastrado via SMTP.
    Se SMTP não estiver configurado no ambiente ou st.secrets, retorna False (o app exibirá em modo teste).
    """
    smtp_host = os.environ.get("SMTP_HOST")
    smtp_port = os.environ.get("SMTP_PORT", "587")
    smtp_user = os.environ.get("SMTP_USER")
    smtp_pass = os.environ.get("SMTP_PASS")

    if not (smtp_host and smtp_user and smtp_pass):
        try:
            import streamlit as st
            smtp_host = st.secrets.get("SMTP_HOST") or smtp_host
            smtp_port = str(st.secrets.get("SMTP_PORT", "587")) or smtp_port
            smtp_user = st.secrets.get("SMTP_USER") or smtp_user
            smtp_pass = st.secrets.get("SMTP_PASS") or smtp_pass
        except Exception:
            pass

    if not (smtp_host and smtp_user and smtp_pass):
        # Sem SMTP configurado — modo dev/simulação
        return False

    try:
        import smtplib
        from email.mime.text import MIMEText
        from email.mime.multipart import MIMEMultipart

        msg = MIMEMultipart("alternative")
        msg["Subject"] = f"🔑 Seu código de verificação MathAI: {codigo}"
        msg["From"] = f"MathAI <{smtp_user}>"
        msg["To"] = email

        html_body = f"""
        <html>
        <body style="font-family: Arial, sans-serif; background: #0a0a0f; color: #f8fafc; padding: 24px;">
            <div style="max-width: 480px; margin: 0 auto; background: #13111c; border: 1px solid #7c3aed; border-radius: 16px; padding: 32px; text-align: center;">
                <h1 style="color: #7c3aed; margin-bottom: 8px;">📐 MathAI</h1>
                <p style="color: #94a3b8; font-size: 14px;">Plataforma Cognitiva de Matemática</p>
                <h2 style="color: #f8fafc; margin-top: 24px;">Olá, {nome.split()[0]}!</h2>
                <p style="color: #cbd5e1; font-size: 15px;">Use o código de segurança abaixo para ativar sua conta:</p>
                <div style="background: rgba(124, 58, 237, 0.15); border: 2px dashed #f59e0b; border-radius: 12px; padding: 18px; margin: 24px 0;">
                    <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #fbbf24;">{codigo}</span>
                </div>
                <p style="color: #64748b; font-size: 12px;">Este código é válido por 15 minutos. Se não foi você quem solicitou, desconsidere este e-mail.</p>
            </div>
        </body>
        </html>
        """
        msg.attach(MIMEText(html_body, "html"))

        with smtplib.SMTP(smtp_host, int(smtp_port), timeout=5) as server:
            server.starttls()
            server.login(smtp_user, smtp_pass)
            server.sendmail(smtp_user, email, msg.as_string())
        return True
    except Exception as e:
        # Log no servidor (sem expor o código) — antes a falha era silenciosa,
        # o que mascarava um SMTP mal configurado.
        print(f"[MathAI] Falha ao enviar e-mail de verificacao para {email}: {type(e).__name__}: {e}")
        return False


def verificar_codigo_otp(email: str, codigo: str) -> dict:
    """
    Verifica o código de 6 dígitos.
    Se válido: marca como usado, ativa o usuário (verificado=1) e retorna os dados do usuário.
    """
    _garantir_tabelas_lazy()
    email = (email or "").lower().strip()
    codigo = (codigo or "").strip()
    con = pegar_conexao()
    cur = con.cursor()
    agora = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    cur.execute("""
        SELECT id FROM codigos_verificacao
        WHERE email = ? AND codigo = ? AND usado = 0 AND expira_em >= ?
        ORDER BY id DESC LIMIT 1
    """, (email, codigo, agora))
    registro = cur.fetchone()

    if not registro:
        # Anti brute-force: cada erro consome uma tentativa do código ativo e,
        # ao atingir o limite, o código é invalidado (precisa pedir outro).
        # Fail-closed: se a contagem falhar, invalida o código imediatamente.
        try:
            cur.execute("""
                SELECT id, tentativas FROM codigos_verificacao
                WHERE email = ? AND usado = 0 AND expira_em >= ?
                ORDER BY id DESC LIMIT 1
            """, (email, agora))
            ativo = cur.fetchone()
            if ativo:
                tentativas = int(ativo["tentativas"] or 0) + 1
                if tentativas >= MAX_TENTATIVAS_OTP:
                    cur.execute("UPDATE codigos_verificacao SET tentativas = ?, usado = 1 WHERE id = ?",
                                (tentativas, ativo["id"]))
                else:
                    cur.execute("UPDATE codigos_verificacao SET tentativas = ? WHERE id = ?",
                                (tentativas, ativo["id"]))
                con.commit()
        except Exception as e:
            # Fail-closed: infraestrutura indisponível → invalida o código
            print(f"[MathAI] ERRO na contagem de OTP (fail-closed): {type(e).__name__}: {e}")
            try:
                cur.execute("UPDATE codigos_verificacao SET usado = 1 WHERE email = ? AND usado = 0 AND expira_em >= ?", (email, agora))
                con.commit()
            except Exception:
                pass
        con.close()
        return {
            "ok": False,
            "erro": "Código inválido ou expirado. Verifique os 6 dígitos ou clique em reenviar."
        }

    # Marca código como usado
    cur.execute("UPDATE codigos_verificacao SET usado = 1 WHERE id = ?", (registro["id"],))

    # Ativa usuário
    cur.execute("UPDATE usuarios SET verificado = 1 WHERE email = ?", (email,))
    con.commit()

    # Busca usuário ativado
    cur.execute("""
        SELECT id, nome, email, cpf, idade, celular, cep, logradouro, numero, bairro, cidade, estado,
               escolaridade, faculdade, curso, motivos, concursos_foco, verificado
        FROM usuarios WHERE email = ?
    """, (email,))
    row = cur.fetchone()
    con.close()

    if row:
        u = dict(row)
        u["motivos"] = json.loads(u.get("motivos") or "[]")
        u["concursos_foco"] = json.loads(u.get("concursos_foco") or "[]")
        return {"ok": True, "usuario": u}

    return {"ok": False, "erro": "Usuário não encontrado."}


def reenviar_codigo_otp(email: str, nome: str = "Aluno") -> dict:
    """Gera um novo código e tenta enviar por e-mail.

    Rate limit no reenvio: máximo 3 reenvios por e-mail em 15 minutos
    (tabela `reenvios_codigo`).
    """
    _garantir_tabelas_lazy()
    email = (email or "").lower().strip()

    # Cria tabela de controle de reenvio se não existir
    con = pegar_conexao()
    try:
        cur = con.cursor()
        cur.execute("""
            CREATE TABLE IF NOT EXISTS reenvios_codigo (
                id INTEGER PRIMARY KEY SERIAL,
                email TEXT NOT NULL,
                criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        cur.execute("CREATE INDEX IF NOT EXISTS idx_reenvios_email ON reenvios_codigo (email, criado_em)")
        con.commit()

        # Conta reenvios recentes
        limite = (datetime.now() - timedelta(minutes=JANELA_BLOQUEIO_MINUTOS)).strftime("%Y-%m-%d %H:%M:%S")
        cur.execute("SELECT COUNT(*) AS total FROM reenvios_codigo WHERE email = ? AND criado_em >= ?", (email, limite))
        row = cur.fetchone()
        total = int((row["total"] if row else 0) or 0)
        if total >= 3:
            con.close()
            return {
                "ok": False,
                "enviado_email": False,
                "erro": "Muitos reenvios recentes. Aguarde alguns minutos antes de tentar novamente."
            }

        # Registra o reenvio
        cur.execute("INSERT INTO reenvios_codigo (email) VALUES (?)", (email,))
        con.commit()
    except Exception as e:
        print(f"[MathAI] ERRO no rate limit de reenvio OTP: {type(e).__name__}: {e}")
        # Fail-closed no rate limit de reenvio
        con.close()
        return {
            "ok": False,
            "enviado_email": False,
            "erro": "Não foi possível processar o reenvio agora. Tente novamente em instantes."
        }
    finally:
        if con:
            con.close()

    codigo = gerar_codigo_verificacao(email)
    enviado = enviar_email_codigo(email, codigo, nome)
    debug_otp = _ambiente_debug_otp()
    return {
        "ok": True,
        "enviado_email": enviado,
        "codigo_teste": codigo if debug_otp else ""
    }


def cadastrar_usuario(
    nome: str,
    email: str,
    senha: str,
    cpf: str | None = None,
    idade: int | None = None,
    celular: str | None = None,
    cep: str | None = None,
    logradouro: str | None = None,
    numero: str | None = None,
    bairro: str | None = None,
    cidade: str | None = None,
    estado: str | None = None,
    motivos: list[str] | None = None,
    escolaridade: str | None = None,
    faculdade: str | None = None,
    curso: str | None = None,
    concursos_foco: list[str] | None = None,
    verificado: int = 0
) -> dict:
    """
    Cria um novo usuário. Se verificado=0 (padrão), status pendente de verificação (OTP).
    Se verificado=1 (ex: Google OAuth), usuário já nasce ativado.
    """
    _garantir_tabelas_lazy()
    con = pegar_conexao()
    cur = con.cursor()
    cpf_formatado = formatar_cpf(cpf) if cpf else None

    try:
        cur.execute("""
            INSERT INTO usuarios (
                nome, email, senha_hash, cpf, idade, celular, cep,
                logradouro, numero, bairro, cidade, estado, motivos,
                escolaridade, faculdade, curso, concursos_foco, verificado
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            nome.strip(),
            email.strip().lower(),
            _hash_senha(senha),
            cpf_formatado,
            idade,
            celular.strip() if celular else None,
            cep.strip() if cep else None,
            logradouro.strip() if logradouro else None,
            numero.strip() if numero else None,
            bairro.strip() if bairro else None,
            cidade.strip() if cidade else None,
            estado.strip().upper() if estado else None,
            json.dumps(motivos or [], ensure_ascii=False),
            escolaridade.strip() if escolaridade else None,
            faculdade.strip() if faculdade else None,
            curso.strip() if curso else None,
            json.dumps(concursos_foco or [], ensure_ascii=False),
            verificado
        ))
        con.commit()
        usuario_id = cur.lastrowid
        con.close()

        # Usuários do Google já nascem verificados
        if verificado == 1:
            return {
                "ok": True,
                "pendente_verificacao": False,
                "email": email.strip().lower(),
                "usuario": {
                    "id": usuario_id,
                    "nome": nome.strip(),
                    "email": email.strip().lower(),
                    "cpf": cpf_formatado,
                    "idade": idade,
                    "celular": celular,
                    "cep": cep,
                    "escolaridade": escolaridade,
                    "faculdade": faculdade,
                    "curso": curso,
                    "concursos_foco": concursos_foco or [],
                    "motivos": motivos or [],
                    "verificado": 1
                }
            }

        # Gera código OTP de verificação
        codigo_otp = gerar_codigo_verificacao(email)
        enviado_email = enviar_email_codigo(email, codigo_otp, nome)
        debug_otp = _ambiente_debug_otp()

        return {
            "ok": True,
            "pendente_verificacao": True,
            "email": email.strip().lower(),
            "enviado_email": enviado_email,
            "codigo_teste": codigo_otp if debug_otp else "",
            "usuario": {
                "id": usuario_id,
                "nome": nome.strip(),
                "email": email.strip().lower(),
                "cpf": cpf_formatado,
                "idade": idade,
                "celular": celular,
                "cep": cep,
                "escolaridade": escolaridade,
                "faculdade": faculdade,
                "curso": curso,
                "concursos_foco": concursos_foco or [],
                "motivos": motivos or [],
                "verificado": 0
            }
        }
    except Exception as e:
        con.close()
        if "UNIQUE" in str(e):
            return {"ok": False, "erro": "Este e-mail já está cadastrado. Faça login ou recupere sua conta."}
        print(f"[MathAI] Erro ao cadastrar usuario: {type(e).__name__}: {e}")
        return {"ok": False, "erro": "Não foi possível concluir o cadastro agora. Tente novamente em instantes."}


def obter_ou_gerar_codigo_verificacao(email: str) -> str:
    """Retorna o código OTP ativo existente ou gera um novo caso não haja."""
    con = pegar_conexao()
    cur = con.cursor()
    agora = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    cur.execute("""
        SELECT codigo FROM codigos_verificacao
        WHERE email = ? AND usado = 0 AND expira_em >= ?
        ORDER BY id DESC LIMIT 1
    """, (email.lower().strip(), agora))
    row = cur.fetchone()
    con.close()
    if row:
        return row["codigo"]
    return gerar_codigo_verificacao(email)


def _segundos_de_bloqueio(cur, email: str, ip: str | None) -> int:
    """
    Segundos restantes de bloqueio por excesso de falhas (0 = liberado).

    Conta falhas por e-mail OU por IP dentro da janela. Como o estado vive no
    banco, o bloqueio sobrevive a recarregar a página, apagar cookies e abrir
    aba anônima — que era exatamente a brecha do contador em st.session_state.
    """
    try:
        limite = (datetime.now() - timedelta(minutes=JANELA_BLOQUEIO_MINUTOS)).strftime("%Y-%m-%d %H:%M:%S")
        cur.execute("""
            SELECT COUNT(*) AS total, MIN(criado_em) AS primeira
            FROM tentativas_login
            WHERE (email = ? OR (? IS NOT NULL AND ip = ?))
              AND sucesso = 0 AND criado_em >= ?
        """, (email, ip, ip, limite))
        row = cur.fetchone()
        total = int((row["total"] if row else 0) or 0)
        if total < MAX_TENTATIVAS_LOGIN:
            return 0
        primeira = datetime.strptime(str(row["primeira"])[:19], "%Y-%m-%d %H:%M:%S")
        restante = int((primeira + timedelta(minutes=JANELA_BLOQUEIO_MINUTOS) - datetime.now()).total_seconds())
        return max(restante, 1)
    except Exception:
        # Falha no controle de tentativas nunca deve derrubar o login
        return 0


def _registrar_tentativa_login(cur, email: str, ip: str | None, sucesso: bool) -> None:
    """Registra a tentativa no banco. Um login válido limpa o histórico de falhas."""
    try:
        if sucesso:
            cur.execute("DELETE FROM tentativas_login WHERE email = ?", (email,))
        # criado_em explícito: o DEFAULT CURRENT_TIMESTAMP do SQLite é UTC, e as
        # comparações de janela usam datetime.now() local — misturar os dois
        # faria o bloqueio durar horas a mais (ex.: host em UTC-3).
        cur.execute(
            "INSERT INTO tentativas_login (email, ip, sucesso, criado_em) VALUES (?, ?, ?, ?)",
            (email, ip, 1 if sucesso else 0, datetime.now().strftime("%Y-%m-%d %H:%M:%S")),
        )
    except Exception as e:
        print(f"[MathAI] Aviso: nao foi possivel registrar tentativa de login: {type(e).__name__}: {e}")


def fazer_login(email: str, senha: str, ip: str | None = None) -> dict:
    """
    Autentica o usuário com rate limit SERVER-SIDE.

    O contador de falhas fica na tabela `tentativas_login` (por e-mail e por IP),
    não mais no st.session_state. Se o usuário existir mas não estiver verificado
    (verificado=0), retorna pendente_verificacao=True para exibir a tela do código.
    """
    _garantir_tabelas_lazy()
    email = (email or "").strip().lower()
    ip = (ip or "").strip() or None

    def _bloqueado() -> dict | None:
        seg = _segundos_de_bloqueio(cur, email, ip)
        if seg <= 0:
            return None
        return {"ok": False, "erro": f"Muitas tentativas. Tente novamente em {seg} segundos."}

    con = pegar_conexao()
    cur = con.cursor()
    try:
        bloqueio = _bloqueado()
        if bloqueio:
            return bloqueio

        cur.execute("""
            SELECT id, nome, email, cpf, idade, celular, cep, logradouro, numero, bairro, cidade, estado,
                   escolaridade, faculdade, curso, motivos, concursos_foco, verificado, senha_hash
            FROM usuarios WHERE email = ?
        """, (email,))
        row = cur.fetchone()

        if not row:
            # Conta inexistente também conta para o rate limit (evita enumeração)
            _registrar_tentativa_login(cur, email, ip, False)
            con.commit()
            bloqueio = _bloqueado()
            if bloqueio:
                return {"ok": False, "erro": f"Conta temporariamente bloqueada por excesso de tentativas. Aguarde {JANELA_BLOQUEIO_MINUTOS} minutos."}
            return {"ok": False, "erro": "E-mail ou senha incorretos."}

        u = dict(row)
        senha_hash_db = u.pop("senha_hash")

        if not _verificar_senha(senha, senha_hash_db):
            _registrar_tentativa_login(cur, email, ip, False)
            con.commit()
            bloqueio = _bloqueado()
            if bloqueio:
                return {"ok": False, "erro": f"Conta temporariamente bloqueada por excesso de tentativas. Aguarde {JANELA_BLOQUEIO_MINUTOS} minutos."}
            return {"ok": False, "erro": "E-mail ou senha incorretos."}

        # Migração automática: rehash SHA-256 antigo → bcrypt
        if not senha_hash_db.startswith("$2b$"):
            novo_hash = _hash_senha(senha)
            cur.execute("UPDATE usuarios SET senha_hash = ? WHERE id = ?", (novo_hash, u["id"]))

        # Senha correta: zera o histórico de falhas deste e-mail
        _registrar_tentativa_login(cur, email, ip, True)
        con.commit()

        u["motivos"] = json.loads(u.get("motivos") or "[]")
        u["concursos_foco"] = json.loads(u.get("concursos_foco") or "[]")

        # Verifica se conta foi verificada (2FA / ativação)
        if u.get("verificado") == 0:
            debug_otp = _ambiente_debug_otp()
            codigo_ativo = obter_ou_gerar_codigo_verificacao(u["email"])
            enviado_email = enviar_email_codigo(u["email"], codigo_ativo, u["nome"])
            return {
                "ok": False,
                "pendente_verificacao": True,
                "email": u["email"],
                "nome": u["nome"],
                "codigo_teste": codigo_ativo if debug_otp else "",
                "enviado_email": enviado_email,
                "erro": "Sua conta ainda não foi verificada. Digite o código de 6 dígitos para ativar."
            }

        return {"ok": True, "usuario": u}
    except Exception as e:
        # Detalhe só no log do servidor — nunca na tela do usuário
        print(f"[MathAI] Erro ao autenticar: {type(e).__name__}: {e}")
        return {"ok": False, "erro": "Não foi possível concluir o login agora. Tente novamente em instantes."}
    finally:
        con.close()


def buscar_usuario_por_email(email: str) -> dict | None:
    """Busca um usuário verificado pelo e-mail."""
    _garantir_tabelas_lazy()
    con = pegar_conexao()
    cur = con.cursor()
    try:
        cur.execute("""
            SELECT id, nome, email, cpf, idade, celular, cep, logradouro, numero, bairro, cidade, estado,
                   escolaridade, faculdade, curso, motivos, concursos_foco, verificado
            FROM usuarios WHERE email = ? AND verificado = 1
        """, (email.strip().lower(),))
        row = cur.fetchone()
        if row:
            u = dict(row)
            u["motivos"] = json.loads(u.get("motivos") or "[]")
            u["concursos_foco"] = json.loads(u.get("concursos_foco") or "[]")
            return u
        return None
    except Exception:
        return None
    finally:
        con.close()


def buscar_usuario_por_id(usuario_id: int) -> dict | None:
    """Busca dados completos do usuário pelo ID."""
    _garantir_tabelas_lazy()
    con = pegar_conexao()
    cur = con.cursor()
    try:
        cur.execute("""
            SELECT id, nome, email, cpf, idade, celular, cep, logradouro, numero, bairro, cidade, estado,
                   escolaridade, faculdade, curso, motivos, concursos_foco, verificado
            FROM usuarios WHERE id = ?
        """, (usuario_id,))
        row = cur.fetchone()
        if row:
            u = dict(row)
            u["motivos"] = json.loads(u.get("motivos") or "[]")
            u["concursos_foco"] = json.loads(u.get("concursos_foco") or "[]")
            return u
        return None
    except Exception:
        return None
    finally:
        con.close()


def atualizar_perfil_usuario(
    usuario_id: int,
    nome: str,
    celular: str | None = None,
    cpf: str | None = None,
    cep: str | None = None,
    logradouro: str | None = None,
    numero: str | None = None,
    bairro: str | None = None,
    cidade: str | None = None,
    estado: str | None = None,
    escolaridade: str | None = None,
    faculdade: str | None = None,
    curso: str | None = None,
    motivos: list[str] | None = None,
    concursos_foco: list[str] | None = None
) -> dict:
    """Atualiza os dados de perfil e acadêmicos do usuário."""
    con = pegar_conexao()
    cur = con.cursor()
    cpf_formatado = formatar_cpf(cpf) if cpf else None
    try:
        cur.execute("""
            UPDATE usuarios SET
                nome = ?,
                celular = ?,
                cpf = ?,
                cep = ?,
                logradouro = ?,
                numero = ?,
                bairro = ?,
                cidade = ?,
                estado = ?,
                escolaridade = ?,
                faculdade = ?,
                curso = ?,
                motivos = ?,
                concursos_foco = ?
            WHERE id = ?
        """, (
            nome.strip(),
            celular.strip() if celular else None,
            cpf_formatado,
            cep.strip() if cep else None,
            logradouro.strip() if logradouro else None,
            numero.strip() if numero else None,
            bairro.strip() if bairro else None,
            cidade.strip() if cidade else None,
            estado.strip().upper() if estado else None,
            escolaridade.strip() if escolaridade else None,
            faculdade.strip() if faculdade else None,
            curso.strip() if curso else None,
            json.dumps(motivos or [], ensure_ascii=False),
            json.dumps(concursos_foco or [], ensure_ascii=False),
            usuario_id
        ))
        con.commit()
        return {"ok": True}
    except Exception as e:
        print(f"[MathAI] Erro ao atualizar perfil: {type(e).__name__}: {e}")
        return {"ok": False, "erro": "Não foi possível salvar suas alterações agora. Tente novamente em instantes."}
    finally:
        con.close()


def criar_sessao_lembrada(usuario_id: int) -> str:
    """Gera um token criptográfico seguro de sessão e salva no SQLite (validade de 30 dias)."""
    _garantir_tabelas_lazy()
    con = pegar_conexao()
    try:
        cur = con.cursor()
        token = secrets.token_urlsafe(32)
        expira_em = datetime.now() + timedelta(days=30)
        # O banco guarda apenas o HASH do token: um vazamento da base não permite
        # reutilizar as sessões dos alunos. O token em claro só existe no cliente.
        cur.execute("""
            INSERT INTO sessoes_lembradas (token, usuario_id, expira_em)
            VALUES (?, ?, ?)
        """, (_hash_token_sessao(token), usuario_id, expira_em))
        con.commit()
        return token
    finally:
        con.close()


def verificar_token_sessao(token: str) -> dict | None:
    """Valida um token de sessão do cliente e retorna os dados do usuário."""
    if not token or not isinstance(token, str):
        return None
    _garantir_tabelas_lazy()
    con = pegar_conexao()
    try:
        cur = con.cursor()
        # Remove tokens expirados
        cur.execute("DELETE FROM sessoes_lembradas WHERE expira_em < ?", (datetime.now(),))
        con.commit()

        cur.execute("""
            SELECT u.id, u.nome, u.email, u.cpf, u.idade, u.celular, u.cep, u.logradouro,
                   u.numero, u.bairro, u.cidade, u.estado, u.escolaridade, u.faculdade,
                   u.curso, u.motivos, u.concursos_foco, u.verificado
            FROM sessoes_lembradas s
            JOIN usuarios u ON u.id = s.usuario_id
            WHERE s.token = ? AND u.verificado = 1
        """, (_hash_token_sessao(token),))
        row = cur.fetchone()
        if row:
            u = dict(row)
            u["motivos"] = json.loads(u.get("motivos") or "[]")
            u["concursos_foco"] = json.loads(u.get("concursos_foco") or "[]")
            return u
        return None
    except Exception:
        return None
    finally:
        con.close()



def encerrar_sessao_por_token(token: str):
    """Invalida o token de sessão específico do cliente ao fazer logout."""
    if not token or not isinstance(token, str):
        return
    con = pegar_conexao()
    try:
        cur = con.cursor()
        cur.execute("DELETE FROM sessoes_lembradas WHERE token = ?", (_hash_token_sessao(token),))
        con.commit()
    except Exception:
        pass
    finally:
        con.close()


def criar_oauth_state(sessao_id: str) -> str:
    """
    Gera e persiste um `state` single-use para o fluxo OAuth do Google,
    vinculado à sessão atual do navegador.

    Protege contra login CSRF (forçar a vítima a autenticar com a conta do atacante).
    O `state` fica amarrado a `sessao_id` (hash do cookie/token da sessão do app),
    de modo que apenas a MESMA sessão que iniciou o fluxo pode completá-lo.
    """
    _garantir_tabelas_lazy()
    state = secrets.token_urlsafe(24)
    state_hash = hashlib.sha256(state.encode("utf-8")).hexdigest()
    con = pegar_conexao()
    try:
        cur = con.cursor()
        # Limpeza de states antigos não usados (30 min)
        validade = (datetime.now() - timedelta(minutes=30)).strftime("%Y-%m-%d %H:%M:%S")
        cur.execute("DELETE FROM oauth_states WHERE criado_em < ?", (validade,))
        cur.execute(
            "INSERT INTO oauth_states (state_hash, sessao_id) VALUES (?, ?)",
            (state_hash, sessao_id),
        )
        con.commit()
        return state
    finally:
        con.close()


def consumir_oauth_state(state: str | None, sessao_id: str) -> bool:
    """Valida e invalida (single-use) um state OAuth vinculado à sessão. False = fluxo rejeitado."""
    if not state or not isinstance(state, str):
        return False
    state_hash = hashlib.sha256(state.strip().encode("utf-8")).hexdigest()
    _garantir_tabelas_lazy()
    con = pegar_conexao()
    try:
        cur = con.cursor()
        cur.execute("SELECT state_hash FROM oauth_states WHERE state_hash = ?", (state_hash,))
        if not cur.fetchone():
            return False
        cur.execute("DELETE FROM oauth_states WHERE state_hash = ?", (state_hash,))
        con.commit()
        return True
    except Exception as e:
        print(f"[MathAI] Erro ao validar oauth state: {type(e).__name__}: {e}")
        return False
    finally:
        con.close()


# Funções legadas mantidas vazias para evitar vazamento entre usuários
def salvar_sessao_lembrada(usuario: dict):
    pass


def verificar_sessao_lembrada() -> dict | None:
    return None


def encerrar_sessao_lembrada():
    pass

