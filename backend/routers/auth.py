"""Single-user password setup, login, and password changes."""

import hashlib
import hmac
import ipaddress
import os
import secrets
import threading
import time
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel, Field
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import AuthCredential

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

COOKIE_NAME = "trading_journal_session"
SESSION_MAX_AGE = 12 * 60 * 60
PASSWORD_ITERATIONS = 600_000
PASSWORD_MIN_LENGTH = 12
PASSWORD_MAX_LENGTH = 128
LOGIN_FAILURE_LIMIT = 5
LOGIN_WINDOW_SECONDS = 10 * 60
LOGIN_FAILURES: dict[str, list[float]] = {}
LOGIN_FAILURES_LOCK = threading.Lock()

DATA_DIR = Path(__file__).resolve().parents[2] / "data"
SESSION_SECRET_PATH = DATA_DIR / ".auth_session.key"


def _load_session_secret() -> bytes:
    configured_secret = os.getenv("AUTH_SESSION_SECRET")
    if configured_secret:
        secret = configured_secret.encode("utf-8")
        if len(secret) < 32:
            raise RuntimeError("AUTH_SESSION_SECRET must contain at least 32 bytes.")
        return secret

    DATA_DIR.mkdir(parents=True, exist_ok=True)
    try:
        with SESSION_SECRET_PATH.open("xb") as secret_file:
            secret_file.write(secrets.token_bytes(32).hex().encode("ascii"))
    except FileExistsError:
        pass

    secret_text = SESSION_SECRET_PATH.read_text(encoding="ascii").strip()
    try:
        secret = bytes.fromhex(secret_text)
    except ValueError as exc:
        raise RuntimeError("The local authentication session key is invalid.") from exc
    if len(secret) < 32:
        raise RuntimeError("The local authentication session key is too short.")
    return secret


SESSION_SECRET = _load_session_secret()


class PasswordSetup(BaseModel):
    password: str = Field(min_length=PASSWORD_MIN_LENGTH, max_length=PASSWORD_MAX_LENGTH)


class PasswordLogin(BaseModel):
    password: str = Field(min_length=1, max_length=PASSWORD_MAX_LENGTH)


class PasswordChange(BaseModel):
    current_password: str = Field(min_length=1, max_length=PASSWORD_MAX_LENGTH)
    new_password: str = Field(min_length=PASSWORD_MIN_LENGTH, max_length=PASSWORD_MAX_LENGTH)


def _hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac(
        "sha256", password.encode("utf-8"), salt, PASSWORD_ITERATIONS
    )
    return f"pbkdf2_sha256${PASSWORD_ITERATIONS}${salt.hex()}${digest.hex()}"


def _verify_password(password: str, encoded_hash: str) -> bool:
    try:
        algorithm, iterations_text, salt_text, digest_text = encoded_hash.split("$")
        if algorithm != "pbkdf2_sha256":
            return False
        iterations = int(iterations_text)
        if iterations < 1 or iterations > 2_000_000:
            return False
        expected = bytes.fromhex(digest_text)
        actual = hashlib.pbkdf2_hmac(
            "sha256", password.encode("utf-8"), bytes.fromhex(salt_text), iterations
        )
        return hmac.compare_digest(actual, expected)
    except (AttributeError, TypeError, ValueError):
        return False


def _client_key(request: Request) -> str:
    return request.client.host if request.client else "unknown"


def _failed_login_is_limited(client_key: str) -> bool:
    now = time.monotonic()
    with LOGIN_FAILURES_LOCK:
        attempts = [
            attempt for attempt in LOGIN_FAILURES.get(client_key, [])
            if now - attempt < LOGIN_WINDOW_SECONDS
        ]
        LOGIN_FAILURES[client_key] = attempts
        return len(attempts) >= LOGIN_FAILURE_LIMIT


def _record_failed_login(client_key: str) -> None:
    now = time.monotonic()
    with LOGIN_FAILURES_LOCK:
        attempts = [
            attempt for attempt in LOGIN_FAILURES.get(client_key, [])
            if now - attempt < LOGIN_WINDOW_SECONDS
        ]
        attempts.append(now)
        LOGIN_FAILURES[client_key] = attempts


def _clear_failed_logins(client_key: str) -> None:
    with LOGIN_FAILURES_LOCK:
        LOGIN_FAILURES.pop(client_key, None)


def _make_session_cookie(session_version: int) -> str:
    issued_at = int(time.time())
    nonce = secrets.token_urlsafe(16)
    message = f"{issued_at}.{session_version}.{nonce}".encode("ascii")
    signature = hmac.new(SESSION_SECRET, message, hashlib.sha256).hexdigest()
    return f"{issued_at}.{session_version}.{nonce}.{signature}"


