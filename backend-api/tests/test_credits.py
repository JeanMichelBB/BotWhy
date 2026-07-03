import pytest
from unittest.mock import MagicMock, patch


def make_openrouter_response(content="Answer", cost=0.0234):
    response = MagicMock()
    response.choices[0].message.content = content
    response.usage.model_extra = {"cost": cost}
    return response


def test_cost_cents_rounding():
    from app.utils.ai import cost_to_cents
    assert cost_to_cents(0.0234) == pytest.approx(2.34)
    assert cost_to_cents(0.005) == pytest.approx(0.5)
    assert cost_to_cents(0.0) == 0.0
    assert cost_to_cents(0.01) == pytest.approx(1.0)


def test_call_openrouter_returns_content_and_cost(monkeypatch):
    from app.utils import ai as ai_module
    mock_response = make_openrouter_response(content="Hello", cost=0.01)
    mock_client = MagicMock()
    mock_client.chat.completions.create.return_value = mock_response
    monkeypatch.setattr(ai_module, "client", mock_client)

    from app.utils.ai import call_openrouter
    content, cost_cents = call_openrouter(messages=[{"role": "user", "content": "hi"}])
    assert content == "Hello"
    assert cost_cents == pytest.approx(1.0)


def test_new_user_starts_with_zero_balance(db):
    from app.api.endpoints.user import _create_user_with_grant
    user = _create_user_with_grant(db, email="new@example.com", given_name="Alice", token_hash="abc123")

    assert user.credit_balance_cents == 0


def test_reactivated_user_gets_no_grant(db):
    from app.models.models import CreditTransaction
    from app.api.endpoints.user import _create_user_with_grant, _reactivate_user

    user = _create_user_with_grant(db, email="old@example.com", given_name="Bob", token_hash="hash1")
    user.is_deleted = True
    db.commit()

    _reactivate_user(db, user, given_name="Bob", token_hash="hash2")

    txns = db.query(CreditTransaction).filter_by(user_id=user.user_id).all()
    assert len(txns) == 0
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
    from app.models.models import CreditTransaction
    user = make_user(balance=10)
    # give them a purchase so they're paid-tier
    txn = CreditTransaction(user_id=user.user_id, amount_cents=10, type="purchase", description="test")
    db.add(txn)
    db.commit()
    result = require_credits(current_user=user, db=db)
    assert result.user_id == user.user_id


def test_require_credits_free_tier_passes_during_trial(db, make_user):
    from app.api.dependencies import require_credits
    user = make_user(balance=0)  # no purchase → free tier, 0 messages used
    result = require_credits(current_user=user, db=db)
    assert result.user_id == user.user_id


def test_require_credits_raises_402_when_paid_tier_empty(db, make_user):
    from app.api.dependencies import require_credits
    from app.models.models import CreditTransaction
    from fastapi import HTTPException
    user = make_user(balance=0)
    txn = CreditTransaction(user_id=user.user_id, amount_cents=0, type="purchase", description="test")
    db.add(txn)
    db.commit()
    with pytest.raises(HTTPException) as exc:
        require_credits(current_user=user, db=db)
    assert exc.value.status_code == 402


def test_require_credits_raises_402_when_free_trial_exhausted(db, make_user):
    from app.api.dependencies import require_credits
    from fastapi import HTTPException
    user = make_user(balance=0)
    user.message_count = 10
    db.commit()
    with pytest.raises(HTTPException) as exc:
        require_credits(current_user=user, db=db)
    assert exc.value.status_code == 402


def test_deduct_credits_after_ai_call(db, make_user, monkeypatch):
    from app.models.models import CreditTransaction, Conversation
    import app.utils.ai as ai_module
    from slowapi import Limiter

    user = make_user(balance=100)
    # make paid-tier so deduction applies
    txn = CreditTransaction(user_id=user.user_id, amount_cents=100, type="purchase", description="test")
    db.add(txn)
    db.commit()

    monkeypatch.setattr(
        ai_module,
        "call_openrouter",
        lambda messages, model=None: ("Witty answer", 3),
    )
    monkeypatch.setattr(Limiter, "_check_request_limit", lambda self, req, *a, **kw: setattr(req.state, "view_rate_limit", None))

    conv = Conversation(user_id=user.user_id)
    db.add(conv)
    db.commit()

    from app.api.endpoints.openai import answer_question
    from starlette.requests import Request as StarletteRequest
    mock_request = StarletteRequest({"type": "http", "method": "POST", "headers": [], "client": ("127.0.0.1", 0)})
    result = answer_question(request=mock_request, question="Why?", user_id=user.user_id, db=db, current_user=user)

    db.refresh(user)
    assert user.credit_balance_cents == 97  # 100 - 3
    txn = db.query(CreditTransaction).filter_by(user_id=user.user_id, type="spend").first()
    assert txn is not None
    assert txn.amount_cents == -3


