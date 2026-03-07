# app/api/dependencies.py

import hashlib
from fastapi import Header, HTTPException, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.models import User


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def get_current_user(authorization: str = Header(...), db: Session = Depends(get_db)):
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header")
    token = authorization[7:]
    hashed = hash_token(token)
    user = db.query(User).filter(User.token == hashed).first()
    if not user:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    return user
