"""Подключение к базе данных SQLite через SQLAlchemy."""
import logging

from sqlalchemy import create_engine, event, text
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from .config import DATABASE_URL

logger = logging.getLogger(__name__)

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


def unicode_lower(value: str | None) -> str | None:
    return value.lower() if value is not None else None


@event.listens_for(engine, "connect")
def configure_sqlite_connection(dbapi_connection, _connection_record):
    """Настраивает каждое новое подключение к SQLite.

    - включает проверку внешних ключей (по умолчанию в SQLite отключена);
    - регистрирует функцию unicode_lower: встроенная lower() в SQLite
      понижает регистр только латиницы, из-за чего не работал поиск по русским названиям.
    """
    dbapi_connection.create_function("unicode_lower", 1, unicode_lower, deterministic=True)
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()


class Base(DeclarativeBase):
    pass


def get_db():
    """Зависимость FastAPI: открывает сессию на время запроса и закрывает её после."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    """Проверяет подключение к БД и создаёт недостающие таблицы."""
    from . import models  # noqa: F401  — регистрирует модели в Base.metadata

    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
        Base.metadata.create_all(bind=engine)
    except OperationalError:
        logger.exception("Не удалось подключиться к базе данных %s", DATABASE_URL)
        raise
    logger.info("База данных готова: %s", DATABASE_URL)
