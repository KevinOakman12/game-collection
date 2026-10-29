"""Общие зависимости FastAPI: получение текущего пользователя и видимость игр."""
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import or_
from sqlalchemy.orm import Session

from .database import get_db
from .models import Game, User
from .security import decode_access_token

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)

CREDENTIALS_ERROR = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Требуется авторизация",
    headers={"WWW-Authenticate": "Bearer"},
)


def get_optional_user(
    token: str | None = Depends(oauth2_scheme), db: Session = Depends(get_db)
) -> User | None:
    """Пользователь по токену или None для гостя. Недействительный токен — ошибка 401."""
    if token is None:
        return None
    user_id = decode_access_token(token)
    if user_id is None:
        raise CREDENTIALS_ERROR
    user = db.get(User, user_id)
    if user is None:
        raise CREDENTIALS_ERROR
    return user


def get_current_user(user: User | None = Depends(get_optional_user)) -> User:
    """Доступ только для авторизованного пользователя."""
    if user is None:
        raise CREDENTIALS_ERROR
    return user


def visible_games_condition(user: User | None):
    """Условие WHERE: гость видит публичные игры, пользователь — ещё и свои добавленные вручную."""
    if user is None:
        return Game.created_by.is_(None)
    return or_(Game.created_by.is_(None), Game.created_by == user.id)


def get_visible_game(db: Session, game_id: int, user: User | None) -> Game:
    """Игра по id с учётом видимости. Чужие пользовательские игры считаются несуществующими."""
    game = db.query(Game).filter(Game.id == game_id, visible_games_condition(user)).first()
    if game is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Игра не найдена")
    return game


def ensure_game_platform(game: Game, platform_id: int) -> None:
    """Проверяет, что игра выпущена на выбранной платформе."""
    if platform_id not in {platform.id for platform in game.platforms}:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Игра не выпускалась на выбранной платформе",
        )
