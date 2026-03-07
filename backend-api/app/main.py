# app/main.py

from fastapi import Depends, FastAPI, Request, HTTPException
from fastapi.security import OAuth2PasswordBearer
from fastapi.openapi.utils import get_openapi
from app.api.endpoints import chatbox, user, openai
from app.core.database import engine, Base
from dotenv import load_dotenv
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware
import os
from google.oauth2 import id_token
from google.auth.transport import requests
from app.models.seed import seed_database
from app.core.database import wait_for_db, create_all_tables, get_db
from sqlalchemy.orm import Session
from sqlalchemy.exc import OperationalError


# Load environment variables from .env
load_dotenv()

# Initialize FastAPI app
app = FastAPI(
    docs_url=None if os.getenv("ENV") == "production" else "/docs",
    redoc_url=None if os.getenv("ENV") == "production" else "/redoc",
)

@app.on_event("startup")
def startup_event():
    wait_for_db()
    create_all_tables()
    
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

# Set the Google client ID in the application state
app.state.google_client_id = os.getenv("GOOGLE_CLIENT_ID")

# Import and include your router
from app.api.endpoints import user
app.include_router(user.router)

ENV = os.getenv("ENV", "dev")

# Custom OpenAPI schema
def custom_openapi():
    if app.openapi_schema:
        return app.openapi_schema
    openapi_schema = get_openapi(
        title="FastAPI",
        version="1.0.0",
        description="API",
        routes=app.routes,
    )
    api_key_security_scheme = {
        "type": "apiKey",
        "name": "access-token",
        "in": "header",
    }
    openapi_schema["components"]["securitySchemes"] = {
        "access-token": api_key_security_scheme
    }
    openapi_schema["security"] = [{"access-token": []}]
    app.openapi_schema = openapi_schema
    return app.openapi_schema

app.openapi = custom_openapi

origins = os.getenv("ORIGIN_URLS")

# Add CORS middleware for localhost and production
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include the routers
app.include_router(user.router, prefix="/user", tags=["user"])
app.include_router(chatbox.router, prefix="/chatbox", tags=["chatbox"])
app.include_router(openai.router, prefix="/openai", tags=["openai"])

# Create the database tables
Base.metadata.create_all(bind=engine)