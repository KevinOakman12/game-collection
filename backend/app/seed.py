"""Начальное наполнение публичной библиотеки: жанры, платформы и игры.

Запуск из папки backend:  python -m app.seed
Повторный запуск безопасен — существующие записи не дублируются.
"""
from sqlalchemy.orm import Session

from .database import SessionLocal, init_db
from .models import Game, Genre, Platform

GENRES = [
    "Экшен", "Ролевая игра", "Приключения", "Шутер", "Стратегия",
    "Платформер", "Гонки", "Симулятор", "Головоломка", "Песочница",
]

PLATFORMS = [
    ("PC", None),
    ("PlayStation 4", "Sony"),
    ("PlayStation 5", "Sony"),
    ("Xbox One", "Microsoft"),
    ("Xbox Series X|S", "Microsoft"),
    ("Nintendo Switch", "Nintendo"),
    ("Android", "Google"),
    ("iOS", "Apple"),
]

PC, PS4, PS5, XONE, XSX, SWITCH, ANDROID, IOS = (name for name, _ in PLATFORMS)

# (название, год выхода, разработчик, жанр, платформы, описание)
GAMES = [
    ("The Witcher 3: Wild Hunt", 2015, "CD Projekt Red", "Ролевая игра", [PC, PS4, PS5, XONE, XSX, SWITCH],
     "Ролевая игра с открытым миром о ведьмаке Геральте из Ривии."),
    ("Cyberpunk 2077", 2020, "CD Projekt Red", "Ролевая игра", [PC, PS4, PS5, XONE, XSX],
     "Ролевая игра в открытом мире мегаполиса Найт-Сити."),
    ("Elden Ring", 2022, "FromSoftware", "Ролевая игра", [PC, PS4, PS5, XONE, XSX],
     "Ролевая экшен-игра с открытым миром Междуземья."),
    ("Dark Souls III", 2016, "FromSoftware", "Ролевая игра", [PC, PS4, XONE],
     "Ролевая экшен-игра с высокой сложностью сражений."),
    ("Red Dead Redemption 2", 2018, "Rockstar Games", "Экшен", [PC, PS4, XONE],
     "Приключенческий вестерн с открытым миром."),
    ("Grand Theft Auto V", 2013, "Rockstar North", "Экшен", [PC, PS4, PS5, XONE, XSX],
     "Экшен с открытым миром о трёх главных героях."),
    ("The Legend of Zelda: Breath of the Wild", 2017, "Nintendo", "Приключения", [SWITCH],
     "Приключенческая игра с открытым миром королевства Хайрул."),
    ("The Legend of Zelda: Tears of the Kingdom", 2023, "Nintendo", "Приключения", [SWITCH],
     "Продолжение Breath of the Wild с новыми механиками строительства."),
    ("Super Mario Odyssey", 2017, "Nintendo", "Платформер", [SWITCH],
     "Трёхмерный платформер о путешествии Марио по разным королевствам."),
    ("Hollow Knight", 2017, "Team Cherry", "Платформер", [PC, PS4, XONE, SWITCH],
     "Двухмерный платформер в жанре метроидвания."),
    ("Celeste", 2018, "Maddy Makes Games", "Платформер", [PC, PS4, XONE, SWITCH],
     "Сложный двухмерный платформер о восхождении на гору."),
    ("Stardew Valley", 2016, "ConcernedApe", "Симулятор", [PC, PS4, XONE, SWITCH, ANDROID, IOS],
     "Симулятор фермерской жизни."),
    ("Minecraft", 2011, "Mojang Studios", "Песочница", [PC, PS4, XONE, SWITCH, ANDROID, IOS],
     "Игра-песочница о строительстве и выживании в мире из блоков."),
    ("Terraria", 2011, "Re-Logic", "Песочница", [PC, PS4, XONE, SWITCH, ANDROID, IOS],
     "Двухмерная игра-песочница с исследованием и строительством."),
    ("Hades", 2020, "Supergiant Games", "Экшен", [PC, PS4, PS5, XONE, XSX, SWITCH],
     "Экшен с элементами roguelike о побеге из подземного царства."),
    ("God of War", 2018, "Santa Monica Studio", "Экшен", [PC, PS4],
     "Экшен-приключение о Кратосе и его сыне в мире скандинавской мифологии."),
    ("Marvel's Spider-Man", 2018, "Insomniac Games", "Экшен", [PC, PS4],
     "Экшен с открытым миром о Человеке-пауке в Нью-Йорке."),
    ("Baldur's Gate 3", 2023, "Larian Studios", "Ролевая игра", [PC, PS5, XSX],
     "Ролевая игра по правилам Dungeons & Dragons."),
    ("Portal 2", 2011, "Valve", "Головоломка", [PC, SWITCH],
     "Головоломка от первого лица с порталами."),
    ("Half-Life 2", 2004, "Valve", "Шутер", [PC],
     "Шутер от первого лица о Гордоне Фримене."),
    ("DOOM Eternal", 2020, "id Software", "Шутер", [PC, PS4, PS5, XONE, XSX, SWITCH],
     "Динамичный шутер от первого лица."),
    ("Counter-Strike 2", 2023, "Valve", "Шутер", [PC],
     "Командный многопользовательский шутер."),
    ("Sid Meier's Civilization VI", 2016, "Firaxis Games", "Стратегия", [PC, PS4, XONE, SWITCH],
     "Пошаговая глобальная стратегия о развитии цивилизации."),
    ("StarCraft II: Wings of Liberty", 2010, "Blizzard Entertainment", "Стратегия", [PC],
     "Стратегия в реальном времени в научно-фантастическом сеттинге."),
    ("Forza Horizon 5", 2021, "Playground Games", "Гонки", [PC, XONE, XSX],
     "Гоночная игра с открытым миром Мексики."),
    ("Gran Turismo 7", 2022, "Polyphony Digital", "Гонки", [PS4, PS5],
     "Автосимулятор с большой коллекцией автомобилей."),
    ("Mario Kart 8 Deluxe", 2017, "Nintendo", "Гонки", [SWITCH],
     "Аркадные гонки на картах с персонажами Nintendo."),
    ("Disco Elysium", 2019, "ZA/UM", "Ролевая игра", [PC, PS4, PS5, XONE, XSX, SWITCH],
     "Детективная ролевая игра с упором на диалоги."),
    ("Genshin Impact", 2020, "miHoYo", "Ролевая игра", [PC, PS4, PS5, ANDROID, IOS],
     "Ролевая экшен-игра с открытым миром."),
    ("Stray", 2022, "BlueTwelve Studio", "Приключения", [PC, PS4, PS5],
     "Приключенческая игра о бездомном коте в городе роботов."),
]


def seed(db: Session) -> int:
    """Добавляет недостающие жанры, платформы и игры. Возвращает число добавленных игр."""
    genres = {g.name: g for g in db.query(Genre).all()}
    for name in GENRES:
        if name not in genres:
            genres[name] = Genre(name=name)
            db.add(genres[name])

    platforms = {p.name: p for p in db.query(Platform).all()}
    for name, manufacturer in PLATFORMS:
        if name not in platforms:
            platforms[name] = Platform(name=name, manufacturer=manufacturer)
            db.add(platforms[name])
    db.flush()

    existing_titles = {title for (title,) in db.query(Game.title).filter(Game.created_by.is_(None))}
    added = 0
    for title, year, developer, genre, platform_names, description in GAMES:
        if title in existing_titles:
            continue
        db.add(Game(
            title=title,
            release_year=year,
            developer=developer,
            description=description,
            genre=genres[genre],
            platforms=[platforms[name] for name in platform_names],
        ))
        added += 1
    db.commit()
    return added


if __name__ == "__main__":
    init_db()
    with SessionLocal() as session:
        count = seed(session)
    print(f"Библиотека заполнена, добавлено игр: {count}")
