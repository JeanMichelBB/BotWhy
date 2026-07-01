from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models import models
from app.api.dependencies import get_current_user, require_credits
from app.utils.ai import call_openrouter

router = APIRouter()


@router.post("/answer")
def answer_question(
    question: str,
    user_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_credits),
):
    user_conversation = db.query(models.Conversation).filter(
        models.Conversation.user_id == user_id
    ).first()

    if not user_conversation:
        raise HTTPException(status_code=404, detail="Conversation not found.")

    conversation_messages = db.query(models.Message).filter(
        models.Message.conversation_id == user_conversation.id
    ).all()

    context = "".join(f"[{m.type}] {m.content} " for m in conversation_messages)

    messages = [
        {"role": "system", "content": "You are a sarcastic and humorous assistant. Your responses should be short, witty, and not very helpful."},
        {"role": "user", "content": f"Context: {context}"},
        {"role": "user", "content": f"Question: {question}"},
    ]

    message_content, cost_cents = call_openrouter(messages=messages)

    new_message = models.Message(
        conversation_id=user_conversation.id,
        content=message_content,
        type="Machine",
    )
    db.add(new_message)
    db.commit()

    return {"answer": message_content}
