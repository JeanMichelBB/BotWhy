# app/api/dependencies.py

import hashlib
import base64
import json
import time
from fastapi import Header, HTTPException, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.models import User


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def _decode_jwt_payload(token: str) -> dict:
    try:
        payload_part = token.split('.')[1]
        padding = 4 - len(payload_part) % 4
        payload_part += '=' * padding
        return json.loads(base64.urlsafe_b64decode(payload_part))
    except Exception:
        return {}


def get_current_user(authorization: str = Header(...), db: Session = Depends(get_db)):
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header")
    token = authorization[7:]

    payload = _decode_jwt_payload(token)
    exp = payload.get('exp')
    if exp and time.time() > exp:
        raise HTTPException(status_code=401, detail="Session expired")

    hashed = hash_token(token)
    user = db.query(User).filter(User.token == hashed).first()
    if not user:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    if not user.given_name:
        given_name = payload.get('given_name')
        if given_name:
            user.given_name = given_name
            db.commit()

    return user
