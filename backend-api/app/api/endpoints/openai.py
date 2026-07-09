from typing import List
from fastapi import APIRouter, Depends, HTTPException, Request
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models import models
from app.api.dependencies import get_current_user, require_credits
import app.utils.ai as ai_module

router = APIRouter()
limiter = Limiter(key_func=get_remote_address)


@router.post("/answer")
@limiter.limit("20/minute")
def answer_question(
    request: Request,
    question: str,
    user_id: str,
    model: str | None = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_credits),
):
    if len(question) > 500:
        raise HTTPException(status_code=400, detail="Message too long. Maximum 500 characters.")

    # Free-tier enforcement: no purchase/admin-granted credit → must use gpt-4o-mini
    has_purchased = db.query(models.CreditTransaction).filter(
        models.CreditTransaction.user_id == current_user.user_id,
        models.CreditTransaction.type.in_(("purchase", "admin_adjustment")),
    ).count() > 0
    if not has_purchased and model and model != "openai/gpt-4o-mini":
        raise HTTPException(
            status_code=403,
            detail="Free tier is limited to gpt-4o-mini. Buy credits to unlock all models.",
        )

    user_conversation = db.query(models.Conversation).filter(
        models.Conversation.user_id == user_id
    ).first()

    if not user_conversation:
        raise HTTPException(status_code=404, detail="Conversation not found.")

    conversation_messages = db.query(models.Message).filter(
        models.Message.conversation_id == user_conversation.id
    ).all()

    messages = [
        {"role": "system", "content": "You are a sarcastic and humorous assistant. Your responses should be short, witty, and not very helpful."},
    ]
    for m in conversation_messages:
        role = "user" if m.type == "user" else "assistant"
        messages.append({"role": role, "content": m.content})
    messages.append({"role": "user", "content": question})

    message_content, cost_cents = ai_module.call_openrouter(messages=messages, model=model, db=db)

    new_message = models.Message(
        conversation_id=user_conversation.id,
        content=message_content,
        type="Machine",
    )
    db.add(new_message)

    if cost_cents > 0 and has_purchased:
        current_user.credit_balance_cents -= cost_cents
        txn = models.CreditTransaction(
            user_id=current_user.user_id,
            amount_cents=-cost_cents,
            type="spend",
            description="AI response",
        )
        db.add(txn)

    db.commit()

    return {"answer": message_content}
