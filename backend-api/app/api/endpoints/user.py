# app/api/endpoints/user.py
from fastapi import APIRouter, HTTPException, Depends, status, Request
from sqlalchemy.orm import Session
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from app.core.database import get_db
from app.models.models import User
import hashlib
import os

# Define the router
router = APIRouter()

CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")

def hash_token(token: str) -> str:
    """Hash the token for consistent storage and comparison."""
    return hashlib.sha256(token.encode()).hexdigest()

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
def logout(email: str, db: Session = Depends(get_db)):
    try:
        user = db.query(User).filter(User.email == email).first()
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
        user.token = None  # Clear the token on logout
        db.commit()
        return {"message": "User logged out successfully"}
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

# Protected route
@router.get("/protected")
def protected(token: str, db: Session = Depends(get_db)):
    try:
        hashed_token = hash_token(token)
        user = db.query(User).filter(User.token == hashed_token).first()
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
        return {"user_id": user.user_id}
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))