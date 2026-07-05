def test_make_user_defaults_to_user_role(make_user):
    user = make_user()
    assert user.role == "user"


def test_make_user_can_be_created_as_admin(make_user):
    admin = make_user(email="admin@example.com", role="admin")
    assert admin.role == "admin"


def test_app_setting_helpers_roundtrip(db):
    from app.models.models import get_active_model, set_active_model

    assert get_active_model(db, default="openai/gpt-4o-mini") == "openai/gpt-4o-mini"

    set_active_model(db, "anthropic/claude-3-haiku")
    assert get_active_model(db, default="openai/gpt-4o-mini") == "anthropic/claude-3-haiku"


def test_admin_users_rejects_non_admin(client, make_user):
    user = make_user()
    response = client.get("/admin/users", headers={"Authorization": f"Bearer {user._raw_token}"})
    assert response.status_code == 403


def test_admin_users_rejects_invalid_token(client):
    response = client.get("/admin/users", headers={"Authorization": "Bearer garbage"})
    assert response.status_code == 401


def test_admin_users_lists_and_paginates(client, make_user):
    admin = make_user(email="admin@example.com", role="admin")
    for i in range(3):
        make_user(email=f"user{i}@example.com")

    response = client.get(
        "/admin/users?page=1&page_size=2",
        headers={"Authorization": f"Bearer {admin._raw_token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 4
    assert len(data["items"]) == 2
    assert data["page"] == 1


def test_admin_users_search_filters_by_email(client, make_user):
    admin = make_user(email="admin@example.com", role="admin")
    make_user(email="alice@example.com")
    make_user(email="bob@example.com")

    response = client.get(
        "/admin/users?search=alice",
        headers={"Authorization": f"Bearer {admin._raw_token}"},
    )
    data = response.json()
    assert data["total"] == 1
    assert data["items"][0]["email"] == "alice@example.com"


def test_admin_user_detail_includes_transactions(client, db, make_user):
    from app.models.models import CreditTransaction

    admin = make_user(email="admin@example.com", role="admin")
    user = make_user(email="target@example.com", balance=750)
    db.add(CreditTransaction(user_id=user.user_id, amount_cents=750, type="purchase", description="Starter pack"))
    db.commit()

    response = client.get(
        f"/admin/users/{user.user_id}",
        headers={"Authorization": f"Bearer {admin._raw_token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "target@example.com"
    assert len(data["recent_transactions"]) == 1
    assert data["recent_transactions"][0]["type"] == "purchase"


def test_admin_user_detail_404_for_unknown_user(client, make_user):
    admin = make_user(email="admin@example.com", role="admin")
    response = client.get(
        "/admin/users/does-not-exist",
        headers={"Authorization": f"Bearer {admin._raw_token}"},
    )
    assert response.status_code == 404
