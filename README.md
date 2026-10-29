# Игровая полка — учёт игровой коллекции и прогресса

Веб-приложение для ведения личной коллекции видеоигр: статус прохождения и затраченные часы, список желаемого и статистика по коллекции.

**Демо-версия:** https://kevinoakman12.github.io/game-collection/

Демо-версия работает без сервера: тот же интерфейс, но учётные записи и коллекция хранятся в `localStorage` браузера. Полная версия состоит из сервера на FastAPI с базой SQLite и клиента на React.

## Возможности

- Гость: просмотр библиотеки игр, поиск по названию, фильтры по платформе и жанру, карточка игры, регистрация и вход.
- Зарегистрированный пользователь:
  - коллекция с выбором платформы;
  - статусы «не начата», «в процессе», «пройдена», «заброшена» и затраченные часы;
  - поиск, фильтрация и сортировка коллекции;
  - ручное добавление игр, которых нет в библиотеке;
  - список желаемого («хочу купить», «хочу сыграть») с переносом игры в коллекцию;
  - статистика с диаграммами.

## Технологии

- **Сервер:** Python, FastAPI, SQLAlchemy, SQLite, Pydantic, bcrypt, JWT (PyJWT), pytest.
- **Клиент:** React, React Router, Ant Design, Axios, Recharts, Vite.

## Структура

```
backend/
  app/
    main.py          — приложение FastAPI, обработчики ошибок
    database.py      — подключение к SQLite
    models.py        — ORM-модели (7 таблиц)
    schemas.py       — схемы Pydantic
    security.py      — хеширование паролей, токены JWT
    deps.py          — текущий пользователь, видимость игр
    routers/         — auth, catalog, games, collection, wishlist, stats
    seed.py          — начальное наполнение библиотеки (30 игр, 8 платформ, 10 жанров)
  tests/             — автотесты API (59 тестов)
frontend/
  src/
    api/             — клиент Axios; demoBackend.js — демо-режим без сервера
    components/, hooks/, pages/, context/
.github/workflows/   — тесты и публикация демо-версии на GitHub Pages
```

## Запуск

Требуется Python 3.12+ и Node.js 20+.

### Сервер

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate          # Linux/macOS: source .venv/bin/activate
pip install -r requirements.txt
python -m app.seed
uvicorn app.main:app --reload --port 8000
```

Документация API: http://127.0.0.1:8000/docs

### Клиент

```bash
cd frontend
npm install
npm run dev
```

Приложение откроется по адресу http://localhost:5173. Запросы к `/api` проксируются на сервер.

### Демо-режим локально

```bash
cd frontend
VITE_DEMO_MODE=true npm run build
npm run preview
```

Начальные данные демо-версии (`frontend/src/api/demoSeed.json`) выгружаются из `seed.py` командой `python -m app.export_demo_seed` в папке `backend`.

## Тесты

```bash
cd backend
python -m pytest -v
```

При каждом push в ветку `main` GitHub Actions запускает автотесты, собирает демо-версию и публикует её на GitHub Pages.
