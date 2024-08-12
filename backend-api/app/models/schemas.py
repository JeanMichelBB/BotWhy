# app/models/schemas.py
from typing import Dict, List, Optional
from pydantic import BaseModel
from uuid import UUID
from datetime import datetime

# User Schema
class UserBase(BaseModel):
    id: UUID
    email: str 
    created_at: datetime
    is_admin: bool = False
    preferences: Optional[Dict] = None
    token: Optional[str] = None

    class Config:
        from_attributes = True  

class UserCreate(BaseModel):
    email: str
    token: Optional[str] = None

# Conversation Schema
class ConversationBase(BaseModel):
    id: UUID
    user_id: UUID
    created_at: datetime

    class Config:
        orm_mode = True

class ConversationCreate(BaseModel):
    user_id: UUID

# Message Schema
class MessageBase(BaseModel):
    id: UUID
    conversation_id: UUID
    content: str
    timestamp: datetime
    type: str  # Add this line to represent message type

    class Config:
        orm_mode = True

class MessageCreate(BaseModel):
    conversation_id: UUID
    content: str
    type: str  # Add this line to represent message type

# TrendingConversation Schema
class TrendingBase(BaseModel):
    id: UUID
    user_id: UUID
    conversation_id: UUID
    title: str
    description: str
    content: Dict
    created_at: datetime
    likes: Optional[List[str]] = None
    comments: Optional[List[str]] = None
    reports: Optional[List[str]] = None

    class Config:
        orm_mode = True

class TrendingCreate(BaseModel):
    user_id: UUID
    conversation_id: UUID
    title: str
    description: str
    content: Dict

# UserLogin Schema
class UserLogin(BaseModel):
    email: str