"""Configurações de ambiente da plataforma LEMMAS (Powered by MathAI Engine)."""

import os
from pathlib import Path
from typing import List, Optional
from dotenv import load_dotenv

# Carrega variáveis do .env do backend ou da raiz do repositório
_BACKEND_DIR = Path(__file__).resolve().parent.parent.parent
_ROOT_DIR = _BACKEND_DIR.parent

if (_BACKEND_DIR / ".env").exists():
    load_dotenv(_BACKEND_DIR / ".env")
elif (_ROOT_DIR / ".env").exists():
    load_dotenv(_ROOT_DIR / ".env")
else:
    load_dotenv()


class Settings:
    """Configurações globais e resolução de chaves e endpoints."""

    def __init__(self) -> None:
        # Informações da Plataforma
        self.PROJECT_NAME: str = "LEMMAS"
        self.ENGINE_NAME: str = "MathAI Engine"
        self.API_V1_PREFIX: str = "/api"
        self.ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
        self.DEBUG: bool = os.getenv("DEBUG", "false").lower() in ("true", "1", "t")

        # Segurança & Autenticação
        self.SECRET_KEY: str = os.getenv("SECRET_KEY", "")
        self.ALGORITHM: str = os.getenv("ALGORITHM", "HS256")
        self.ACCESS_TOKEN_EXPIRE_MINUTES: int = int(
            os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", str(60 * 8))
        )  # 8 horas (reduzido de 7 dias)

        # CORS
        raw_origins = os.getenv(
            "CORS_ORIGINS",
            "http://localhost:3000,http://127.0.0.1:3000,http://localhost:8000,http://127.0.0.1:8000",
        )
        self.CORS_ORIGINS: List[str] = [
            origin.strip() for origin in raw_origins.split(",") if origin.strip()
        ]

        # Supabase
        self.SUPABASE_URL: str = os.getenv("SUPABASE_URL", "").strip()
        self.SUPABASE_KEY: str = os.getenv("SUPABASE_KEY", "").strip()

        # Provedores Diretos de IA (Produção & Nuvem)
        self.GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "").strip()
        self.NVIDIA_API_KEY: str = os.getenv("NVIDIA_API_KEY", "").strip()
        self.DEEPSEEK_API_KEY: str = os.getenv("DEEPSEEK_API_KEY", "").strip()
        self.DEEPSEEK_API_URL: str = os.getenv(
            "DEEPSEEK_API_URL", "https://api.deepseek.com/v1"
        ).rstrip("/")

        # Infraestrutura Opcional de Roteamento (9Router local ou cluster)
        self.NINEROUTER_URL: str = os.getenv("NINEROUTER_URL", "").rstrip("/")
        self.NINEROUTER_API_KEY: str = os.getenv("NINEROUTER_API_KEY", "").strip()

    @property
    def has_supabase(self) -> bool:
        """Verifica se as credenciais do Supabase estão configuradas."""
        return bool(self.SUPABASE_URL and self.SUPABASE_KEY)

    @property
    def has_gemini(self) -> bool:
        """Verifica se a chave da API do Gemini está configurada."""
        return bool(self.GEMINI_API_KEY)

    @property
    def has_nvidia(self) -> bool:
        """Verifica se a chave direta da NVIDIA NIM está configurada."""
        return bool(self.NVIDIA_API_KEY)

    @property
    def has_deepseek(self) -> bool:
        """Verifica se a chave direta da DeepSeek API está configurada."""
        return bool(self.DEEPSEEK_API_KEY)

    @property
    def has_9router(self) -> bool:
        """Verifica se o endpoint do 9Router está explicitamente configurado."""
        return bool(self.NINEROUTER_URL)


settings = Settings()


def get_supabase_client():
    """
    Retorna o cliente autenticado do Supabase se configurado, ou None.
    Permite graceful degradation em ambientes locais sem Supabase.
    """
    if not settings.has_supabase:
        return None
    try:
        from supabase import create_client, Client

        client: Client = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
        return client
    except Exception:
        return None
