from tests.conftest import register_and_login


def add(client, auth, game_id, platform_id, **extra):
    return client.post(
        "/api/collection", json={"game_id": game_id, "platform_id": platform_id, **extra}, headers=auth
    )


def test_add_game_to_collection(client, auth, games, platforms):
    response = add(client, auth, games["Hades"]["id"], platforms["PC"], status="in_progress", hours_played=12.5)
    assert response.status_code == 201
    item = response.json()
    assert item["game"]["title"] == "Hades"
    assert item["platform"]["name"] == "PC"
    assert item["status"] == "in_progress"
    assert item["hours_played"] == 12.5


def test_default_status_is_not_started(client, auth, games, platforms):
    item = add(client, auth, games["Hades"]["id"], platforms["PC"]).json()
    assert item["status"] == "not_started"
    assert item["hours_played"] == 0


def test_same_game_on_two_platforms(client, auth, games, platforms):
    game_id = games["Hades"]["id"]
    assert add(client, auth, game_id, platforms["PC"]).status_code == 201
    assert add(client, auth, game_id, platforms["Nintendo Switch"]).status_code == 201


def test_duplicate_game_and_platform(client, auth, games, platforms):
    game_id = games["Hades"]["id"]
    add(client, auth, game_id, platforms["PC"])
    response = add(client, auth, game_id, platforms["PC"])
    assert response.status_code == 409


def test_platform_must_belong_to_game(client, auth, games, platforms):
    response = add(client, auth, games["Half-Life 2"]["id"], platforms["Nintendo Switch"])
    assert response.status_code == 422
    assert response.json()["detail"] == "Игра не выпускалась на выбранной платформе"


def test_negative_hours_rejected(client, auth, games, platforms):
    response = add(client, auth, games["Hades"]["id"], platforms["PC"], hours_played=-5)
    assert response.status_code == 422
    assert response.json()["errors"][0]["field"] == "hours_played"


def test_unknown_status_rejected(client, auth, games, platforms):
    response = add(client, auth, games["Hades"]["id"], platforms["PC"], status="finished")
    assert response.status_code == 422


def test_guest_has_no_collection(client, games, platforms):
    assert client.get("/api/collection").status_code == 401
    response = client.post("/api/collection", json={"game_id": games["Hades"]["id"], "platform_id": platforms["PC"]})
    assert response.status_code == 401


def test_update_progress(client, auth, games, platforms):
    item = add(client, auth, games["Celeste"]["id"], platforms["PC"]).json()
    response = client.put(
        f"/api/collection/{item['id']}", json={"status": "completed", "hours_played": 9}, headers=auth
    )
    assert response.status_code == 200
    assert response.json()["status"] == "completed"
    assert response.json()["hours_played"] == 9


def test_update_rejects_null_status(client, auth, games, platforms):
    item = add(client, auth, games["Celeste"]["id"], platforms["PC"]).json()
    response = client.put(f"/api/collection/{item['id']}", json={"status": None}, headers=auth)
    assert response.status_code == 422


def test_change_platform_to_duplicate(client, auth, games, platforms):
    game_id = games["Celeste"]["id"]
    add(client, auth, game_id, platforms["PC"])
    item = add(client, auth, game_id, platforms["Nintendo Switch"]).json()
    response = client.put(f"/api/collection/{item['id']}", json={"platform_id": platforms["PC"]}, headers=auth)
    assert response.status_code == 409


def test_user_data_is_isolated(client, auth, games, platforms):
    item = add(client, auth, games["Celeste"]["id"], platforms["PC"]).json()
    other = register_and_login(client, "player2")

    assert client.get("/api/collection", headers=other).json() == []
    assert client.get(f"/api/collection/{item['id']}", headers=other).status_code == 404
    assert client.put(f"/api/collection/{item['id']}", json={"hours_played": 1}, headers=other).status_code == 404
    assert client.delete(f"/api/collection/{item['id']}", headers=other).status_code == 404


def test_filter_and_search_collection(client, auth, games, platforms):
    add(client, auth, games["Hades"]["id"], platforms["PC"], status="completed")
    add(client, auth, games["Celeste"]["id"], platforms["Nintendo Switch"], status="in_progress")
    add(client, auth, games["Stray"]["id"], platforms["PC"], status="completed")

    completed = client.get("/api/collection", params={"status": "completed", "sort": "title", "order": "asc"}, headers=auth)
    assert [i["game"]["title"] for i in completed.json()] == ["Hades", "Stray"]

    on_switch = client.get("/api/collection", params={"platform_id": platforms["Nintendo Switch"]}, headers=auth)
    assert [i["game"]["title"] for i in on_switch.json()] == ["Celeste"]

    found = client.get("/api/collection", params={"search": "str"}, headers=auth)
    assert [i["game"]["title"] for i in found.json()] == ["Stray"]


def test_sort_by_hours(client, auth, games, platforms):
    add(client, auth, games["Hades"]["id"], platforms["PC"], hours_played=40)
    add(client, auth, games["Celeste"]["id"], platforms["PC"], hours_played=10)
    add(client, auth, games["Stray"]["id"], platforms["PC"], hours_played=25)
    items = client.get("/api/collection", params={"sort": "hours", "order": "desc"}, headers=auth).json()
    assert [i["hours_played"] for i in items] == [40, 25, 10]


def test_delete_from_collection(client, auth, games, platforms):
    item = add(client, auth, games["Hades"]["id"], platforms["PC"]).json()
    assert client.delete(f"/api/collection/{item['id']}", headers=auth).status_code == 204
    assert client.get("/api/collection", headers=auth).json() == []
