def wish(client, auth, game_id, wish_type="buy", **extra):
    return client.post("/api/wishlist", json={"game_id": game_id, "wish_type": wish_type, **extra}, headers=auth)


def test_add_to_wishlist(client, auth, games, platforms):
    response = wish(client, auth, games["Elden Ring"]["id"], "buy", platform_id=platforms["PlayStation 5"])
    assert response.status_code == 201
    assert response.json()["wish_type"] == "buy"
    assert response.json()["platform"]["name"] == "PlayStation 5"


def test_wishlist_duplicate(client, auth, games):
    wish(client, auth, games["Elden Ring"]["id"], "buy")
    assert wish(client, auth, games["Elden Ring"]["id"], "play").status_code == 409


def test_wishlist_invalid_type(client, auth, games):
    assert wish(client, auth, games["Elden Ring"]["id"], "steal").status_code == 422


def test_wishlist_filter_by_type(client, auth, games):
    wish(client, auth, games["Elden Ring"]["id"], "buy")
    wish(client, auth, games["Portal 2"]["id"], "play")
    items = client.get("/api/wishlist", params={"wish_type": "play"}, headers=auth).json()
    assert [i["game"]["title"] for i in items] == ["Portal 2"]


def test_change_wish_type(client, auth, games):
    item = wish(client, auth, games["Elden Ring"]["id"], "buy").json()
    response = client.put(f"/api/wishlist/{item['id']}", json={"wish_type": "play"}, headers=auth)
    assert response.status_code == 200
    assert response.json()["wish_type"] == "play"


def test_move_to_collection(client, auth, games, platforms):
    item = wish(client, auth, games["Elden Ring"]["id"], "play").json()
    response = client.post(
        f"/api/wishlist/{item['id']}/move-to-collection",
        json={"platform_id": platforms["PC"], "status": "in_progress"},
        headers=auth,
    )
    assert response.status_code == 201
    assert response.json()["game"]["title"] == "Elden Ring"
    assert response.json()["status"] == "in_progress"
    assert client.get("/api/wishlist", headers=auth).json() == []
    assert len(client.get("/api/collection", headers=auth).json()) == 1


def test_move_to_collection_wrong_platform_keeps_wish(client, auth, games, platforms):
    item = wish(client, auth, games["Elden Ring"]["id"], "play").json()
    response = client.post(
        f"/api/wishlist/{item['id']}/move-to-collection",
        json={"platform_id": platforms["Nintendo Switch"]},
        headers=auth,
    )
    assert response.status_code == 422
    assert len(client.get("/api/wishlist", headers=auth).json()) == 1


def test_delete_wish(client, auth, games):
    item = wish(client, auth, games["Elden Ring"]["id"]).json()
    assert client.delete(f"/api/wishlist/{item['id']}", headers=auth).status_code == 204
    assert client.get("/api/wishlist", headers=auth).json() == []
