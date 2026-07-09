# app/api/dependencies.py

import hashlib
import base64
import json
import time
from fastapi import Header, HTTPException, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.models import User, CreditTransaction

FREE_TRIAL_MESSAGES = 10


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


def require_credits(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> User:
    has_purchased = db.query(CreditTransaction).filter(
        CreditTransaction.user_id == current_user.user_id,
        CreditTransaction.type.in_(("purchase", "admin_adjustment")),
    ).count() > 0

    if not has_purchased:
        if (current_user.message_count or 0) >= FREE_TRIAL_MESSAGES:
            raise HTTPException(status_code=402, detail="Free trial exhausted. Buy credits to continue.")
        return current_user

    if current_user.credit_balance_cents <= 0:
        raise HTTPException(status_code=402, detail="Insufficient credits")
    return current_user


def require_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user
