# app/models/schemas.py
from typing import Dict, List, Optional
from pydantic import BaseModel, EmailStr
from uuid import UUID
from datetime import datetime

class UserBase(BaseModel):
    id: UUID
    email: EmailStr
    name: str
    profile_picture: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    last_login: Optional[datetime] = None
    is_active: bool = True
    is_admin: bool = False
    preferences: Optional[dict] = None
    social_logins: Optional[dict] = None

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    pass

class ConversationBase(BaseModel):
    id: UUID
    user_id: UUID
    ai_id: UUID
    created_at: datetime
    updated_at: datetime

class ConversationCreate(BaseModel):
    ai_id: UUID

class ConversationResponse(ConversationBase):
    pass

class MessageBase(BaseModel):
    id: UUID
    conversation_id: UUID
    sender_id: UUID
    receiver_id: UUID
    content: str
    created_at: datetime

class MessageCreate(BaseModel):
    conversation_id: UUID
    sender_id: UUID
    receiver_id: UUID
    content: str

class MessageResponse(MessageBase):
    pass

class TrendingBase(BaseModel):
    id: UUID
    user_id: UUID
    message_id: UUID
    created_at: datetime

class TrendingCreate(BaseModel):
    user_id: UUID
    message_id: UUID

class TrendingResponse(TrendingBase):
    pass

class UserCreate(BaseModel):
    username: str
    email: str
    password: str

class UserResponse(BaseModel):
    id: int
    username: str
    email: str

    class Config:
        orm_mode = True

class UserLogin(BaseModel):
    email: str
    password: str
    
class UserCreate(BaseModel):
    username: str
    email: str
    password: str
    first_name: str
    last_name: str
    profile_picture: Optional[str] = None
    preferences: Optional[Dict] = None
    subscription_level: Optional[str] = None
    social_logins: Optional[Dict] = None
    notification_settings: Optional[Dict] = None