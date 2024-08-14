import openai
import os
from dotenv import load_dotenv

from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import uuid

from app.core.database import get_db
from app.models import models  # Adjust the import according to your models structure
from app.models import schemas  # Adjust the import according to your schemas structure

load_dotenv()

api_key = os.getenv('OPENAI_API_KEY')
openai.api_key = api_key

router = APIRouter()

@router.post("/answer")
def answer_question(question: str, user_id: str, db: Session = Depends(get_db)):
    
    # Get the conversation id for the user
    user_conversation = db.query(models.Conversation).filter(models.Conversation.user_id == user_id).first()
    
    if not user_conversation:
        raise HTTPException(status_code=404, detail="Conversation not found.")
    
    # Get messages from the conversation
    conversation_messages = db.query(models.Message).filter(models.Message.conversation_id == user_conversation.id).all()
    
        # Construct the context from the conversation messages, including the type
    context = ""
    for message in conversation_messages:
        context += f"[{message.type}] {message.content} "
        
    # Using the newer chat completion API
    response = openai.ChatCompletion.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": "You are a sarcastic and humorous assistant. Your responses should be short, witty, and not very helpful."},
            {"role": "user", "content": f"Context: {context}"},
            {"role": "user", "content": f"Question: {question}"}
        ],
        temperature=0.2,
        max_tokens=50
    )
    
    # insert the response into the database
    new_message = models.Message(
        conversation_id=user_conversation.id,
        content=response.choices[0].message['content'],
        type="Machine"
    )
    db.add(new_message)
    db.commit()
    
    return {"answer": response.choices[0].message['content']}