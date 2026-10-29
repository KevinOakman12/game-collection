from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import get_db
from app.main import app


def test_database_unavailable_returns_503(client, tmp_path):
    # Файл базы данных в несуществующей папке: SQLite не может его открыть
    broken_engine = create_engine(f"sqlite:///{tmp_path / 'missing' / 'games.db'}")
    broken_session = sessionmaker(bind=broken_engine)

    def broken_get_db():
        db = broken_session()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = broken_get_db
    response = client.get("/api/platforms")
    assert response.status_code == 503
    assert response.json()["detail"] == "База данных временно недоступна. Повторите попытку позже"
