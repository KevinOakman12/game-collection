from tests.conftest import register_and_login


def test_register_success(client):
    response = client.post(
        "/api/auth/register",
        json={"username": "new_user", "email": "New@Example.com", "password": "secret123"},
    )
    assert response.status_code == 201
    body = response.json()
    assert body["username"] == "new_user"
    assert body["email"] == "new@example.com"
    assert "password" not in body and "password_hash" not in body


def test_register_duplicate_username_case_insensitive(client):
    register_and_login(client, "player")
    response = client.post(
        "/api/auth/register",
        json={"username": "PLAYER", "email": "other@example.com", "password": "secret123"},
    )
    assert response.status_code == 409
    assert "логином" in response.json()["detail"]


def test_register_duplicate_email(client):
    register_and_login(client, "player")
    response = client.post(
        "/api/auth/register",
        json={"username": "another", "email": "player@example.com", "password": "secret123"},
    )
    assert response.status_code == 409
    assert "email" in response.json()["detail"]


def test_register_invalid_email(client):
    response = client.post(
        "/api/auth/register", json={"username": "user", "email": "not-an-email", "password": "secret123"}
    )
    assert response.status_code == 422
    assert response.json()["errors"][0]["field"] == "email"


def test_register_short_password(client):
    response = client.post(
        "/api/auth/register", json={"username": "user", "email": "u@example.com", "password": "123"}
    )
    assert response.status_code == 422


def test_register_cyrillic_password_over_72_bytes(client):
    response = client.post(
        "/api/auth/register", json={"username": "user", "email": "u@example.com", "password": "п" * 40}
    )
    assert response.status_code == 422


def test_register_invalid_username_characters(client):
    response = client.post(
        "/api/auth/register", json={"username": "игрок 1", "email": "u@example.com", "password": "secret123"}
    )
    assert response.status_code == 422


def test_login_by_username_and_email(client):
    register_and_login(client, "player")
    by_name = client.post("/api/auth/login", data={"username": "Player", "password": "secret123"})
    by_email = client.post("/api/auth/login", data={"username": "player@example.com", "password": "secret123"})
    assert by_name.status_code == 200
    assert by_email.status_code == 200
    assert by_name.json()["token_type"] == "bearer"


def test_login_wrong_password(client):
    register_and_login(client, "player")
    response = client.post("/api/auth/login", data={"username": "player", "password": "wrong-pass"})
    assert response.status_code == 401
    assert response.json()["detail"] == "Неверный логин или пароль"


def test_login_unknown_user(client):
    response = client.post("/api/auth/login", data={"username": "nobody", "password": "secret123"})
    assert response.status_code == 401


def test_me_requires_token(client):
    assert client.get("/api/auth/me").status_code == 401


def test_me_with_invalid_token(client):
    response = client.get("/api/auth/me", headers={"Authorization": "Bearer broken.token.value"})
    assert response.status_code == 401


def test_me_with_valid_token(client, auth):
    response = client.get("/api/auth/me", headers=auth)
    assert response.status_code == 200
    assert response.json()["username"] == "player1"
