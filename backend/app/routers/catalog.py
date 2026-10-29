"""Справочники жанров и платформ."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Genre, Platform
from ..schemas import GenreRead, PlatformRead

router = APIRouter(prefix="/api", tags=["Справочники"])


@router.get("/genres", response_model=list[GenreRead])
def list_genres(db: Session = Depends(get_db)):
    return db.query(Genre).order_by(Genre.name).all()


@router.get("/platforms", response_model=list[PlatformRead])
def list_platforms(db: Session = Depends(get_db)):
    return db.query(Platform).order_by(Platform.name).all()
