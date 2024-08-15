# app/models/models.py
from sqlalchemy import Integer, String, JSON, TIMESTAMP, Column, ForeignKey, Text, func, Boolean
from sqlalchemy.dialects.mysql import CHAR  # Import CHAR for MySQL compatibility
from sqlalchemy.orm import relationship
import uuid
from app.core.database import Base

class User(Base):
    __tablename__ = "users"

    user_id = Column(CHAR(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String(255), nullable=False, unique=True)
    created_at = Column(TIMESTAMP, server_default=func.now())
    token = Column(String(255), nullable=True)
    message_count = Column(Integer, default=0, nullable=True)  # Correct usage of Integer for message count
    trending_conversation_count = Column(Integer, default=0, nullable=True)  # Correct usage of Integer for trending conversation count
    
    # Define relationships
    conversations = relationship("Conversation", back_populates="user", cascade="all, delete-orphan")
    trending_conversations = relationship("TrendingConversation", back_populates="user", cascade="all, delete-orphan")

class Conversation(Base):
    __tablename__ = "conversations"

    id = Column(CHAR(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(CHAR(36), ForeignKey('users.user_id'), nullable=False)
    created_at = Column(TIMESTAMP, server_default=func.now())

    # Define relationships
    user = relationship("User", back_populates="conversations")
    messages = relationship("Message", back_populates="conversation", cascade="all, delete-orphan")

class TrendingConversation(Base):
    __tablename__ = "trending_conversations"

    id = Column(CHAR(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(CHAR(36), ForeignKey('users.user_id'), nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(String(255), nullable=False)
    created_at = Column(TIMESTAMP, server_default=func.now())
    likes = Column(Integer, default=0, nullable=True)  # Correct usage of Integer for likes
    comments = Column(JSON, nullable=True)
    reports = Column(JSON, nullable=True)
    
    # Define relationships
    user = relationship("User", back_populates="trending_conversations")
    messages = relationship("Message", back_populates="trending_conversation", cascade="all, delete-orphan")

class Message(Base):
    __tablename__ = "messages"

    id = Column(CHAR(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    conversation_id = Column(CHAR(36), ForeignKey('conversations.id'), nullable=True)
    trending_conversation_id = Column(CHAR(36), ForeignKey('trending_conversations.id'), nullable=True)
    content = Column(Text, nullable=False)
    timestamp = Column(TIMESTAMP, server_default=func.now())
    is_trending = Column(Boolean, default=False)
    type = Column(String(10), nullable=False)

    # Define relationships
    conversation = relationship("Conversation", back_populates="messages")
    trending_conversation = relationship("TrendingConversation", back_populates="messages")