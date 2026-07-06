# app/api/endpoints/user.py

from fastapi import APIRouter, HTTPException, Depends, status, Request
from sqlalchemy.orm import Session
from sqlalchemy import func as sqlfunc
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from app.core.database import get_db
from app.models.models import User, Conversation, Message, TrendingConversation, CreditTransaction
from app.api.dependencies import get_current_user, hash_token
import os

# Define the router
router = APIRouter()

# Get the Google client ID and secret from the environment variables
CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")

def _create_user_with_grant(db: Session, email: str, given_name: str, token_hash: str) -> User:
    new_user = User(
        email=email,
        given_name=given_name,
        token=token_hash,
        credit_balance_cents=0,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user


def _reactivate_user(db: Session, user: User, given_name: str, token_hash: str) -> User:
    """Login-triggered reactivation: always has a fresh token from the just-completed
    Google login, unlike _admin_reactivate_user which has no token to set."""
    user.is_deleted = False
    user.deleted_at = None
    user.token = token_hash
    user.given_name = given_name
    db.commit()
    return user


def _admin_reactivate_user(db: Session, user: User) -> User:
    """Admin-triggered reactivation: clears the deleted flags and forces a fresh
    login (no token available here, unlike _reactivate_user which runs during
    an actual Google login and always has a fresh token to set)."""
    user.is_deleted = False
    user.deleted_at = None
    user.token = None
    db.commit()
    return user


def _soft_delete_user(db: Session, user: User) -> None:
    user.is_deleted = True
    user.deleted_at = sqlfunc.now()
    user.token = None
    db.commit()


@router.post("/login")
def login(request: Request, token: str, db: Session = Depends(get_db)):
    token = token.strip()
    if not token:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Token is required")

    try:
        id_info = id_token.verify_oauth2_token(token, google_requests.Request(), CLIENT_ID)
        email = id_info["email"]
        given_name = id_info.get("given_name")
        hashed_token = hash_token(token)

        user = db.query(User).filter(User.email == email).first()

        if user:
            if user.is_deleted:
                _reactivate_user(db, user, given_name=given_name, token_hash=hashed_token)
            else:
                user.token = hashed_token
                user.given_name = given_name
                db.commit()
        else:
            user = _create_user_with_grant(db, email=email, given_name=given_name, token_hash=hashed_token)

        admin_emails = [e.strip() for e in os.getenv("ADMIN_EMAILS", "").split(",") if e.strip()]
        if email in admin_emails and user.role != "admin":
            user.role = "admin"
            db.commit()

        return {"user_id": user.user_id}

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
def protected(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    has_purchased = db.query(CreditTransaction).filter_by(
        user_id=current_user.user_id, type="purchase"
    ).count() > 0
    is_free_tier = not has_purchased
    free_messages_remaining = max(0, 10 - (current_user.message_count or 0))
    return {
        "user_id": current_user.user_id,
        "is_free_tier": is_free_tier,
        "free_messages_remaining": free_messages_remaining,
    }
    
# Delete user (soft delete — preserves row and balance)
@router.delete("/user/{user_id}")
def delete_user(user_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    if current_user.user_id != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")
    _soft_delete_user(db, user)
    return {"message": "User deleted successfully"}

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