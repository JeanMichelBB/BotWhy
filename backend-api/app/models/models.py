# app/models/models.py
from sqlalchemy import Integer, Float, String, JSON, TIMESTAMP, Column, ForeignKey, Text, func, Boolean
from sqlalchemy.dialects.mysql import CHAR  # Import CHAR for MySQL compatibility
from sqlalchemy.orm import relationship
import uuid
from app.core.database import Base

class User(Base):
    __tablename__ = "users"

    user_id = Column(CHAR(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String(255), nullable=False, unique=True)
    given_name = Column(String(255), nullable=True)
    created_at = Column(TIMESTAMP, server_default=func.now())
    token = Column(String(255), nullable=True)
    message_count = Column(Integer, default=0, nullable=True)
    trending_conversation_count = Column(Integer, default=0, nullable=True)
    credit_balance_cents = Column(Float, nullable=False, default=0.0)
    is_deleted = Column(Boolean, nullable=False, default=False)
    deleted_at = Column(TIMESTAMP, nullable=True)
    role = Column(String(20), nullable=False, default="user")

    # Define relationships
    conversations = relationship("Conversation", back_populates="user", cascade="all, delete-orphan")
    trending_conversations = relationship("TrendingConversation", back_populates="user", cascade="all, delete-orphan")
    credit_transactions = relationship("CreditTransaction", back_populates="user")

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
    likes = Column(Integer, default=0, nullable=True)
    liked_by = Column(JSON, nullable=True)
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

class CreditTransaction(Base):
    __tablename__ = "credit_transactions"

    id = Column(CHAR(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(CHAR(36), ForeignKey('users.user_id'), nullable=False)
    amount_cents = Column(Float, nullable=False)
    type = Column(String(20), nullable=False)  # 'purchase' | 'spend' | 'free_grant'
    description = Column(String(255), nullable=True)
    stripe_payment_id = Column(String(255), nullable=True)
    provider_generation_id = Column(String(255), nullable=True)
    created_at = Column(TIMESTAMP, server_default=func.now())

    user = relationship("User", back_populates="credit_transactions")


class AppSetting(Base):
    __tablename__ = "app_settings"

    key = Column(String(64), primary_key=True)
    value = Column(String(255), nullable=False)
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())


def get_active_model(db, default: str) -> str:
    setting = db.query(AppSetting).filter_by(key="active_model").first()
    return setting.value if setting else default


def set_active_model(db, value: str) -> None:
    setting = db.query(AppSetting).filter_by(key="active_model").first()
    if setting:
        setting.value = value
    else:
        db.add(AppSetting(key="active_model", value=value))
    db.commit()