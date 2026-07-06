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


def test_admin_credit_adjustment_updates_balance_and_creates_transaction(client, db, make_user):
    from app.models.models import CreditTransaction

    admin = make_user(email="admin@example.com", role="admin")
    user = make_user(email="target@example.com", balance=500)

    response = client.post(
        f"/admin/users/{user.user_id}/credit-adjustment",
        params={"amount_cents": 200, "reason": "Support credit"},
        headers={"Authorization": f"Bearer {admin._raw_token}"},
    )
    assert response.status_code == 200
    assert response.json()["balance_cents"] == 700

    db.refresh(user)
    assert user.credit_balance_cents == 700

    txn = db.query(CreditTransaction).filter_by(user_id=user.user_id).first()
    assert txn.type == "admin_adjustment"
    assert txn.amount_cents == 200
    assert txn.description == "Support credit"


def test_admin_credit_adjustment_requires_reason(client, make_user):
    admin = make_user(email="admin@example.com", role="admin")
    user = make_user(email="target@example.com")

    response = client.post(
        f"/admin/users/{user.user_id}/credit-adjustment",
        params={"amount_cents": 100, "reason": ""},
        headers={"Authorization": f"Bearer {admin._raw_token}"},
    )
    assert response.status_code == 400


def test_admin_credit_adjustment_allows_negative_amount(client, db, make_user):
    from app.models.models import CreditTransaction

    admin = make_user(email="admin@example.com", role="admin")
    user = make_user(email="target@example.com", balance=500)

    response = client.post(
        f"/admin/users/{user.user_id}/credit-adjustment",
        params={"amount_cents": -150, "reason": "Correcting overcredit"},
        headers={"Authorization": f"Bearer {admin._raw_token}"},
    )
    assert response.status_code == 200
    assert response.json()["balance_cents"] == 350

    db.refresh(user)
    assert user.credit_balance_cents == 350

    txn = db.query(CreditTransaction).filter_by(user_id=user.user_id).first()
    assert txn.amount_cents == -150


def test_admin_credit_adjustment_404_for_unknown_user(client, make_user):
    admin = make_user(email="admin@example.com", role="admin")

    response = client.post(
        "/admin/users/does-not-exist/credit-adjustment",
        params={"amount_cents": 100, "reason": "test"},
        headers={"Authorization": f"Bearer {admin._raw_token}"},
    )
    assert response.status_code == 404


def test_admin_credit_adjustment_rejects_non_admin(client, make_user):
    user = make_user()
    target = make_user(email="target@example.com")

    response = client.post(
        f"/admin/users/{target.user_id}/credit-adjustment",
        params={"amount_cents": 100, "reason": "test"},
        headers={"Authorization": f"Bearer {user._raw_token}"},
    )
    assert response.status_code == 403


def test_admin_credit_adjustment_allows_zero_amount(client, db, make_user):
    from app.models.models import CreditTransaction

    admin = make_user(email="admin@example.com", role="admin")
    user = make_user(email="target@example.com", balance=500)

    response = client.post(
        f"/admin/users/{user.user_id}/credit-adjustment",
        params={"amount_cents": 0, "reason": "Note only, no balance change"},
        headers={"Authorization": f"Bearer {admin._raw_token}"},
    )
    assert response.status_code == 200
    assert response.json()["balance_cents"] == 500

    txn = db.query(CreditTransaction).filter_by(user_id=user.user_id).first()
    assert txn.amount_cents == 0


def test_admin_soft_delete_preserves_balance(client, db, make_user):
    admin = make_user(email="admin@example.com", role="admin")
    user = make_user(email="target@example.com", balance=300)

    response = client.post(
        f"/admin/users/{user.user_id}/soft-delete",
        headers={"Authorization": f"Bearer {admin._raw_token}"},
    )
    assert response.status_code == 200

    db.refresh(user)
    assert user.is_deleted is True
    assert user.credit_balance_cents == 300


def test_admin_reactivate_clears_deleted_flag(client, db, make_user):
    admin = make_user(email="admin@example.com", role="admin")
    user = make_user(email="target@example.com", is_deleted=True)

    response = client.post(
        f"/admin/users/{user.user_id}/reactivate",
        headers={"Authorization": f"Bearer {admin._raw_token}"},
    )
    assert response.status_code == 200

    db.refresh(user)
    assert user.is_deleted is False
    assert user.deleted_at is None


