"""
Cliente e gerenciador de autenticação para a API do Google Gemini.
Carrega a chave central da plataforma a partir dos Secrets do Streamlit Cloud,
variáveis de ambiente do sistema operacional ou arquivo .env local.
"""

import os
from pathlib import Path
from google import genai


def obter_chave_api() -> str | None:
    """
    Localiza a chave de API central da plataforma na seguinte ordem:
    1. st.secrets do Streamlit Community Cloud (servidor de produção na nuvem)
    2. Variáveis de ambiente (os.environ['GEMINI_API_KEY'])
    3. Arquivo .env na raiz do projeto (ambiente de desenvolvimento local)
    4. Tabela configuracoes_sistema no banco de dados (fallback compartilhado)
    """
    # 1. Verifica no st.secrets (Streamlit Community Cloud)
    try:
        import streamlit as st
        if "GEMINI_API_KEY" in st.secrets:
            chave_sec = str(st.secrets["GEMINI_API_KEY"]).strip().strip('"').strip("'")
            if chave_sec:
                return chave_sec
    except Exception:
        pass

    # 2. Verifica nas variáveis de ambiente
    chave_env = os.environ.get("GEMINI_API_KEY", "").strip()
    if chave_env:
        return chave_env

    # 3. Verifica em arquivo .env na raiz do projeto
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).resolve().parent.parent.parent / ".env")
    chave_dotenv = os.environ.get("GEMINI_API_KEY", "").strip()
    if chave_dotenv:
        return chave_dotenv

    # 4. Fallback: Banco de Dados Turso (configurações globais centrais)
    try:
        from src.database.db import obter_configuracao_sistema
        chave_db = (obter_configuracao_sistema("GEMINI_API_KEY") or "").strip()
        if chave_db:
            return chave_db
    except Exception:
        pass

    return None


def tem_chave_configurada() -> bool:
    """Retorna True se uma chave válida da plataforma foi encontrada."""
    return obter_chave_api() is not None


def criar_cliente_gemini() -> genai.Client | None:
    """
    Cria e retorna a instância oficial do Client da SDK google-genai.
    Retorna None se nenhuma chave estiver configurada.
    """
    chave = obter_chave_api()
    if not chave:
        return None
    return genai.Client(api_key=chave)


def obter_chave_nvidia() -> str | None:
    """
    Localiza a chave de API da NVIDIA (NVIDIA NIM) na seguinte ordem:
    1. st.secrets do Streamlit Community Cloud (servidor de produção na nuvem)
    2. Variáveis de ambiente (os.environ['NVIDIA_API_KEY'])
    3. Arquivo .env na raiz do projeto (desenvolvimento local)
    4. Tabela configuracoes_sistema no banco de dados (fallback compartilhado)
    """
    try:
        import streamlit as st
        if "NVIDIA_API_KEY" in st.secrets:
            chave_sec = str(st.secrets["NVIDIA_API_KEY"]).strip().strip('"').strip("'")
            if chave_sec:
                return chave_sec
    except Exception:
        pass

    chave_env = os.environ.get("NVIDIA_API_KEY", "").strip()
    if chave_env:
        return chave_env

    from dotenv import load_dotenv
    load_dotenv(Path(__file__).resolve().parent.parent.parent / ".env")
    chave_dotenv = os.environ.get("NVIDIA_API_KEY", "").strip()
    if chave_dotenv:
        return chave_dotenv

    try:
        from src.database.db import obter_configuracao_sistema
        chave_db = (obter_configuracao_sistema("NVIDIA_API_KEY") or "").strip()
        if chave_db:
            return chave_db
    except Exception:
        pass

    return None


def tem_chave_nvidia_configurada() -> bool:
    """Retorna True se uma chave válida da NVIDIA foi encontrada."""
    return obter_chave_nvidia() is not None


def chamar_nvidia_chat(
    messages: list[dict],
    model: str = "nvidia/nemotron-3.5-lightning-30b-a3b",
    temperature: float = 0.2,
    max_tokens: int = 1024,
    timeout: float = 14.0,
    response_format: dict | None = None
) -> dict | None:
    """
    Realiza chamada REST de alta velocidade para o catálogo de inferência da NVIDIA.
    Retorna o payload JSON decodificado ou None em caso de timeout/erro.
    """
    import requests
    chave = obter_chave_nvidia()
    if not chave:
        return None

    url = "https://integrate.api.nvidia.com/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {chave}",
        "Content-Type": "application/json"
    }
    payload = {
        "model": model,
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens
    }
    if response_format:
        payload["response_format"] = response_format

    try:
        resp = requests.post(url, headers=headers, json=payload, timeout=timeout)
        if resp.status_code == 200:
            return resp.json()
        return None
    except Exception:
        return None

