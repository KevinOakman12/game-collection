"""Хеширование паролей и работа с JWT-токенами."""
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt

from .config import ACCESS_TOKEN_EXPIRE_MINUTES, JWT_ALGORITHM, SECRET_KEY


def hash_password(password: str) -> str:
    """Возвращает bcrypt-хеш пароля. Соль генерируется заново для каждого пароля."""
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    """Сравнивает введённый пароль с сохранённым хешем."""
    try:
        return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))
    except ValueError:
        # Повреждённый хеш или пароль длиннее 72 байт — считаем пароль неверным
        return False


def create_access_token(user_id: int) -> str:
    """Создаёт подписанный токен доступа с идентификатором пользователя и сроком действия."""
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(user_id),
        "iat": now,
        "exp": now + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=JWT_ALGORITHM)


def decode_access_token(token: str) -> int | None:
    """Проверяет подпись и срок действия токена. Возвращает id пользователя или None."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[JWT_ALGORITHM])
        return int(payload["sub"])
    except (jwt.InvalidTokenError, KeyError, ValueError):
        return None