def test_zero_cost_inserts_no_spend_row(db, make_user, monkeypatch):
    from app.models.models import CreditTransaction, Conversation
    import app.utils.ai as ai_module
    from slowapi import Limiter

    user = make_user(balance=100)
    monkeypatch.setattr(ai_module, "call_openrouter", lambda messages, model=None: ("answer", 0))
    monkeypatch.setattr(Limiter, "_check_request_limit", lambda self, req, *a, **kw: setattr(req.state, "view_rate_limit", None))

    conv = Conversation(user_id=user.user_id)
    db.add(conv)
    db.commit()

    from app.api.endpoints.openai import answer_question
    from starlette.requests import Request as StarletteRequest
    mock_request = StarletteRequest({"type": "http", "method": "POST", "headers": [], "client": ("127.0.0.1", 0)})
    answer_question(request=mock_request, question="hi", user_id=user.user_id, db=db, current_user=user)

    spend_txns = db.query(CreditTransaction).filter_by(user_id=user.user_id, type="spend").all()
    assert len(spend_txns) == 0


def test_balance_endpoint_returns_balance(client, db, make_user):
    from app.models.models import CreditTransaction
    user = make_user(balance=750)

    txn = CreditTransaction(user_id=user.user_id, amount_cents=-10, type="spend", description="test")
    db.add(txn)
    db.commit()

    response = client.get(
        "/credits/balance",
        headers={"Authorization": f"Bearer {user._raw_token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["balance_cents"] == 750
    assert data["balance_display"] == "$7.500000"
    assert len(data["transactions"]) == 1


def test_stripe_fee_calculation():
    from app.api.endpoints.credits import calculate_stripe_fee
    assert calculate_stripe_fee(1000) == 59   # 1000 * 0.029 + 30 = 59
    assert calculate_stripe_fee(500) == 45    # 500 * 0.029 + 30 = 44.5 → 45
    assert calculate_stripe_fee(2500) == 103  # 2500 * 0.029 + 30 = 102.5 → 103


def test_checkout_unknown_pack(client, make_user):
    user = make_user()
    response = client.post(
        "/credits/checkout?pack_id=nonexistent",
        headers={"Authorization": f"Bearer {user._raw_token}"},
    )
    assert response.status_code == 400


def test_webhook_idempotent(db, make_user, monkeypatch):
    from app.models.models import CreditTransaction
    from app.api.endpoints import credits as credits_module
    import asyncio

    user = make_user(balance=0)

    fake_event = {
        "type": "payment_intent.succeeded",
        "data": {
            "object": {
                "id": "pi_test_123",
                "metadata": {
                    "user_id": user.user_id,
                    "pack_id": "starter",
                    "base_cents": "500",
                },
            }
        },
    }

    monkeypatch.setattr(
        credits_module.stripe.Webhook,
        "construct_event",
        lambda payload, sig, secret: fake_event,
    )

    from unittest.mock import AsyncMock, MagicMock
    mock_request = MagicMock()
    mock_request.body = AsyncMock(return_value=b"payload")
    mock_request.headers = {"stripe-signature": "sig"}

    asyncio.run(credits_module.stripe_webhook(mock_request, db))
    asyncio.run(credits_module.stripe_webhook(mock_request, db))  # second call

    db.refresh(user)
    assert user.credit_balance_cents == 500  # credited once, not twice
    txns = db.query(CreditTransaction).filter_by(user_id=user.user_id, type="purchase").all()
    assert len(txns) == 1


def test_webhook_invalid_signature(client, monkeypatch):
    import stripe as stripe_module
    from app.api.endpoints import credits as credits_module

    monkeypatch.setattr(
        credits_module.stripe.Webhook,
        "construct_event",
        lambda payload, sig, secret: (_ for _ in ()).throw(stripe_module.SignatureVerificationError("bad", "sig")),
    )

    response = client.post(
        "/credits/webhook",
        content=b"payload",
        headers={"stripe-signature": "badsig"},
    )
    assert response.status_code == 400
