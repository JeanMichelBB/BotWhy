import os
from fastapi import APIRouter

router = APIRouter()

@router.get("")
def get_config():
    return {"stripe_publishable_key": os.getenv("STRIPE_PUBLISHABLE_KEY", "")}
