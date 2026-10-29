"""Общие фикстуры: отдельная БД в памяти для каждого теста и клиент API."""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, configure_sqlite_connection, get_db
from app.main import app
from app.seed import seed


@pytest.fixture
def db_session_factory():
    engine = create_engine(
        "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
    )
    event.listen(engine, "connect", configure_sqlite_connection)
    Base.metadata.create_all(bind=engine)
    factory = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)
    with factory() as session:
        seed(session)
    yield factory
    engine.dispose()


@pytest.fixture
def client(db_session_factory):
    def override_get_db():
        db = db_session_factory()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    # Клиент создаётся без контекстного менеджера, чтобы не трогать рабочую БД при старте приложения
    yield TestClient(app)
    app.dependency_overrides.clear()


def register_and_login(client: TestClient, username: str, password: str = "secret123") -> dict:
    """Регистрирует пользователя и возвращает заголовок авторизации."""
    response = client.post(
        "/api/auth/register",
        json={"username": username, "email": f"{username}@example.com", "password": password},
    )
    assert response.status_code == 201, response.text
    response = client.post("/api/auth/login", data={"username": username, "password": password})
    assert response.status_code == 200, response.text
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


@pytest.fixture
def auth(client):
    return register_and_login(client, "player1")


@pytest.fixture
def platforms(client) -> dict[str, int]:
    return {p["name"]: p["id"] for p in client.get("/api/platforms").json()}


@pytest.fixture
def games(client) -> dict[str, dict]:
    response = client.get("/api/games", params={"page_size": 100})
    return {g["title"]: g for g in response.json()["items"]}
