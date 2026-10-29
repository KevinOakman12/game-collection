"""Настройки приложения. Значения можно переопределить переменными окружения."""
import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

# Файл базы данных SQLite лежит в папке backend
DATABASE_URL = os.getenv("GAMES_DATABASE_URL", f"sqlite:///{BASE_DIR / 'games.db'}")

# Ключ подписи JWT-токенов. В рабочей среде обязательно задать свой
SECRET_KEY = os.getenv(
    "GAMES_SECRET_KEY", "dev-only-secret-key-change-me-in-production-0123456789"
)
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("GAMES_TOKEN_EXPIRE_MINUTES", 60 * 24))

# Адреса фронтенда, которым разрешены запросы к API
CORS_ORIGINS = ["http://localhost:5173", "http://127.0.0.1:5173"]
