"""ORM-модели: описание таблиц базы данных."""
import enum
from datetime import datetime, timezone

from sqlalchemy import (
    CheckConstraint,
    Column,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Integer,
    String,
    Table,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class GameStatus(str, enum.Enum):
    """Статус прохождения игры в коллекции."""

    NOT_STARTED = "not_started"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    ABANDONED = "abandoned"


class WishType(str, enum.Enum):
    """Тип пометки в списке желаемого."""

    BUY = "buy"
    PLAY = "play"


def enum_column(enum_class: type[enum.Enum], name: str) -> Enum:
    """Хранит перечисление строкой с ограничением CHECK на допустимые значения."""
    return Enum(
        enum_class,
        name=name,
        native_enum=False,
        create_constraint=True,
        length=20,
        values_callable=lambda members: [m.value for m in members],
    )


# Связь «многие ко многим»: на каких платформах выпущена игра
game_platforms = Table(
    "game_platforms",
    Base.metadata,
    Column("game_id", ForeignKey("games.id", ondelete="CASCADE"), primary_key=True),
    Column("platform_id", ForeignKey("platforms.id", ondelete="CASCADE"), primary_key=True),
)


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    username: Mapped[str] = mapped_column(String(50), unique=True)
    email: Mapped[str] = mapped_column(String(255), unique=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    collection_items: Mapped[list["CollectionItem"]] = relationship(
        back_populates="user", cascade="all, delete-orphan", passive_deletes=True
    )
    wishlist_items: Mapped[list["WishlistItem"]] = relationship(
        back_populates="user", cascade="all, delete-orphan", passive_deletes=True
    )


class Genre(Base):
    __tablename__ = "genres"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(50), unique=True)


class Platform(Base):
    __tablename__ = "platforms"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(50), unique=True)
    manufacturer: Mapped[str | None] = mapped_column(String(100))


class Game(Base):
    """Игра. Если created_by пуст — игра из публичной библиотеки, иначе — добавлена пользователем вручную."""

    __tablename__ = "games"
    __table_args__ = (
        CheckConstraint(
            "release_year IS NULL OR release_year BETWEEN 1950 AND 2100",
            name="ck_games_release_year",
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    title: Mapped[str] = mapped_column(String(200), index=True)
    description: Mapped[str | None] = mapped_column(Text)
    release_year: Mapped[int | None] = mapped_column(Integer)
    developer: Mapped[str | None] = mapped_column(String(150))
    cover_url: Mapped[str | None] = mapped_column(String(500))
    genre_id: Mapped[int | None] = mapped_column(ForeignKey("genres.id", ondelete="SET NULL"))
    created_by: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    genre: Mapped[Genre | None] = relationship(lazy="joined")
    platforms: Mapped[list[Platform]] = relationship(
        secondary=game_platforms, lazy="selectin", order_by=Platform.name
    )

    @property
    def is_custom(self) -> bool:
        return self.created_by is not None


class CollectionItem(Base):
    """Запись коллекции: игра пользователя на конкретной платформе и прогресс по ней."""

    __tablename__ = "collection_items"
    __table_args__ = (
        UniqueConstraint("user_id", "game_id", "platform_id", name="uq_collection_user_game_platform"),
        CheckConstraint("hours_played >= 0", name="ck_collection_hours_non_negative"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    game_id: Mapped[int] = mapped_column(ForeignKey("games.id", ondelete="CASCADE"))
    platform_id: Mapped[int] = mapped_column(ForeignKey("platforms.id", ondelete="RESTRICT"))
    status: Mapped[GameStatus] = mapped_column(
        enum_column(GameStatus, "game_status"), default=GameStatus.NOT_STARTED
    )
    hours_played: Mapped[float] = mapped_column(Float, default=0)
    notes: Mapped[str | None] = mapped_column(Text)
    added_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow
    )

    user: Mapped[User] = relationship(back_populates="collection_items")
    game: Mapped[Game] = relationship(lazy="joined")
    platform: Mapped[Platform] = relationship(lazy="joined")


class WishlistItem(Base):
    """Запись списка желаемого: «хочу купить» или «хочу сыграть»."""

    __tablename__ = "wishlist_items"
    __table_args__ = (UniqueConstraint("user_id", "game_id", name="uq_wishlist_user_game"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    game_id: Mapped[int] = mapped_column(ForeignKey("games.id", ondelete="CASCADE"))
    platform_id: Mapped[int | None] = mapped_column(ForeignKey("platforms.id", ondelete="SET NULL"))
    wish_type: Mapped[WishType] = mapped_column(enum_column(WishType, "wish_type"))
    note: Mapped[str | None] = mapped_column(Text)
    added_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    user: Mapped[User] = relationship(back_populates="wishlist_items")
    game: Mapped[Game] = relationship(lazy="joined")
    platform: Mapped[Platform | None] = relationship(lazy="joined")
