# app/main.py
from fastapi import FastAPI, Request, Security, HTTPException
from fastapi.security import APIKeyHeader
from fastapi.responses import JSONResponse
from fastapi.openapi.utils import get_openapi
from app.api.endpoints import chatbox, user
from app.core.database import engine, Base
from dotenv import load_dotenv
from app.core.seed import seed_data
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware
from app.api.endpoints.google_auth import login_with_google, auth_google_callback, auth_status, logout
import os

# Load environment variables from .env
load_dotenv()

# Initialize FastAPI app
app = FastAPI()

# API Key setup
SECRET_KEY = os.getenv("SECRET_KEY")  # , "your_secret_key"

api_key_header = APIKeyHeader(name="access-token", auto_error=False)

app.add_middleware(SessionMiddleware, secret_key=os.getenv("SECRET_KEY"))

@app.get("/auth/google")
async def google_login(request: Request):
    return await login_with_google(request)

@app.get("/auth/google/callback")
async def google_callback(request: Request):
    return await auth_google_callback(request)

@app.get("/auth/status")
async def status(request: Request):
    return await auth_status(request)

@app.get("/auth/logout")
async def auth_logout(request: Request):
    return await logout(request)

def get_api_key(api_key_header: str = Security(api_key_header)):
    if api_key_header == SECRET_KEY:
        return api_key_header
    else:
        raise HTTPException(status_code=403, detail="Could not validate credentials")

@app.middleware("http")
async def api_key_middleware(request: Request, call_next):
    if request.url.path not in ["/docs", "/openapi.json", "/login"]:
        api_key = request.headers.get("access-token")
        if api_key != SECRET_KEY:
            return JSONResponse(status_code=403, content={"detail": "Could not validate credentials"})
    response = await call_next(request)
    return response

# Custom OpenAPI schema
def custom_openapi():
    if app.openapi_schema:
        return app.openapi_schema
    openapi_schema = get_openapi(
        title="FastAPI",
        version="1.0.0",
        description="API for Twitter Clone",
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

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Allow requests from this origin
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],  # Add methods you need
    allow_headers=["*"],
)

# Include routers from your endpoints
app.include_router(chatbox.router)
app.include_router(user.router, prefix="/user", tags=["user"])

# Create the database tables
Base.metadata.create_all(bind=engine)

# Seed initial data
seed_data()