from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models import models
from app.api.dependencies import get_current_user, require_credits
import app.utils.ai as ai_module

router = APIRouter()


@router.post("/answer")
def answer_question(
    question: str,
    user_id: str,
    model: str | None = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_credits),
):
    # Free-tier enforcement: no purchase transactions → must use gpt-4o-mini
    has_purchased = db.query(models.CreditTransaction).filter_by(
        user_id=current_user.user_id, type="purchase"
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

    message_content, cost_cents = ai_module.call_openrouter(messages=messages, model=model)

    new_message = models.Message(
        conversation_id=user_conversation.id,
        content=message_content,
        type="Machine",
    )
    db.add(new_message)

    if cost_cents > 0:
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
