"""Личная коллекция пользователя и прогресс прохождения."""
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import ensure_game_platform, get_current_user, get_visible_game
from ..models import CollectionItem, Game, GameStatus, User
from ..schemas import CollectionItemCreate, CollectionItemRead, CollectionItemUpdate

router = APIRouter(prefix="/api/collection", tags=["Коллекция"])

SORT_FIELDS = {
    "title": Game.title,
    "hours": CollectionItem.hours_played,
    "updated": CollectionItem.updated_at,
    "added": CollectionItem.added_at,
}


def get_own_item(db: Session, item_id: int, user: User) -> CollectionItem:
    """Запись коллекции текущего пользователя. Чужие записи считаются несуществующими."""
    item = db.get(CollectionItem, item_id)
    if item is None or item.user_id != user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Запись коллекции не найдена")
    return item


def ensure_not_duplicate(db: Session, user: User, game_id: int, platform_id: int, exclude_id: int | None = None):
    query = db.query(CollectionItem).filter(
        CollectionItem.user_id == user.id,
        CollectionItem.game_id == game_id,
        CollectionItem.platform_id == platform_id,
    )
    if exclude_id is not None:
        query = query.filter(CollectionItem.id != exclude_id)
    if query.first() is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Эта игра на выбранной платформе уже есть в коллекции",
        )


@router.get("", response_model=list[CollectionItemRead])
def list_collection(
    search: str | None = Query(default=None, max_length=200),
    status_filter: GameStatus | None = Query(default=None, alias="status"),
    platform_id: int | None = None,
    sort: Literal["title", "hours", "updated", "added"] = "updated",
    order: Literal["asc", "desc"] = "desc",
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Коллекция с поиском по названию, фильтрами по статусу и платформе и сортировкой."""
    query = db.query(CollectionItem).join(CollectionItem.game).filter(CollectionItem.user_id == user.id)
    if search and search.strip():
        query = query.filter(func.unicode_lower(Game.title).contains(search.strip().lower(), autoescape=True))
    if status_filter is not None:
        query = query.filter(CollectionItem.status == status_filter)
    if platform_id is not None:
        query = query.filter(CollectionItem.platform_id == platform_id)

    column = SORT_FIELDS[sort]
    query = query.order_by(column.asc() if order == "asc" else column.desc(), CollectionItem.id)
    return query.all()


@router.post("", response_model=CollectionItemRead, status_code=status.HTTP_201_CREATED)
def add_to_collection(
    data: CollectionItemCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)
):
    game = get_visible_game(db, data.game_id, user)
    ensure_game_platform(game, data.platform_id)
    ensure_not_duplicate(db, user, game.id, data.platform_id)

    item = CollectionItem(user_id=user.id, **data.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.get("/{item_id}", response_model=CollectionItemRead)
def get_collection_item(item_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return get_own_item(db, item_id, user)


@router.put("/{item_id}", response_model=CollectionItemRead)
def update_collection_item(
    item_id: int,
    data: CollectionItemUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Изменение платформы, статуса, затраченных часов и заметок."""
    item = get_own_item(db, item_id, user)
    changes = data.model_dump(exclude_unset=True)
    for field in ("platform_id", "status", "hours_played"):
        if field in changes and changes[field] is None:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail="Поле не может быть пустым"
            )
    if "platform_id" in changes and changes["platform_id"] != item.platform_id:
        ensure_game_platform(item.game, changes["platform_id"])
        ensure_not_duplicate(db, user, item.game_id, changes["platform_id"], exclude_id=item.id)
    for field, value in changes.items():
        setattr(item, field, value)
    db.commit()
    db.refresh(item)
    return item


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_collection_item(item_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    item = get_own_item(db, item_id, user)
    db.delete(item)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
