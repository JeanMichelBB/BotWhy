import os
import stripe
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models import models
from app.api.dependencies import get_current_user

router = APIRouter()

stripe.api_key = os.getenv("STRIPE_SECRET_KEY")
WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET")

CREDIT_PACKS = {
    "starter":  {"base_cents": 500,  "label": "Starter"},
    "standard": {"base_cents": 1000, "label": "Standard"},
    "pro":      {"base_cents": 2500, "label": "Pro"},
}


def calculate_stripe_fee(base_cents: int) -> int:
    import math
    return math.ceil(base_cents * 0.029 + 30)


@router.get("/balance")
def get_balance(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    transactions = (
        db.query(models.CreditTransaction)
        .filter_by(user_id=current_user.user_id)
        .order_by(models.CreditTransaction.created_at.desc())
        .limit(20)
        .all()
    )
    balance_cents = current_user.credit_balance_cents
    return {
        "balance_cents": balance_cents,
        "balance_display": f"${balance_cents / 100:.6f}",
        "transactions": [
            {
                "id": t.id,
                "amount_cents": t.amount_cents,
                "type": t.type,
                "description": t.description,
                "created_at": t.created_at.isoformat() if t.created_at else None,
            }
            for t in transactions
        ],
    }


@router.post("/checkout")
def checkout(
    pack_id: str,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    pack = CREDIT_PACKS.get(pack_id)
    if not pack:
        raise HTTPException(status_code=400, detail=f"Unknown pack_id '{pack_id}'. Valid: {list(CREDIT_PACKS)}")

    base_cents = pack["base_cents"]
    stripe_fee_cents = calculate_stripe_fee(base_cents)
    total_cents = base_cents + stripe_fee_cents

    intent = stripe.PaymentIntent.create(
        amount=total_cents,
        currency="usd",
        metadata={
            "user_id": current_user.user_id,
            "pack_id": pack_id,
            "base_cents": base_cents,
        },
    )

    return {
        "client_secret": intent.client_secret,
        "base_cents": base_cents,
        "stripe_fee_cents": stripe_fee_cents,
        "total_cents": total_cents,
    }


@router.post("/webhook")
async def stripe_webhook(request: Request, db: Session = Depends(get_db)):
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")

    try:
        event = stripe.Webhook.construct_event(payload, sig_header, WEBHOOK_SECRET)
    except stripe.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Invalid signature")

    if event["type"] == "payment_intent.succeeded":
        intent = event["data"]["object"]
        stripe_payment_id = intent["id"]
        user_id = intent["metadata"]["user_id"]
        base_cents = int(intent["metadata"]["base_cents"])

        # idempotency check
        existing = db.query(models.CreditTransaction).filter_by(
            stripe_payment_id=stripe_payment_id
        ).first()
        if existing:
            return {"status": "already_processed"}

        user = db.query(models.User).filter_by(user_id=user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        user.credit_balance_cents += base_cents
        txn = models.CreditTransaction(
            user_id=user_id,
            amount_cents=base_cents,
            type="purchase",
            description="Credit pack purchase",
            stripe_payment_id=stripe_payment_id,
        )
        db.add(txn)
        db.commit()

    return {"status": "ok"}
