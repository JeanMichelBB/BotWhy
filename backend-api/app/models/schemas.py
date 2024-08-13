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
    conversation_id: Optional[UUID]  # Allow None for optional fields
    trending_conversation_id: Optional[UUID]  # Allow None for optional fields
    content: str
    timestamp: datetime
    type: str

    class Config:
        orm_mode = True

class TrendingConversationBase(BaseModel):
    id: UUID
    user_id: UUID
    title: str
    description: str
    created_at: datetime
    likes: Optional[int] = 0
    comments: Optional[List[str]] = []
    reports: Optional[List[str]] = []
    content: Optional[List[UUID]] = []  # Expecting UUIDs for content

    class Config:
        orm_mode = True