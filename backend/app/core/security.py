"""Utilitários de segurança, hash criptográfico e geração/verificação de tokens."""

import base64
import hashlib
import hmac
import json
import secrets
import time
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, Optional, Union

from app.core.config import settings

try:
    import jwt
except ImportError:
    jwt = None


def compute_sha256(data: Union[str, bytes]) -> str:
    """Calcula o hash SHA-256 determinístico de uma string ou sequência de bytes."""
    if isinstance(data, str):
        data = data.encode("utf-8")
    return hashlib.sha256(data).hexdigest()


def hash_password(password: str, salt: Optional[str] = None) -> str:
    """
    Gera hash seguro de senha utilizando PBKDF2 HMAC SHA-256 com 100.000 iterações.
    Formato retornado: <salt>$<hash_hex>
    """
    if not salt:
        salt = secrets.token_hex(16)
    hashed = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt.encode("utf-8"),
        iterations=100_000,
    )
    return f"{salt}${hashed.hex()}"


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifica se a senha plana corresponde ao hash armazenado."""
    if not hashed_password or "$" not in hashed_password:
        return False
    try:
        salt, expected_hash = hashed_password.split("$", 1)
        actual_hash = hashlib.pbkdf2_hmac(
            "sha256",
            plain_password.encode("utf-8"),
            salt.encode("utf-8"),
            iterations=100_000,
        ).hex()
        return hmac.compare_digest(actual_hash, expected_hash)
    except Exception:
        return False


def create_access_token(
    data: Dict[str, Any],
    expires_delta: Optional[timedelta] = None,
) -> str:
    """Cria um token JWT ou token assinado HMAC contendo o payload e expiração."""
    to_encode = data.copy()
    now = datetime.now(timezone.utc)
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)

    to_encode.update({"exp": int(expire.timestamp()), "iat": int(now.timestamp())})

    if jwt is not None:
        return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

    # Fallback seguro para token assinado em HMAC SHA-256 quando jwt não estiver disponível
    payload_json = json.dumps(to_encode, sort_keys=True)
    payload_b64 = base64.urlsafe_b64encode(payload_json.encode("utf-8")).decode("utf-8").rstrip("=")
    signature = hmac.new(
        settings.SECRET_KEY.encode("utf-8"),
        payload_b64.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()
    return f"{payload_b64}.{signature}"


def decode_access_token(token: str) -> Optional[Dict[str, Any]]:
    """Decodifica e valida o token de acesso, retornando o payload ou None se inválido/expirado."""
    if not token:
        return None

    if jwt is not None:
        try:
            payload = jwt.decode(
                token,
                settings.SECRET_KEY,
                algorithms=[settings.ALGORITHM],
            )
            return payload
        except Exception:
            pass

    # Verificação de token fallback
    try:
        if "." not in token:
            return None
        payload_b64, signature = token.split(".", 1)
        expected_sig = hmac.new(
            settings.SECRET_KEY.encode("utf-8"),
            payload_b64.encode("utf-8"),
            hashlib.sha256,
        ).hexdigest()

        if not hmac.compare_digest(signature, expected_sig):
            return None

        # Padding b64
        rem = len(payload_b64) % 4
        if rem > 0:
            payload_b64 += "=" * (4 - rem)

        payload_json = base64.urlsafe_b64decode(payload_b64.encode("utf-8")).decode("utf-8")
        payload = json.loads(payload_json)

        # Checa expiração
        exp = payload.get("exp")
        if exp and int(time.time()) > exp:
            return None

        return payload
    except Exception:
        return None
