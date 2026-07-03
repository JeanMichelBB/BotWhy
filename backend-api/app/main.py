# app/main.py

from fastapi import Depends, FastAPI, Request, HTTPException
from fastapi.security import OAuth2PasswordBearer
from fastapi.openapi.utils import get_openapi
from app.api.endpoints import chatbox, user, openai, credits, config
from app.core.database import engine, Base
from dotenv import load_dotenv
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware
import os
from google.oauth2 import id_token
from google.auth.transport import requests
from app.models.seed import seed_database
from app.core.database import wait_for_db, create_all_tables, get_db, provision_db
import logging
import subprocess
import pathlib

logger = logging.getLogger(__name__)
from sqlalchemy.orm import Session
from sqlalchemy.exc import OperationalError


# Load environment variables from .env
load_dotenv()

# Initialize FastAPI app
app = FastAPI(
    docs_url=None if os.getenv("ENV") == "production" else "/docs",
    redoc_url=None if os.getenv("ENV") == "production" else "/redoc",
)

app.state.db_ready = False

@app.on_event("startup")
def startup_event():
    dev_script = pathlib.Path(__file__).parent.parent / "dev.sh"
    if dev_script.exists():
        logger.info("Running dev.sh...")
        subprocess.run(["bash", str(dev_script)], check=False)

    try:
        provision_db(max_retries=3, base_delay=1)
        wait_for_db(max_retries=3, base_delay=1)
        create_all_tables()
        app.state.db_ready = True
    except Exception as e:
        logger.error(f"Database not available at startup: {e}")

@app.get("/health", tags=["health"])
def health():
    if not app.state.db_ready:
        raise HTTPException(status_code=503, detail="Database not ready")
    return {"status": "ok"}
    
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

origins = [o.strip() for o in os.getenv("ORIGIN_URLS", "").split(",") if o.strip()]

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
app.include_router(credits.router, prefix="/credits", tags=["credits"])
app.include_router(config.router, prefix="/config", tags=["config"])
