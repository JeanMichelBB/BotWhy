# app/api/endpoints/chatbox.py

from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import uuid

from app.core.database import get_db
from app.models import models
from app.models import schemas
from app.api.dependencies import get_current_user

router = APIRouter()

@router.get("/user/{user_id}/conversation", response_model=schemas.ConversationBase)
def get_user_conversation(user_id: str, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
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
def get_conversation_messages(conversation_id: str, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    # Query the messages for the conversation
    conversation_messages = db.query(models.Message).filter(models.Message.conversation_id == conversation_id).all()
    
    # If no messages found, raise an exception
    if not conversation_messages:
        raise HTTPException(status_code=404, detail="No messages found for this conversation")

    return conversation_messages

@router.post("/conversation/{conversation_id}/message")
def create_message(conversation_id: str, message: str, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    # Check if the conversation exists
    existing_conversation = db.query(models.Conversation).filter_by(id=conversation_id).first()
    
    if not existing_conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    # check if the user has reached the message limit (bypassed for users with credits)
    if existing_conversation.user.message_count >= 10 and existing_conversation.user.credit_balance_cents <= 0:
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
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
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

# Like a trending conversation
@router.post("/trending_conversation/{trending_conversation_id}/like")
def like_trending_conversation(trending_conversation_id: str, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    existing = db.query(models.TrendingConversation).filter_by(id=trending_conversation_id).first()
    if not existing:
        raise HTTPException(status_code=404, detail="Trending conversation not found")

    liked_by = list(existing.liked_by or [])
    if current_user.user_id in liked_by:
        raise HTTPException(status_code=400, detail="Already liked")

    liked_by.append(current_user.user_id)
    existing.liked_by = liked_by
    existing.likes = len(liked_by)

    from sqlalchemy.orm.attributes import flag_modified
    flag_modified(existing, "liked_by")
    db.commit()

    return {"total_likes": existing.likes}

# Unlike a trending conversation
@router.post("/trending_conversation/{trending_conversation_id}/unlike")
def unlike_trending_conversation(trending_conversation_id: str, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    existing = db.query(models.TrendingConversation).filter_by(id=trending_conversation_id).first()
    if not existing:
        raise HTTPException(status_code=404, detail="Trending conversation not found")

    liked_by = list(existing.liked_by or [])
    if current_user.user_id not in liked_by:
        raise HTTPException(status_code=400, detail="Not liked yet")

    liked_by.remove(current_user.user_id)
    existing.liked_by = liked_by
    existing.likes = len(liked_by)

    from sqlalchemy.orm.attributes import flag_modified
    flag_modified(existing, "liked_by")
    db.commit()

    return {"total_likes": existing.likes}

# Add a comment to a trending conversation
@router.post("/trending_conversation/{trending_conversation_id}/comment")
def add_comment(trending_conversation_id: str, text: str, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    existing_trending_conversation = db.query(models.TrendingConversation).filter_by(id=trending_conversation_id).first()
    if not existing_trending_conversation:
        raise HTTPException(status_code=404, detail="Trending conversation not found")

    comment = {"user": current_user.given_name or current_user.email, "text": text}
    comments = list(existing_trending_conversation.comments or [])
    comments.append(comment)
    existing_trending_conversation.comments = comments

    from sqlalchemy.orm.attributes import flag_modified
    flag_modified(existing_trending_conversation, "comments")
    db.commit()

    return {"comments": existing_trending_conversation.comments}

# Delete a comment from a trending conversation
@router.delete("/trending_conversation/{trending_conversation_id}/comment")
def delete_comment(trending_conversation_id: str, index: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    existing_trending_conversation = db.query(models.TrendingConversation).filter_by(id=trending_conversation_id).first()
    if not existing_trending_conversation:
        raise HTTPException(status_code=404, detail="Trending conversation not found")

    comments = list(existing_trending_conversation.comments or [])
    if index < 0 or index >= len(comments):
        raise HTTPException(status_code=404, detail="Comment not found")

    if comments[index].get("user") != (current_user.given_name or current_user.email):
        raise HTTPException(status_code=403, detail="Not authorized to delete this comment")

    comments.pop(index)
    existing_trending_conversation.comments = comments

    from sqlalchemy.orm.attributes import flag_modified
    flag_modified(existing_trending_conversation, "comments")
    db.commit()

    return {"comments": existing_trending_conversation.comments}
