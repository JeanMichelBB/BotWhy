# app/models/models.py
# app/models/models.py
from sqlalchemy import String, JSON, TIMESTAMP, Column, ForeignKey, Text, func, Boolean
from sqlalchemy.orm import relationship
import uuid
from app.core.database import Base

class User(Base):
    __tablename__ = "users"

    user_id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String(255), nullable=False, unique=True)
    created_at = Column(TIMESTAMP, server_default=func.now())
    is_admin = Column(Boolean, default=False)
    preferences = Column(JSON, nullable=True)
    token = Column(String(255), nullable=True)

    conversations = relationship("Conversation", back_populates="user")
    trending_conversations = relationship("TrendingConversation", back_populates="user")

class Conversation(Base):
    __tablename__ = "conversations"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey('users.user_id'), nullable=False)
    created_at = Column(TIMESTAMP, server_default=func.now())

    user = relationship("User", back_populates="conversations")
    messages = relationship("Message", back_populates="conversation")

class Message(Base):
    __tablename__ = "messages"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    conversation_id = Column(String(36), ForeignKey('conversations.id'), nullable=False)
    sender_id = Column(String(64), nullable=False)
    receiver_id = Column(String(64), nullable=False)
    content = Column(Text, nullable=False)
    timestamp = Column(TIMESTAMP, server_default=func.now())
    is_trending = Column(Boolean, default=False)
    
    conversation = relationship("Conversation", back_populates="messages")

class TrendingConversation(Base):
    __tablename__ = "trending_conversations"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey('users.user_id'), nullable=False)
    conversation_id = Column(String(36), ForeignKey('conversations.id'), nullable=False)
    title = Column(String(255), nullable=False)
    content = Column(JSON, nullable=False)
    created_at = Column(TIMESTAMP, server_default=func.now())
    likes = Column(JSON, nullable=True)
    comments = Column(JSON, nullable=True)
    reports = Column(JSON, nullable=True)
    
    user = relationship("User", back_populates="trending_conversations")
    conversation = relationship("Conversation")