def is_valid_session(cookie: Optional[str], session_version: int) -> bool:
    if not cookie:
        return False
    try:
        issued_text, version_text, nonce, signature = cookie.split(".")
        issued_at = int(issued_text)
        if int(version_text) != session_version:
            return False
        now = int(time.time())
        if issued_at > now + 60 or now - issued_at > SESSION_MAX_AGE:
            return False
        message = f"{issued_at}.{version_text}.{nonce}".encode("ascii")
        expected = hmac.new(SESSION_SECRET, message, hashlib.sha256).hexdigest()
        return hmac.compare_digest(signature, expected)
    except (TypeError, ValueError):
        return False


def request_is_authenticated(request: Request, db: Session) -> bool:
    credential = db.get(AuthCredential, 1)
    return bool(
        credential
        and is_valid_session(
            request.cookies.get(COOKIE_NAME), credential.session_version
        )
    )


def _set_session_cookie(response: Response, request: Request, session_version: int) -> None:
    response.set_cookie(
        key=COOKIE_NAME,
        value=_make_session_cookie(session_version),
        max_age=SESSION_MAX_AGE,
        httponly=True,
        secure=request.url.scheme == "https",
        samesite="strict",
        path="/",
    )


def _require_local_setup_request(request: Request) -> None:
    hostname = (request.url.hostname or "").strip("[]").lower()
    client_host = request.client.host if request.client else ""
    try:
        is_loopback = ipaddress.ip_address(client_host).is_loopback
    except ValueError:
        is_loopback = False
    if hostname not in {"localhost", "127.0.0.1", "::1"} or not is_loopback:
        raise HTTPException(
            status_code=403,
            detail="Initial password setup is available only from this computer.",
        )


@router.get("/status")
def get_auth_status(request: Request, db: Session = Depends(get_db)):
    credential = db.get(AuthCredential, 1)
    return {
        "setup_required": credential is None,
        "authenticated": bool(
            credential
            and is_valid_session(
                request.cookies.get(COOKIE_NAME), credential.session_version
            )
        ),
    }


@router.post("/setup", status_code=201)
def setup_password(
    payload: PasswordSetup,
    request: Request,
    db: Session = Depends(get_db),
):
    _require_local_setup_request(request)
    if db.get(AuthCredential, 1):
        raise HTTPException(status_code=409, detail="Password setup is already complete.")

    credential = AuthCredential(
        id=1,
        password_hash=_hash_password(payload.password),
        session_version=1,
    )
    db.add(credential)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=409, detail="Password setup is already complete."
        ) from exc

    response = Response(
        content='{"authenticated":true}',
        media_type="application/json",
        status_code=201,
    )
    _set_session_cookie(response, request, credential.session_version)
    return response


@router.post("/login")
def login(
    payload: PasswordLogin,
    request: Request,
    db: Session = Depends(get_db),
):
    credential = db.get(AuthCredential, 1)
    if not credential:
        raise HTTPException(status_code=409, detail="Complete initial password setup first.")

    client_key = _client_key(request)
    if _failed_login_is_limited(client_key):
        raise HTTPException(
            status_code=429,
            detail="Too many unsuccessful attempts. Wait 10 minutes before trying again.",
        )
    if not _verify_password(payload.password, credential.password_hash):
        _record_failed_login(client_key)
        raise HTTPException(status_code=401, detail="Incorrect password.")

    _clear_failed_logins(client_key)
    response = Response(
        content='{"authenticated":true}',
        media_type="application/json",
    )
    _set_session_cookie(response, request, credential.session_version)
    return response


@router.post("/logout")
def logout():
    response = Response(content='{"authenticated":false}', media_type="application/json")
    response.delete_cookie(
        key=COOKIE_NAME, path="/", httponly=True, samesite="strict"
    )
    return response


@router.post("/change-password")
def change_password(
    payload: PasswordChange,
    request: Request,
    db: Session = Depends(get_db),
):
    credential = db.get(AuthCredential, 1)
    if not credential or not request_is_authenticated(request, db):
        raise HTTPException(status_code=401, detail="Authentication required.")
    if not _verify_password(payload.current_password, credential.password_hash):
        raise HTTPException(status_code=400, detail="Current password is incorrect.")

    credential.password_hash = _hash_password(payload.new_password)
    credential.session_version += 1
    db.commit()

    response = Response(
        content='{"password_changed":true}',
        media_type="application/json",
    )
    _set_session_cookie(response, request, credential.session_version)
    return response
