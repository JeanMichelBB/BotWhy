# app/api/endpoints/chatbox.py

from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models import models  # Adjust the import according to your models structure
from app.models import schemas  # Adjust the import according to your schemas structure

router = APIRouter()

@router.get("/user/{user_id}/conversation", response_model=schemas.ConversationBase)
def get_user_conversation(user_id: str, db: Session = Depends(get_db)):
    # Query the first conversation for the user
    user_conversation = db.query(models.Conversation).filter(models.Conversation.user_id == user_id).first()

    # If no conversation found, raise an exception
    if user_conversation is None:
        raise HTTPException(status_code=404, detail="No conversation found for this user")

    return user_conversation

# get messages for a conversation
@router.get("/conversation/{conversation_id}/messages", response_model=List[schemas.MessageBase])
def get_conversation_messages(conversation_id: str, db: Session = Depends(get_db)):
    # Query the messages for the conversation
    conversation_messages = db.query(models.Message).filter(models.Message.conversation_id == conversation_id).all()

    # If no messages found, raise an exception
    if not conversation_messages:
        raise HTTPException(status_code=404, detail="No messages found for this conversation")

    return conversation_messages
