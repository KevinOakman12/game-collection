from app.seed import GAMES
from tests.conftest import register_and_login


def custom_game(platform_id: int, title: str = "Моя инди-игра") -> dict:
    return {"title": title, "release_year": 2024, "platform_ids": [platform_id]}


def test_guest_sees_public_library(client):
    response = client.get("/api/games", params={"page_size": 100})
    assert response.status_code == 200
    body = response.json()
    assert body["total"] == len(GAMES)
    assert all(not game["is_custom"] for game in body["items"])


def test_pagination(client):
    first = client.get("/api/games", params={"page": 1, "page_size": 10}).json()
    last = client.get("/api/games", params={"page": 3, "page_size": 10}).json()
    assert len(first["items"]) == 10
    assert len(last["items"]) == len(GAMES) - 20
    assert first["items"][0]["title"] != last["items"][0]["title"]


def test_search_by_title_case_insensitive(client):
    titles = [g["title"] for g in client.get("/api/games", params={"search": "WITCHER"}).json()["items"]]
    assert titles == ["The Witcher 3: Wild Hunt"]


def test_search_cyrillic_title_case_insensitive(client, auth, platforms):
    client.post("/api/games", json=custom_game(platforms["PC"], "Тетрис"), headers=auth)
    response = client.get("/api/games", params={"search": "тетрис"}, headers=auth)
    assert [g["title"] for g in response.json()["items"]] == ["Тетрис"]


def test_search_with_special_characters(client):
    response = client.get("/api/games", params={"search": "%"})
    assert response.status_code == 200
    assert response.json()["total"] == 0


def test_filter_by_platform(client, platforms):
    switch_id = platforms["Nintendo Switch"]
    items = client.get("/api/games", params={"platform_id": switch_id, "page_size": 100}).json()["items"]
    expected = sum(1 for game in GAMES if "Nintendo Switch" in game[4])
    assert len(items) == expected
    assert all(any(p["id"] == switch_id for p in game["platforms"]) for game in items)


def test_filter_by_genre(client):
    genre_id = next(g["id"] for g in client.get("/api/genres").json() if g["name"] == "Гонки")
    items = client.get("/api/games", params={"genre_id": genre_id}).json()["items"]
    assert {g["title"] for g in items} == {"Forza Horizon 5", "Gran Turismo 7", "Mario Kart 8 Deluxe"}


def test_get_missing_game(client):
    assert client.get("/api/games/99999").status_code == 404


def test_custom_game_visible_only_to_author(client, auth, platforms):
    response = client.post("/api/games", json=custom_game(platforms["PC"]), headers=auth)
    assert response.status_code == 201
    game = response.json()
    assert game["is_custom"] is True

    other = register_and_login(client, "player2")
    assert client.get(f"/api/games/{game['id']}", headers=auth).status_code == 200
    assert client.get(f"/api/games/{game['id']}", headers=other).status_code == 404
    assert client.get(f"/api/games/{game['id']}").status_code == 404


def test_guest_cannot_create_game(client, platforms):
    assert client.post("/api/games", json=custom_game(platforms["PC"])).status_code == 401


def test_create_game_requires_platform(client, auth):
    response = client.post("/api/games", json={"title": "Без платформы", "platform_ids": []}, headers=auth)
    assert response.status_code == 422


def test_create_game_rejects_bad_cover_url(client, auth, platforms):
    data = custom_game(platforms["PC"]) | {"cover_url": "javascript:alert(1)"}
    assert client.post("/api/games", json=data, headers=auth).status_code == 422


def test_create_game_rejects_blank_title(client, auth, platforms):
    data = custom_game(platforms["PC"]) | {"title": "   "}
    assert client.post("/api/games", json=data, headers=auth).status_code == 422


def test_update_own_custom_game(client, auth, platforms):
    game = client.post("/api/games", json=custom_game(platforms["PC"]), headers=auth).json()
    response = client.put(
        f"/api/games/{game['id']}",
        json={"title": "Новое название", "cover_url": "https://example.com/cover.png"},
        headers=auth,
    )
    assert response.status_code == 200
    assert response.json()["title"] == "Новое название"
    assert response.json()["cover_url"] == "https://example.com/cover.png"


def test_cannot_update_public_game(client, auth, games):
    game_id = games["Celeste"]["id"]
    response = client.put(f"/api/games/{game_id}", json={"title": "Взлом"}, headers=auth)
    assert response.status_code == 403


def test_cannot_remove_platform_used_in_collection(client, auth, platforms):
    data = {"title": "Мультиплатформа", "platform_ids": [platforms["PC"], platforms["Android"]]}
    game = client.post("/api/games", json=data, headers=auth).json()
    client.post("/api/collection", json={"game_id": game["id"], "platform_id": platforms["PC"]}, headers=auth)
    response = client.put(
        f"/api/games/{game['id']}", json={"platform_ids": [platforms["Android"]]}, headers=auth
    )
    assert response.status_code == 409


def test_delete_custom_game_cascades_to_collection(client, auth, platforms):
    game = client.post("/api/games", json=custom_game(platforms["PC"]), headers=auth).json()
    client.post("/api/collection", json={"game_id": game["id"], "platform_id": platforms["PC"]}, headers=auth)
    assert len(client.get("/api/collection", headers=auth).json()) == 1

    assert client.delete(f"/api/games/{game['id']}", headers=auth).status_code == 204
    assert client.get("/api/collection", headers=auth).json() == []
