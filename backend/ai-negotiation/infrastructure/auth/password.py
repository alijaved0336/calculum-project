import bcrypt

from config import settings


def hash_password(plain: str) -> str:
    peppered = (plain + settings.password_pepper).encode("utf-8")
    return bcrypt.hashpw(peppered, bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str | None) -> bool:
    if not hashed:
        return False
    peppered = (plain + settings.password_pepper).encode("utf-8")
    return bcrypt.checkpw(peppered, hashed.encode("utf-8"))
