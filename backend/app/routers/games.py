"""Библиотека игр: просмотр, поиск, фильтрация и игры, добавленные пользователем вручную."""
from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_current_user, get_optional_user, get_visible_game, visible_games_condition
from ..models import Game, Genre, Platform, User, game_platforms
from ..schemas import GameCreate, GamePage, GameRead, GameUpdate

router = APIRouter(prefix="/api/games", tags=["Игры"])


def load_platforms(db: Session, platform_ids: list[int]) -> list[Platform]:
    platforms = db.query(Platform).filter(Platform.id.in_(set(platform_ids))).all()
    if len(platforms) != len(set(platform_ids)):
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail="Указана несуществующая платформа")
    return platforms


def check_genre(db: Session, genre_id: int | None) -> None:
    if genre_id is not None and db.get(Genre, genre_id) is None:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail="Указан несуществующий жанр")


def get_own_custom_game(db: Session, game_id: int, user: User) -> Game:
    """Игру из публичной библиотеки изменять нельзя, чужую пользовательскую — не видно."""
    game = get_visible_game(db, game_id, user)
    if game.created_by != user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Игры публичной библиотеки нельзя изменять",
        )
    return game


@router.get("", response_model=GamePage)
def list_games(
    search: str | None = Query(default=None, max_length=200),
    platform_id: int | None = None,
    genre_id: int | None = None,
    only_custom: bool = False,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=12, ge=1, le=100),
    db: Session = Depends(get_db),
    user: User | None = Depends(get_optional_user),
):
    """Список игр с поиском по названию, фильтрами по платформе и жанру и постраничным выводом."""
    query = db.query(Game).filter(visible_games_condition(user))
    if search and search.strip():
        query = query.filter(func.unicode_lower(Game.title).contains(search.strip().lower(), autoescape=True))
    if platform_id is not None:
        query = query.join(game_platforms).filter(game_platforms.c.platform_id == platform_id)
    if genre_id is not None:
        query = query.filter(Game.genre_id == genre_id)
    if only_custom and user is not None:
        query = query.filter(Game.created_by == user.id)

    total = query.count()
    items = (
        query.order_by(Game.title)
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return GamePage(items=items, total=total, page=page, page_size=page_size)


@router.get("/{game_id}", response_model=GameRead)
def get_game(game_id: int, db: Session = Depends(get_db), user: User | None = Depends(get_optional_user)):
    return get_visible_game(db, game_id, user)


@router.post("", response_model=GameRead, status_code=status.HTTP_201_CREATED)
def create_game(data: GameCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """Ручное добавление игры, которой нет в библиотеке. Видна только её автору."""
    check_genre(db, data.genre_id)
    game = Game(
        **data.model_dump(exclude={"platform_ids"}),
        platforms=load_platforms(db, data.platform_ids),
        created_by=user.id,
    )
    db.add(game)
    db.commit()
    db.refresh(game)
    return game


@router.put("/{game_id}", response_model=GameRead)
def update_game(
    game_id: int, data: GameUpdate, db: Session = Depends(get_db), user: User = Depends(get_current_user)
):
    game = get_own_custom_game(db, game_id, user)
    changes = data.model_dump(exclude_unset=True)
    if changes.get("title") is not None:
        changes["title"] = changes["title"].strip()
        if not changes["title"]:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail="Название не может быть пустым")
    if "genre_id" in changes:
        check_genre(db, changes["genre_id"])
    if "platform_ids" in changes:
        platform_ids = changes.pop("platform_ids")
        if platform_ids is None:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail="Нужна хотя бы одна платформа")
        new_platforms = load_platforms(db, platform_ids)
        # Нельзя убрать платформу, на которой игра уже числится в коллекции
        used = {item.platform_id for item in user.collection_items if item.game_id == game.id}
        removed = used - {p.id for p in new_platforms}
        if removed:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Нельзя убрать платформу, на которой игра есть в коллекции",
            )
        game.platforms = new_platforms
    for field, value in changes.items():
        setattr(game, field, value)
    db.commit()
    db.refresh(game)
    return game


@router.delete("/{game_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_game(game_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """Удаляет пользовательскую игру вместе с её записями в коллекции и списке желаемого."""
    game = get_own_custom_game(db, game_id, user)
    db.delete(game)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
