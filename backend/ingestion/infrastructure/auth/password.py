from __future__ import annotations

import bcrypt

from config import settings


def hash_password(plain: str) -> str:
    peppered = (plain + settings.password_pepper).encode()
    return bcrypt.hashpw(peppered, bcrypt.gensalt()).decode()


def verify_password(plain: str, hashed: str) -> bool:
    peppered = (plain + settings.password_pepper).encode()
    return bcrypt.checkpw(peppered, hashed.encode())
