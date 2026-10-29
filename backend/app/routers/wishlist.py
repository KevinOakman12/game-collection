"""Список желаемого: «хочу купить» и «хочу сыграть»."""
from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import ensure_game_platform, get_current_user, get_visible_game
from ..models import CollectionItem, User, WishlistItem, WishType
from ..schemas import CollectionItemRead, MoveToCollection, WishlistItemCreate, WishlistItemRead, WishlistItemUpdate
from .collection import ensure_not_duplicate

router = APIRouter(prefix="/api/wishlist", tags=["Список желаемого"])


def get_own_wish(db: Session, item_id: int, user: User) -> WishlistItem:
    item = db.get(WishlistItem, item_id)
    if item is None or item.user_id != user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Запись списка желаемого не найдена")
    return item


@router.get("", response_model=list[WishlistItemRead])
def list_wishlist(
    wish_type: WishType | None = Query(default=None),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    query = db.query(WishlistItem).filter(WishlistItem.user_id == user.id)
    if wish_type is not None:
        query = query.filter(WishlistItem.wish_type == wish_type)
    return query.order_by(WishlistItem.added_at.desc(), WishlistItem.id.desc()).all()


@router.post("", response_model=WishlistItemRead, status_code=status.HTTP_201_CREATED)
def add_to_wishlist(data: WishlistItemCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    game = get_visible_game(db, data.game_id, user)
    if data.platform_id is not None:
        ensure_game_platform(game, data.platform_id)
    exists = db.query(WishlistItem).filter_by(user_id=user.id, game_id=game.id).first()
    if exists is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Игра уже есть в списке желаемого")

    item = WishlistItem(user_id=user.id, **data.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.put("/{item_id}", response_model=WishlistItemRead)
def update_wish(
    item_id: int, data: WishlistItemUpdate, db: Session = Depends(get_db), user: User = Depends(get_current_user)
):
    item = get_own_wish(db, item_id, user)
    changes = data.model_dump(exclude_unset=True)
    if "wish_type" in changes and changes["wish_type"] is None:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail="Укажите тип пометки")
    if changes.get("platform_id") is not None:
        ensure_game_platform(item.game, changes["platform_id"])
    for field, value in changes.items():
        setattr(item, field, value)
    db.commit()
    db.refresh(item)
    return item


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_wish(item_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    item = get_own_wish(db, item_id, user)
    db.delete(item)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/{item_id}/move-to-collection", response_model=CollectionItemRead, status_code=status.HTTP_201_CREATED)
def move_to_collection(
    item_id: int, data: MoveToCollection, db: Session = Depends(get_db), user: User = Depends(get_current_user)
):
    """Переносит игру из списка желаемого в коллекцию одной транзакцией."""
    wish = get_own_wish(db, item_id, user)
    ensure_game_platform(wish.game, data.platform_id)
    ensure_not_duplicate(db, user, wish.game_id, data.platform_id)

    item = CollectionItem(user_id=user.id, game_id=wish.game_id, **data.model_dump())
    db.add(item)
    db.delete(wish)
    db.commit()
    db.refresh(item)
    return item
