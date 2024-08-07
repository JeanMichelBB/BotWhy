# app/models/schemas.py
from typing import Dict, List, Optional
from pydantic import BaseModel
from uuid import UUID
from datetime import datetime

class UserBase(BaseModel):
    id: UUID
    email: str 
    created_at: datetime
    is_admin: bool = False
    preferences: Optional[Dict] = None
    token: Optional[str] = None

    class Config:
        orm_mode = True

class ConversationBase(BaseModel):
    id: UUID
    user_id: UUID
    created_at: datetime

    class Config:
        orm_mode = True

class MessageBase(BaseModel):
    id: UUID
    conversation_id: UUID
    sender_google_token_hash: str
    receiver_google_token_hash: str
    content: str
    timestamp: datetime

    class Config:
        orm_mode = True

class MessageCreate(BaseModel):
    conversation_id: UUID
    sender_google_token_hash: str
    receiver_google_token_hash: str
    content: str

class TrendingBase(BaseModel):
    id: UUID
    user_id: UUID
    conversation_id: UUID  
    created_at: datetime

    class Config:
        orm_mode = True

class TrendingCreate(BaseModel):
    user_id: UUID
    conversation_id: UUID

class UserLogin(BaseModel):
    email: str

class UserCreate(BaseModel):
    email: str
    created_at: Optional[datetime] = None
    is_admin: Optional[bool] = False
    preferences: Optional[Dict] = None