# app/main.py
from fastapi import FastAPI
from app.api.endpoints import chatbox
from app.core.database import engine, Base
from dotenv import load_dotenv
from app.core.seed import seed_data
from fastapi.middleware.cors import CORSMiddleware
import os

# Load environment variables from .env
load_dotenv()

# Initialize FastAPI app
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],  # Add methods you need
    allow_headers=["*"],
)

# Include router from your endpoints
app.include_router(chatbox.router)

# Create the database tables
Base.metadata.create_all(bind=engine)

# Seed initial data
seed_data()