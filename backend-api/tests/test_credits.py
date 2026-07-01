import pytest
from unittest.mock import MagicMock, patch


def make_openrouter_response(content="Answer", cost=0.0234):
    response = MagicMock()
    response.choices[0].message.content = content
    response.usage.cost = cost
    return response


def test_cost_cents_rounding():
    from app.utils.ai import cost_to_cents
    assert cost_to_cents(0.0234) == 2
    assert cost_to_cents(0.005) == 1   # rounds up, not 0
    assert cost_to_cents(0.0) == 0
    assert cost_to_cents(0.01) == 1


def test_call_openrouter_returns_content_and_cost(monkeypatch):
    from app.utils import ai as ai_module
    mock_response = make_openrouter_response(content="Hello", cost=0.01)
    mock_client = MagicMock()
    mock_client.chat.completions.create.return_value = mock_response
    monkeypatch.setattr(ai_module, "client", mock_client)

    from app.utils.ai import call_openrouter
    content, cost_cents = call_openrouter(messages=[{"role": "user", "content": "hi"}])
    assert content == "Hello"
    assert cost_cents == 1


def test_new_user_gets_free_credits(db):
    from app.models.models import User, CreditTransaction
    import os
    os.environ["FREE_CREDITS_CENTS"] = "500"

    from app.api.endpoints.user import _create_user_with_grant
    user = _create_user_with_grant(db, email="new@example.com", given_name="Alice", token_hash="abc123")

    assert user.credit_balance_cents == 500
    txn = db.query(CreditTransaction).filter_by(user_id=user.user_id).first()
    assert txn is not None
    assert txn.type == "free_grant"
    assert txn.amount_cents == 500


def test_reactivated_user_gets_no_second_grant(db):
    from app.models.models import User, CreditTransaction
    import os
    os.environ["FREE_CREDITS_CENTS"] = "500"

    from app.api.endpoints.user import _create_user_with_grant, _reactivate_user
    user = _create_user_with_grant(db, email="old@example.com", given_name="Bob", token_hash="hash1")
    user.is_deleted = True
    db.commit()

    _reactivate_user(db, user, given_name="Bob", token_hash="hash2")

    txns = db.query(CreditTransaction).filter_by(user_id=user.user_id).all()
    grant_txns = [t for t in txns if t.type == "free_grant"]
    assert len(grant_txns) == 1
    assert user.is_deleted is False


def test_delete_user_soft_deletes(db, make_user):
    from app.models.models import User
    user = make_user()

    from app.api.endpoints.user import _soft_delete_user
    _soft_delete_user(db, user)

    db.refresh(user)
    assert user.is_deleted is True
    assert user.deleted_at is not None
    # row must still exist
    assert db.query(User).filter_by(user_id=user.user_id).first() is not None


def test_delete_preserves_balance(db, make_user):
    user = make_user(balance=300)
    from app.api.endpoints.user import _soft_delete_user
    _soft_delete_user(db, user)
    db.refresh(user)
    assert user.credit_balance_cents == 300


def test_require_credits_passes_with_balance(db, make_user):
    from app.api.dependencies import require_credits
    user = make_user(balance=10)
    result = require_credits(current_user=user, db=db)
    assert result.user_id == user.user_id


def test_require_credits_raises_402_when_zero(db, make_user):
    from app.api.dependencies import require_credits
    from fastapi import HTTPException
    user = make_user(balance=0)
    with pytest.raises(HTTPException) as exc:
        require_credits(current_user=user, db=db)
    assert exc.value.status_code == 402
