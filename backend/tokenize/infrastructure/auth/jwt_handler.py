from datetime import datetime, timedelta, timezone
from jose import JWTError, jwt
from config import settings


def sign_auth_token(user_id: str, role: str, tenant_id: str | None = None) -> str:
    expire = datetime.now(timezone.utc) + timedelta(hours=settings.jwt_expiry_hours)
    payload: dict = {"sub": user_id, "role": role, "exp": expire}
    if tenant_id is not None:
        payload["tenant_id"] = tenant_id
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.ALGORITHM)


def verify_token(token: str) -> dict:
    try:
        return jwt.decode(token, settings.jwt_secret, algorithms=[settings.ALGORITHM])
    except JWTError as exc:
        raise ValueError("invalid or expired token") from exc