def test_admin_soft_delete_404_for_unknown_user(client, make_user):
    admin = make_user(email="admin@example.com", role="admin")
    response = client.post(
        "/admin/users/does-not-exist/soft-delete",
        headers={"Authorization": f"Bearer {admin._raw_token}"},
    )
    assert response.status_code == 404


def test_admin_reactivate_404_for_unknown_user(client, make_user):
    admin = make_user(email="admin@example.com", role="admin")
    response = client.post(
        "/admin/users/does-not-exist/reactivate",
        headers={"Authorization": f"Bearer {admin._raw_token}"},
    )
    assert response.status_code == 404


def test_admin_can_promote_user_to_admin(client, db, make_user):
    admin = make_user(email="admin@example.com", role="admin")
    user = make_user(email="target@example.com")

    response = client.post(
        f"/admin/users/{user.user_id}/role?role=admin",
        headers={"Authorization": f"Bearer {admin._raw_token}"},
    )
    assert response.status_code == 200

    db.refresh(user)
    assert user.role == "admin"


def test_admin_cannot_demote_self(client, make_user):
    admin = make_user(email="admin@example.com", role="admin")

    response = client.post(
        f"/admin/users/{admin.user_id}/role?role=user",
        headers={"Authorization": f"Bearer {admin._raw_token}"},
    )
    assert response.status_code == 400


def test_admin_role_change_rejects_invalid_role(client, make_user):
    admin = make_user(email="admin@example.com", role="admin")
    user = make_user(email="target@example.com")

    response = client.post(
        f"/admin/users/{user.user_id}/role?role=superuser",
        headers={"Authorization": f"Bearer {admin._raw_token}"},
    )
    assert response.status_code == 400


def test_admin_role_change_rejects_non_admin(client, make_user):
    user = make_user()
    target = make_user(email="target@example.com")

    response = client.post(
        f"/admin/users/{target.user_id}/role?role=admin",
        headers={"Authorization": f"Bearer {user._raw_token}"},
    )
    assert response.status_code == 403


def test_admin_role_change_404_for_unknown_user(client, make_user):
    admin = make_user(email="admin@example.com", role="admin")

    response = client.post(
        "/admin/users/does-not-exist/role?role=admin",
        headers={"Authorization": f"Bearer {admin._raw_token}"},
    )
    assert response.status_code == 404


def test_admin_lists_only_reported_trending_posts(client, db, make_user):
    from app.models.models import TrendingConversation

    admin = make_user(email="admin@example.com", role="admin")
    author = make_user(email="author@example.com")

    reported = TrendingConversation(
        user_id=author.user_id, title="Reported", description="d",
        reports=[{"reason": "spam"}],
    )
    clean = TrendingConversation(
        user_id=author.user_id, title="Clean", description="d",
        reports=[],
    )
    db.add_all([reported, clean])
    db.commit()

    response = client.get(
        "/admin/trending/reported",
        headers={"Authorization": f"Bearer {admin._raw_token}"},
    )
    assert response.status_code == 200
    titles = [item["title"] for item in response.json()["items"]]
    assert titles == ["Reported"]


def test_admin_can_delete_trending_post(client, db, make_user):
    from app.models.models import TrendingConversation

    admin = make_user(email="admin@example.com", role="admin")
    author = make_user(email="author@example.com")
    post = TrendingConversation(user_id=author.user_id, title="Bad post", description="d", reports=[{"reason": "spam"}])
    db.add(post)
    db.commit()
    post_id = post.id

    response = client.delete(
        f"/admin/trending/{post_id}",
        headers={"Authorization": f"Bearer {admin._raw_token}"},
    )
    assert response.status_code == 200
    assert db.query(TrendingConversation).filter_by(id=post_id).first() is None


def test_admin_delete_trending_404_for_unknown_post(client, make_user):
    admin = make_user(email="admin@example.com", role="admin")
    response = client.delete(
        "/admin/trending/does-not-exist",
        headers={"Authorization": f"Bearer {admin._raw_token}"},
    )
    assert response.status_code == 404
