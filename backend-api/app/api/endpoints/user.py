# app/api/endpoints/user.py

from fastapi import APIRouter, HTTPException, Depends, status, Request
from sqlalchemy.orm import Session
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from app.core.database import get_db
from app.models.models import User, Conversation, Message, TrendingConversation
from app.api.dependencies import get_current_user, hash_token
import os

# Define the router
router = APIRouter()

# Get the Google client ID and secret from the environment variables
CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")

@router.post("/login")
def login(request: Request, token: str, db: Session = Depends(get_db)):
    token = token.strip()
    if not token:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Token is required")

    try:
        # Verify the Google ID token
        id_info = id_token.verify_oauth2_token(token, google_requests.Request(), CLIENT_ID)

        # Extract the user's email from the decoded token
        email = id_info['email']
        hashed_token = hash_token(token)
        user = db.query(User).filter(User.email == email).first()

        if user:
            user.token = hashed_token  # Update the existing user's token
            db.commit()
            return {"user_id": user.user_id}
        else:
            # Create a new user
            new_user = User(email=email, token=hashed_token)
            db.add(new_user)
            db.commit()
            db.refresh(new_user)
            return {"user_id": new_user.user_id}
    except ValueError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.get("/logout")
def logout(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    current_user.token = None
    db.commit()
    return {"message": "User logged out successfully"}

# Protected route
@router.get("/protected")
def protected(current_user: User = Depends(get_current_user)):
    return {"user_id": current_user.user_id}
    
# Delete user with all messages, conversations, and trending conversations
@router.delete("/user/{user_id}")
def delete_user(user_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    try:
        messages = db.query(Message).join(Conversation).filter(Conversation.user_id == user_id).all()
        for message in messages:
            db.delete(message)
        conversations = db.query(Conversation).filter(Conversation.user_id == user_id).all()
        for conversation in conversations:
            db.delete(conversation)
        trending_conversations = db.query(TrendingConversation).filter(TrendingConversation.user_id == user_id).all()
        for trending_conversation in trending_conversations:
            db.delete(trending_conversation)
        user = db.query(User).filter(User.user_id == user_id).first()
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
        db.delete(user)

        db.commit()
        return {"message": "User deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

# Delete only the user's messages
@router.delete("/user/{user_id}/messages")
def delete_user_messages(user_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    try:
        messages = db.query(Message).join(Conversation).filter(Conversation.user_id == user_id).all()
        for message in messages:
            db.delete(message)
        db.commit()
        return {"message": "User messages deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

# Delete only the user's trending conversations
@router.delete("/user/{user_id}/trending_conversations")
def delete_user_trending_conversations(user_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    try:
        trending_conversations = db.query(TrendingConversation).filter(TrendingConversation.user_id == user_id).all()
        for trending_conversation in trending_conversations:
            db.delete(trending_conversation)
        db.commit()
        return {"message": "User trending conversations deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))