# app/models/schemas.py
from typing import List, Optional
from pydantic import BaseModel

class UserBase(BaseModel):
    id: int
    username: str
    email: str
    full_name: Optional[str] = None
    is_active: bool = True
    
    
class Item (BaseModel):
    name: str
    description: Optional[str] = None
    price: float
    tax: Optional[float] = None
    tags: List[str] = []
    
