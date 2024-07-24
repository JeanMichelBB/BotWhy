# app/api/endpoints/user.py
import uuid
from fastapi import APIRouter, HTTPException, Depends, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from passlib.context import CryptContext
from app.core.database import get_db
from app.models.models import User
import jwt
from typing import Optional
from app.models.schemas import UserCreate, UserResponse, UserLogin
from app.auth.auth import (
    hash_password,
    verify_password,
    create_jwt_token,
    get_user_from_token,
    get_db_session,
    protected_route,
    get_current_user
)

# Define the router
router = APIRouter()

db: Session = Depends(get_db)

@router.post("/login")
def login(email: str, password: str, db: Session = Depends(get_db)):
    # Get the user from the database
    existing_user = db.query(User).filter(User.email == email).first()
    if not existing_user or not verify_password(password, existing_user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    # Create a JWT token
    token = create_jwt_token(existing_user.id)
    return {"access_token": token, "token_type": "bearer"}

# Endpoint for user signup
@router.post("/signup")
def signup(username: str, email: str, password: str, db: Session = Depends(get_db)):
    # Check if the user already exists
    existing_user = db.query(User).filter(User.email == email).first()
    if existing_user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User already exists")

    # Create a new user with default values for additional fields
    new_user = User(
        id=str(uuid.uuid4()),  # Generate a new UUID
        username=username,
        email=email,
        password_hash=hash_password(password),
        first_name="",  # Default or empty value
        last_name="",   # Default or empty value
        profile_picture=None,  # Default or empty value
        preferences=None,      # Default or empty value
        subscription_level=None,  # Default or empty value
        social_logins=None,    # Default or empty value
        notification_settings=None  # Default or empty value
    )

    db.add(new_user)
    db.commit()

    return {"message": "User created successfully"}

# protected route
@router.get("/protected")
async def protected_route(current_user: str = Depends(get_current_user)):
    return {"message": f"Hello, {current_user}. You are logged in!"}
