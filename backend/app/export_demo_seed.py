"""Выгружает начальные данные библиотеки в JSON для демо-версии фронтенда.

Демо-версия работает без сервера, поэтому берёт жанры, платформы и игры из этого файла.
Запуск из папки backend:  python -m app.export_demo_seed
"""
import json
from pathlib import Path

from .seed import GAMES, GENRES, PLATFORMS

OUT = Path(__file__).resolve().parents[2] / "frontend" / "src" / "api" / "demoSeed.json"


def build() -> dict:
    genres = [{"id": i, "name": name} for i, name in enumerate(GENRES, 1)]
    platforms = [{"id": i, "name": name, "manufacturer": maker} for i, (name, maker) in enumerate(PLATFORMS, 1)]
    genre_ids = {g["name"]: g["id"] for g in genres}
    platform_ids = {p["name"]: p["id"] for p in platforms}
    games = [
        {
            "id": i,
            "title": title,
            "description": description,
            "release_year": year,
            "developer": developer,
            "cover_url": None,
            "genre_id": genre_ids[genre],
            "platform_ids": [platform_ids[name] for name in platform_names],
            "created_by": None,
        }
        for i, (title, year, developer, genre, platform_names, description) in enumerate(GAMES, 1)
    ]
    return {"genres": genres, "platforms": platforms, "games": games}


if __name__ == "__main__":
    OUT.write_text(json.dumps(build(), ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print(f"Сохранено: {OUT}")
