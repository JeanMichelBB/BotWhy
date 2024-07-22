# app/models/models.py
from sqlalchemy import CHAR, JSON, TIMESTAMP, Column, String, ForeignKey, Text, func, BOOLEAN
from sqlalchemy.orm import relationship
import uuid
from app.core.database import Base  # Import Base from your database module

class User(Base):
    __tablename__ = "users"

    id = Column(CHAR(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    username = Column(String(255), index=True, nullable=False, unique=True)
    email = Column(String(255), index=True, nullable=False, unique=True)
    password_hash = Column(String(255), nullable=False)
    first_name = Column(String(255), nullable=False)
    last_name = Column(String(255), nullable=False)
    profile_picture = Column(String(255), nullable=True)
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())
    last_login = Column(TIMESTAMP, nullable=True)
    is_active = Column(BOOLEAN, default=True)
    is_admin = Column(BOOLEAN, default=False)
    preferences = Column(JSON, nullable=True)
    subscription_level = Column(String(50), nullable=True)
    social_logins = Column(JSON, nullable=True)
    notification_settings = Column(JSON, nullable=True)

    conversations = relationship("Conversation", back_populates="user")
    trending_conversations = relationship("TrendingConversation", back_populates="user")

class Conversation(Base):
    __tablename__ = "conversations"

    id = Column(CHAR(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(CHAR(36), ForeignKey('users.id'), nullable=False)
    created_at = Column(TIMESTAMP, server_default=func.now())
    
    user = relationship("User", back_populates="conversations")
    messages = relationship("Message", back_populates="conversation")

class Message(Base):
    __tablename__ = "messages"

    id = Column(CHAR(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    conversation_id = Column(CHAR(36), ForeignKey('conversations.id'), nullable=False)
    sender = Column(String(50), nullable=False)  # 'user' or 'ai'
    receiver = Column(String(50), nullable=False)  # 'ai' or 'user'
    content = Column(Text, nullable=False)
    timestamp = Column(TIMESTAMP, server_default=func.now())
    is_trending = Column(BOOLEAN, default=False)  # Indicates if the message is selected for trending
    
    conversation = relationship("Conversation", back_populates="messages")

class TrendingConversation(Base):
    __tablename__ = "trending_conversations"

    id = Column(CHAR(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(CHAR(36), ForeignKey('users.id'), nullable=False)
    conversation_id = Column(CHAR(36), ForeignKey('conversations.id'), nullable=False)
    title = Column(String(255), nullable=False)  # Title for the trending conversation
    created_at = Column(TIMESTAMP, server_default=func.now())
    
    user = relationship("User", back_populates="trending_conversations")
    conversation = relationship("Conversation")

# Define relationship in Conversation class
Conversation.trending_conversations = relationship("TrendingConversation", back_populates="conversation")