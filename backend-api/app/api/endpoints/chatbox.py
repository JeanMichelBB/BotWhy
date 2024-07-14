# app/api/endpoints/chatbox.py
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models import models  # Adjust the import according to your models structure
from app.models import schemas  # Adjust the import according to your schemas structure

router = APIRouter()

@router.get("/items/")
def read_items():
    return {"message": "Hello World"}

# Add more endpoints as needed

# diplay the table users 

@router.get("/users/")
def read_users(db: Session = Depends(get_db)):
    # get user form thable users
    users = db.query(models.User).all()
    return users
