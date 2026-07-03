import pytest
from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient
from app.main import app
from app.models.models import User
from app.api.dependencies import get_current_user
from app.core.database import get_db

client = TestClient(app)

def make_user(message_count=0):
    return User(
        user_id="test-user-id",
        email="test@example.com",
        given_name="Test",
        token="hashed",
        message_count=message_count,
        credit_balance_cents=500.0,
        is_deleted=False,
    )

def test_protected_returns_free_tier_for_new_user():
    user = make_user(message_count=3)
    db = MagicMock()
    db.query.return_value.filter_by.return_value.count.return_value = 0

    app.dependency_overrides[get_current_user] = lambda: user
    app.dependency_overrides[get_db] = lambda: db
    try:
        response = client.get("/user/protected", headers={"Authorization": "Bearer fake"})
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 200
    data = response.json()
    assert data["is_free_tier"] is True
    assert data["free_messages_remaining"] == 7

def test_protected_returns_paid_tier_after_purchase():
    user = make_user(message_count=5)
    db = MagicMock()
    db.query.return_value.filter_by.return_value.count.return_value = 1

    app.dependency_overrides[get_current_user] = lambda: user
    app.dependency_overrides[get_db] = lambda: db
    try:
        response = client.get("/user/protected", headers={"Authorization": "Bearer fake"})
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 200
    data = response.json()
    assert data["is_free_tier"] is False
    assert data["free_messages_remaining"] == 5

def test_openai_answer_blocks_non_free_model_for_free_tier():
    user = make_user(message_count=2)
    user.credit_balance_cents = 500.0
    db = MagicMock()
    db.query.return_value.filter_by.return_value.count.return_value = 0  # no purchases

    app.dependency_overrides[get_current_user] = lambda: user
    app.dependency_overrides[get_db] = lambda: db
    try:
        response = client.post(
            "/openai/answer",
            params={"question": "hi", "user_id": "test-user-id", "model": "anthropic/claude-sonnet-4.5"},
            headers={"Authorization": "Bearer fake"},
        )
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 403
    assert "gpt-4o-mini" in response.json()["detail"]

def test_openai_answer_allows_gpt4o_mini_for_free_tier():
    user = make_user(message_count=2)
    user.credit_balance_cents = 500.0
    conv = MagicMock()
    conv.id = "conv-id"
    conv.user_id = "test-user-id"
    db = MagicMock()
    db.query.return_value.filter_by.return_value.count.return_value = 0  # no purchases
    db.query.return_value.filter.return_value.first.return_value = conv
    db.query.return_value.filter.return_value.all.return_value = []

    app.dependency_overrides[get_current_user] = lambda: user
    app.dependency_overrides[get_db] = lambda: db
    try:
        with patch("app.utils.ai.call_openrouter", return_value=("reply", 0.001)):
            response = client.post(
                "/openai/answer",
                params={"question": "hi", "user_id": "test-user-id", "model": "openai/gpt-4o-mini"},
                headers={"Authorization": "Bearer fake"},
            )
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 200
