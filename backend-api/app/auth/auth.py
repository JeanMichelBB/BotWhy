# app/auth/auth.py
from fastapi import APIRouter, HTTPException, Depends, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from passlib.context import CryptContext
from app.core.database import get_db, SessionLocal
from app.models.models import User
import jwt
from typing import Optional
from app.models.schemas import UserCreate, UserResponse
from app.models import models

# Define the router
router = APIRouter()

# Create a CryptContext object for password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Secret key for JWT encoding and decoding
SECRET_KEY = "your_secret_key"  # Replace with your actual secret key
ALGORITHM = "HS256"

# Utility function to hash passwords
def hash_password(password: str) -> str:
    return pwd_context.hash(password)

# Utility function to verify passwords
def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

# Utility function to create a JWT token
def create_jwt_token(user_id: int) -> str:
    return jwt.encode({"user_id": user_id}, SECRET_KEY, algorithm=ALGORITHM)

# Utility function to get user from token
def get_user_from_token(token: str) -> Optional[int]:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload.get("user_id")
    except jwt.PyJWTError:
        return None

# Function to get the DB session
def get_db_session() -> Session:
    db = next(get_db())
    return db

# Endpoint for user signup
@router.post("/signup", response_model=UserResponse)
def signup(user: UserCreate, db: Session = Depends(get_db)):
    # Hash the password and create the user
    hashed_password = hash_password(user.password)
    db_user = models.User(
        username=user.username,
        email=user.email,
        password_hash=hashed_password,
        first_name=user.first_name,
        last_name=user.last_name,
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

# Endpoint for user login
@router.post("/login")
def login(user: BaseModel):
    db = get_db_session()
    existing_user = db.query(User).filter(User.email == user.email).first()
    if not existing_user or not verify_password(user.password, existing_user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    token = create_jwt_token(existing_user.id)
    return {"access_token": token, "token_type": "bearer"}

from fastapi.security import OAuth2PasswordBearer

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

# Protected route example
def protected_route(token: str = Depends(oauth2_scheme)):
    user_id = get_user_from_token(token)
    if not user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid or missing token")
    return user_id

# Example protected endpoint
@router.get("/protected")
def protected_endpoint(user_id: int = Depends(protected_route)):
    return {"message": f"Hello user {user_id}"}
