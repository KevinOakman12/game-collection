"""Регистрация, вход и данные текущего пользователя."""
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_current_user
from ..models import User
from ..schemas import Token, UserCreate, UserRead
from ..security import create_access_token, hash_password, verify_password

router = APIRouter(prefix="/api/auth", tags=["Авторизация"])


@router.post("/register", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def register(data: UserCreate, db: Session = Depends(get_db)):
    """Регистрирует пользователя. Логин и email должны быть уникальными (без учёта регистра)."""
    email = data.email.lower()
    existing = (
        db.query(User)
        .filter(or_(func.lower(User.username) == data.username.lower(), User.email == email))
        .first()
    )
    if existing is not None:
        field = "логином" if existing.username.lower() == data.username.lower() else "email"
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Пользователь с таким {field} уже существует",
        )

    user = User(username=data.username, email=email, password_hash=hash_password(data.password))
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.post("/login", response_model=Token)
def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """Вход по логину или email и паролю. Возвращает JWT-токен доступа."""
    login_value = form.username.strip().lower()
    user = (
        db.query(User)
        .filter(or_(func.lower(User.username) == login_value, User.email == login_value))
        .first()
    )
    # Одинаковое сообщение для неверного логина и пароля, чтобы не раскрывать существующие учётные записи
    if user is None or not verify_password(form.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверный логин или пароль",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return Token(access_token=create_access_token(user.id), user=UserRead.model_validate(user))


@router.get("/me", response_model=UserRead)
def me(user: User = Depends(get_current_user)):
    return user
