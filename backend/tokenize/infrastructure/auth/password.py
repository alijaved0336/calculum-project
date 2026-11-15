import bcrypt as _bcrypt
from config import settings


def hash_password(plain: str) -> str:
    secret = (plain + settings.password_pepper).encode()
    return _bcrypt.hashpw(secret, _bcrypt.gensalt()).decode()


def verify_password(plain: str, hashed: str) -> bool:
    secret = (plain + settings.password_pepper).encode()
    return _bcrypt.checkpw(secret, hashed.encode())
