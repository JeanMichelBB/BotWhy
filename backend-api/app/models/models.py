# app/models/models.py

from sqlalchemy import Boolean, Column, Integer, String
from sqlalchemy.ext.declarative import declarative_base
from app.core.database import Base
import uuid  # Import uuid module for generating unique IDs

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(32), index=True, nullable=False, unique=True)  # Adjust length to fit UUID
    email = Column(String, index=True, nullable=False, unique=True)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String)
    is_active = Column(Boolean, default=True)
