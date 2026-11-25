from __future__ import annotations

import hashlib
import hmac
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any
from urllib.parse import urlencode

import jwt
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError

from app.core.config import get_settings

password_hasher = PasswordHasher(time_cost=2, memory_cost=65536, parallelism=2)


def hash_password(password: str) -> str:
    return password_hasher.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return password_hasher.verify(password_hash, password)
    except VerifyMismatchError:
        return False


def hash_token(raw_token: str) -> str:
    return hashlib.sha256(raw_token.encode("utf-8")).hexdigest()


def generate_opaque_token(length_bytes: int = 32) -> str:
    return secrets.token_urlsafe(length_bytes)


def create_access_token(
    *,
    subject: str,
    account_type: str,
    organization_id: str | None = None,
    role: str | None = None,
    is_demo: bool = False,
    demo_session_id: str | None = None,
    expires_delta: timedelta | None = None,
) -> tuple[str, int]:
    settings = get_settings()
    now = datetime.now(timezone.utc)
    ttl = expires_delta or timedelta(minutes=settings.access_token_expire_minutes)
    exp = now + ttl
    payload: dict[str, Any] = {
        "sub": subject,
        "type": "access",
        "account_type": account_type,
        "org_id": organization_id,
        "role": role,
        "is_demo": is_demo,
        "demo_session_id": demo_session_id,
        "iat": int(now.timestamp()),
        "exp": int(exp.timestamp()),
    }
    token = jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)
    return token, int(ttl.total_seconds())


def decode_access_token(token: str) -> dict[str, Any]:
    settings = get_settings()
    payload = jwt.decode(
        token,
        settings.jwt_secret_key,
        algorithms=[settings.jwt_algorithm],
        options={"require": ["sub", "exp", "type"]},
    )
    if payload.get("type") != "access":
        raise jwt.InvalidTokenError("Token type must be access.")
    return payload


def create_signed_document_url(document_id: str, expires_in_seconds: int = 300) -> tuple[str, int]:
    settings = get_settings()
    expires_at = int((datetime.now(timezone.utc) + timedelta(seconds=expires_in_seconds)).timestamp())
    message = f"{document_id}:{expires_at}".encode("utf-8")
    signature = hmac.new(
        settings.signed_url_secret.encode("utf-8"),
        message,
        hashlib.sha256,
    ).hexdigest()
    query = urlencode({"expires": str(expires_at), "sig": signature})
    return f"/api/v1/documents/{document_id}/download?{query}", expires_at


def verify_signed_document_params(document_id: str, expires: int, signature: str) -> bool:
    settings = get_settings()
    now_ts = int(datetime.now(timezone.utc).timestamp())
    if expires < now_ts:
        return False
    message = f"{document_id}:{expires}".encode("utf-8")
    expected = hmac.new(
        settings.signed_url_secret.encode("utf-8"),
        message,
        hashlib.sha256,
    ).hexdigest()
    return hmac.compare_digest(expected, signature)
