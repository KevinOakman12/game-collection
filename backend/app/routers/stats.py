"""Статистика по коллекции пользователя."""
from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_current_user
from ..models import CollectionItem, Game, GameStatus, Platform, User, WishlistItem
from ..schemas import GameHours, PlatformStats, Stats, StatusCount

router = APIRouter(prefix="/api/stats", tags=["Статистика"])


def completion_percent(completed: int, total: int) -> float:
    """Доля пройденных игр в коллекции, %, с точностью до десятых. Для пустой коллекции — 0."""
    if total == 0:
        return 0.0
    return round(completed / total * 100, 1)


@router.get("", response_model=Stats)
def get_stats(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """Сводные показатели коллекции: количество, прогресс, часы, распределения по статусам и платформам."""
    own_items = CollectionItem.user_id == user.id

    status_rows = (
        db.query(CollectionItem.status, func.count(CollectionItem.id))
        .filter(own_items)
        .group_by(CollectionItem.status)
        .all()
    )
    counts = {row_status: count for row_status, count in status_rows}
    by_status = [StatusCount(status=s, count=counts.get(s, 0)) for s in GameStatus]
    total_games = sum(counts.values())
    completed_games = counts.get(GameStatus.COMPLETED, 0)

    total_hours = (
        db.query(func.coalesce(func.sum(CollectionItem.hours_played), 0.0)).filter(own_items).scalar()
    )

    platform_rows = (
        db.query(Platform.name, func.count(CollectionItem.id), func.sum(CollectionItem.hours_played))
        .join(CollectionItem, CollectionItem.platform_id == Platform.id)
        .filter(own_items)
        .group_by(Platform.name)
        .order_by(func.count(CollectionItem.id).desc(), Platform.name)
        .all()
    )
    by_platform = [
        PlatformStats(platform=name, count=count, hours=round(hours or 0, 1))
        for name, count, hours in platform_rows
    ]

    top_rows = (
        db.query(Game.title, Platform.name, CollectionItem.hours_played)
        .join(CollectionItem, CollectionItem.game_id == Game.id)
        .join(Platform, CollectionItem.platform_id == Platform.id)
        .filter(own_items, CollectionItem.hours_played > 0)
        .order_by(CollectionItem.hours_played.desc(), Game.title)
        .limit(5)
        .all()
    )
    top_by_hours = [GameHours(title=title, platform=platform, hours=hours) for title, platform, hours in top_rows]

    wishlist_count = db.query(func.count(WishlistItem.id)).filter(WishlistItem.user_id == user.id).scalar()

    return Stats(
        total_games=total_games,
        completed_games=completed_games,
        total_hours=round(total_hours, 1),
        completion_percent=completion_percent(completed_games, total_games),
        wishlist_count=wishlist_count,
        by_status=by_status,
        by_platform=by_platform,
        top_by_hours=top_by_hours,
    )
