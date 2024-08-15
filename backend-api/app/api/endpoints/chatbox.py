# app/api/endpoints/chatbox.py

from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import uuid

from app.core.database import get_db
from app.models import models  # Adjust the import according to your models structure
from app.models import schemas  # Adjust the import according to your schemas structure

router = APIRouter()

@router.get("/user/{user_id}/conversation", response_model=schemas.ConversationBase)
def get_user_conversation(user_id: str, db: Session = Depends(get_db)):
    # Query the first conversation for the user
    user_conversation = db.query(models.Conversation).filter(models.Conversation.user_id == user_id).first()

    # If no conversation found, create a new one
    if user_conversation is None:
        user_conversation = models.Conversation(
            user_id=user_id,
            # Add other necessary fields with default values or as needed
        )
        db.add(user_conversation)
        db.commit()
        db.refresh(user_conversation)

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

@router.post("/conversation/{conversation_id}/message")
def create_message(conversation_id: str, message: str, db: Session = Depends(get_db)):
    # Check if the conversation exists
    existing_conversation = db.query(models.Conversation).filter_by(id=conversation_id).first()
    
    if not existing_conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    # check if the user has reached the message limit
    if existing_conversation.user.message_count >= 10:
        raise HTTPException(status_code=400, detail="Message limit reached")
    
    # Create a new message
    new_message = models.Message(
        conversation_id=conversation_id,
        content=message,
        type="user"  # Ensure this is a valid type in your application
    )
    
    # increment the message count for the user
    existing_user = db.query(models.User).filter_by(user_id=existing_conversation.user_id).first()

    existing_user.message_count += 1
    
    # Add the new message to the session
    db.add(new_message)
    db.commit()
    
    return {"message": "Message created successfully"}

@router.post("/user/{user_id}/trending_conversation", response_model=schemas.TrendingConversationBase)
def create_trending_conversation(
    user_id: str,
    title: str,
    description: str,
    message_ids: List[str],
    db: Session = Depends(get_db)
):
    # Check if the user exists
    existing_user = db.query(models.User).filter_by(user_id=user_id).first()
    if not existing_user:
        raise HTTPException(status_code=404, detail="User not found")

    if existing_user.trending_conversation_count >= 5:
        raise HTTPException(status_code=400, detail="Trending conversation limit reached")

    # Create a new trending conversation
    new_trending_conversation = models.TrendingConversation(
        user_id=user_id,
        title=title,
        description=description,
        likes=0,  # Initialize likes as 0
        comments=[],  # Initialize comments as an empty list
        reports=[]  # Initialize reports as an empty list
    )
    
    # increment the trending conversation count for the user
    existing_user.trending_conversation_count += 1

    # Add the new trending conversation to the session and commit to generate the ID
    db.add(new_trending_conversation)
    db.commit()
    db.refresh(new_trending_conversation)  # Refresh to get the generated ID

    # Create new messages for the trending conversation
    for message_id in message_ids:
        # Check if the message exists
        existing_message = db.query(models.Message).filter_by(id=message_id).first()
        if not existing_message:
            raise HTTPException(status_code=404, detail="Message not found")

        # Create a new message for the trending conversation
        new_message = models.Message(
            id=str(uuid.uuid4()),  # Ensure a new UUID for the message
            trending_conversation_id=new_trending_conversation.id,  # Associate with new trending conversation
            content=existing_message.content,
            type=existing_message.type,
            timestamp=existing_message.timestamp
        )
        
        # Add the new message to the session
        db.add(new_message)
        
    # Commit the session to save the messages
    db.commit()
    
    return new_trending_conversation


# get trending conversations
@router.get("/trending_conversations", response_model=List[schemas.TrendingConversationBase])
def get_trending_conversations(db: Session = Depends(get_db)):
    # Query all trending conversations
    trending_conversations = db.query(models.TrendingConversation).all()

    return trending_conversations
    
# get messages for a trending conversation
@router.get("/trending_conversation/{trending_conversation_id}/messages", response_model=List[schemas.MessageBase])

def get_trending_conversation_messages(trending_conversation_id: str, db: Session = Depends(get_db)):
    # Query the messages for the trending conversation
    trending_conversation_messages = db.query(models.Message).filter(models.Message.trending_conversation_id == trending_conversation_id).all()

    # If no messages found, raise an exception
    if not trending_conversation_messages:
        raise HTTPException(status_code=404, detail="No messages found for this trending conversation")

    return trending_conversation_messages


#  get all messages
@router.get("/messages", response_model=List[schemas.MessageBase])
def get_all_messages(db: Session = Depends(get_db)):
    # Query all messages
    messages = db.query(models.Message).all()

    return messages

# Like a trending conversation
@router.post("/trending_conversation/{trending_conversation_id}/like")
def like_trending_conversation(trending_conversation_id: str, user_id: str, db: Session = Depends(get_db)):
    # Check if the trending conversation exists
    existing_trending_conversation = db.query(models.TrendingConversation).filter_by(id=trending_conversation_id).first()
    if not existing_trending_conversation:
        raise HTTPException(status_code=404, detail="Trending conversation not found")

    # Check if the user exists
    existing_user = db.query(models.User).filter_by(user_id=user_id).first()
    if not existing_user:
        raise HTTPException(status_code=404, detail="User not found")

    # Check if the user has already liked the trending conversation
    if existing_trending_conversation.likes and user_id in existing_trending_conversation.likes:
        raise HTTPException(status_code=400, detail="User has already liked this trending conversation")

    # Increment the likes count
    if existing_trending_conversation.likes is None:
        existing_trending_conversation.likes = 0
    existing_trending_conversation.likes += 1
    db.commit()

    # Return total likes
    return {"total_likes": existing_trending_conversation.likes}

# Unlike a trending conversation
@router.post("/trending_conversation/{trending_conversation_id}/unlike")
def unlike_trending_conversation(trending_conversation_id: str, user_id: str, db: Session = Depends(get_db)):
    # Check if the trending conversation exists
    existing_trending_conversation = db.query(models.TrendingConversation).filter_by(id=trending_conversation_id).first()
    if not existing_trending_conversation:
        raise HTTPException(status_code=404, detail="Trending conversation not found")

    # Check if the user exists
    existing_user = db.query(models.User).filter_by(user_id=user_id).first()
    if not existing_user:
        raise HTTPException(status_code=404, detail="User not found")

    # Check if the user has liked the trending conversation
    if existing_trending_conversation.likes is None or existing_trending_conversation.likes <= 0:
        raise HTTPException(status_code=400, detail="User has not liked this trending conversation")

    # Decrement the likes count
    existing_trending_conversation.likes -= 1
    db.commit()

    # Return total likes
    return {"total_likes": existing_trending_conversation.likes}
