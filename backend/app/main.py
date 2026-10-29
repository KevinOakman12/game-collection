"""Точка входа серверной части: создание приложения FastAPI и обработчики ошибок."""
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.exc import IntegrityError, OperationalError

from .config import CORS_ORIGINS
from .database import init_db
from .routers import auth, catalog, collection, games, stats, wishlist

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logger = logging.getLogger("games")


@asynccontextmanager
async def lifespan(_app: FastAPI):
    try:
        init_db()
    except OperationalError:
        # Сервер продолжает работу: на каждый запрос к БД будет возвращаться ответ 503,
        # а после восстановления доступа к файлу базы данных запросы снова выполнятся
        logger.error("Сервер запущен без подключения к базе данных")
    yield


app = FastAPI(
    title="Учёт игровой коллекции и прогресса",
    description="REST API для ведения личной коллекции игр, прогресса прохождения и списка желаемого",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(RequestValidationError)
async def validation_error_handler(_request: Request, exc: RequestValidationError):
    """Ошибки проверки входных данных: общее сообщение и список полей с ошибками."""
    errors = [
        {"field": ".".join(str(part) for part in error["loc"][1:]), "message": error["msg"]}
        for error in exc.errors()
    ]
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
        content={"detail": "Проверьте правильность заполнения полей", "errors": errors},
    )


@app.exception_handler(IntegrityError)
async def integrity_error_handler(request: Request, exc: IntegrityError):
    """Нарушение ограничений БД (уникальность, внешний ключ), не перехваченное проверками в коде."""
    logger.warning("Нарушение целостности данных при %s %s: %s", request.method, request.url.path, exc.orig)
    return JSONResponse(
        status_code=status.HTTP_409_CONFLICT,
        content={"detail": "Операция нарушает целостность данных"},
    )


@app.exception_handler(OperationalError)
async def database_unavailable_handler(request: Request, exc: OperationalError):
    """База данных недоступна (файл заблокирован, повреждён или удалён)."""
    logger.error("Ошибка базы данных при %s %s: %s", request.method, request.url.path, exc.orig)
    return JSONResponse(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        content={"detail": "База данных временно недоступна. Повторите попытку позже"},
    )


app.include_router(auth.router)
app.include_router(catalog.router)
app.include_router(games.router)
app.include_router(collection.router)
app.include_router(wishlist.router)
app.include_router(stats.router)


@app.get("/api/health", tags=["Служебное"])
def health():
    return {"status": "ok"}
