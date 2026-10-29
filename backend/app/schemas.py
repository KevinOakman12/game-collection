"""Схемы Pydantic: структура входных и выходных данных API и их проверка."""
from datetime import datetime, timezone
from typing import Annotated

from pydantic import AfterValidator, BaseModel, ConfigDict, EmailStr, Field, field_validator

from .models import GameStatus, WishType

URL_PATTERN = r"^https?://\S+$"

# SQLite не хранит часовой пояс: время записывается в UTC, поэтому при выдаче явно помечаем его как UTC
UTCDateTime = Annotated[
    datetime, AfterValidator(lambda value: value if value.tzinfo else value.replace(tzinfo=timezone.utc))
]


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


# ---------- Пользователи и авторизация ----------

class UserCreate(BaseModel):
    username: str = Field(min_length=3, max_length=50, pattern=r"^[A-Za-z0-9_]+$")
    email: EmailStr
    password: str = Field(min_length=6, max_length=72)

    @field_validator("password")
    @classmethod
    def password_fits_bcrypt(cls, value: str) -> str:
        # bcrypt учитывает только первые 72 байта, а кириллица занимает 2 байта на символ
        if len(value.encode("utf-8")) > 72:
            raise ValueError("Пароль слишком длинный (более 72 байт)")
        return value


class UserRead(ORMModel):
    id: int
    username: str
    email: str
    created_at: UTCDateTime


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserRead


# ---------- Справочники ----------

class GenreRead(ORMModel):
    id: int
    name: str


class PlatformRead(ORMModel):
    id: int
    name: str
    manufacturer: str | None = None


# ---------- Игры ----------

class GameCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=5000)
    release_year: int | None = Field(default=None, ge=1950, le=2100)
    developer: str | None = Field(default=None, max_length=150)
    cover_url: str | None = Field(default=None, max_length=500, pattern=URL_PATTERN)
    genre_id: int | None = None
    platform_ids: list[int] = Field(min_length=1)

    @field_validator("title")
    @classmethod
    def strip_title(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Название не может быть пустым")
        return value


class GameUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=5000)
    release_year: int | None = Field(default=None, ge=1950, le=2100)
    developer: str | None = Field(default=None, max_length=150)
    cover_url: str | None = Field(default=None, max_length=500, pattern=URL_PATTERN)
    genre_id: int | None = None
    platform_ids: list[int] | None = Field(default=None, min_length=1)


class GameRead(ORMModel):
    id: int
    title: str
    description: str | None
    release_year: int | None
    developer: str | None
    cover_url: str | None
    genre: GenreRead | None
    platforms: list[PlatformRead]
    is_custom: bool


class GamePage(BaseModel):
    items: list[GameRead]
    total: int
    page: int
    page_size: int


# ---------- Коллекция ----------

class CollectionItemCreate(BaseModel):
    game_id: int
    platform_id: int
    status: GameStatus = GameStatus.NOT_STARTED
    hours_played: float = Field(default=0, ge=0, le=100_000)
    notes: str | None = Field(default=None, max_length=2000)


class CollectionItemUpdate(BaseModel):
    platform_id: int | None = None
    status: GameStatus | None = None
    hours_played: float | None = Field(default=None, ge=0, le=100_000)
    notes: str | None = Field(default=None, max_length=2000)


class CollectionItemRead(ORMModel):
    id: int
    game: GameRead
    platform: PlatformRead
    status: GameStatus
    hours_played: float
    notes: str | None
    added_at: UTCDateTime
    updated_at: UTCDateTime


# ---------- Список желаемого ----------

class WishlistItemCreate(BaseModel):
    game_id: int
    wish_type: WishType
    platform_id: int | None = None
    note: str | None = Field(default=None, max_length=2000)


class WishlistItemUpdate(BaseModel):
    wish_type: WishType | None = None
    platform_id: int | None = None
    note: str | None = Field(default=None, max_length=2000)


class WishlistItemRead(ORMModel):
    id: int
    game: GameRead
    platform: PlatformRead | None
    wish_type: WishType
    note: str | None
    added_at: UTCDateTime


class MoveToCollection(BaseModel):
    platform_id: int
    status: GameStatus = GameStatus.NOT_STARTED
    hours_played: float = Field(default=0, ge=0, le=100_000)
    notes: str | None = Field(default=None, max_length=2000)


# ---------- Статистика ----------

class StatusCount(BaseModel):
    status: GameStatus
    count: int


class PlatformStats(BaseModel):
    platform: str
    count: int
    hours: float


class GameHours(BaseModel):
    title: str
    platform: str
    hours: float


class Stats(BaseModel):
    total_games: int
    completed_games: int
    total_hours: float
    completion_percent: float
    wishlist_count: int
    by_status: list[StatusCount]
    by_platform: list[PlatformStats]
    top_by_hours: list[GameHours]
