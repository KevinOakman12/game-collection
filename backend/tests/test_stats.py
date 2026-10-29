from app.routers.stats import completion_percent


def test_completion_percent():
    assert completion_percent(0, 0) == 0.0
    assert completion_percent(1, 3) == 33.3
    assert completion_percent(4, 4) == 100.0


def test_stats_for_empty_collection(client, auth):
    stats = client.get("/api/stats", headers=auth).json()
    assert stats["total_games"] == 0
    assert stats["completed_games"] == 0
    assert stats["total_hours"] == 0
    assert stats["completion_percent"] == 0
    assert stats["by_platform"] == []
    assert stats["top_by_hours"] == []
    assert {s["status"]: s["count"] for s in stats["by_status"]} == {
        "not_started": 0, "in_progress": 0, "completed": 0, "abandoned": 0,
    }


def test_stats_calculation(client, auth, games, platforms):
    entries = [
        ("Hades", "PC", "completed", 40),
        ("Celeste", "PC", "completed", 10.5),
        ("Stray", "PlayStation 5", "in_progress", 3),
        ("Elden Ring", "PlayStation 5", "abandoned", 0),
    ]
    for title, platform, status, hours in entries:
        client.post(
            "/api/collection",
            json={"game_id": games[title]["id"], "platform_id": platforms[platform], "status": status, "hours_played": hours},
            headers=auth,
        )
    client.post("/api/wishlist", json={"game_id": games["Portal 2"]["id"], "wish_type": "buy"}, headers=auth)

    stats = client.get("/api/stats", headers=auth).json()
    assert stats["total_games"] == 4
    assert stats["completed_games"] == 2
    assert stats["total_hours"] == 53.5
    assert stats["completion_percent"] == 50.0
    assert stats["wishlist_count"] == 1
    assert stats["by_platform"] == [
        {"platform": "PC", "count": 2, "hours": 50.5},
        {"platform": "PlayStation 5", "count": 2, "hours": 3.0},
    ]
    assert [g["title"] for g in stats["top_by_hours"]] == ["Hades", "Celeste", "Stray"]


def test_stats_are_per_user(client, auth, games, platforms):
    from tests.conftest import register_and_login

    client.post("/api/collection", json={"game_id": games["Hades"]["id"], "platform_id": platforms["PC"]}, headers=auth)
    other = register_and_login(client, "player2")
    assert client.get("/api/stats", headers=other).json()["total_games"] == 0


def test_stats_require_auth(client):
    assert client.get("/api/stats").status_code == 401
