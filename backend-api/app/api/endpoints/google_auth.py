# google_auth.py
from fastapi import FastAPI, Depends, Request, HTTPException
from authlib.integrations.starlette_client import OAuth
from starlette.config import Config
from starlette.responses import RedirectResponse
import os
from dotenv import load_dotenv

load_dotenv()

config_data = {
    "GOOGLE_CLIENT_ID": os.getenv("GOOGLE_CLIENT_ID"),
    "GOOGLE_CLIENT_SECRET": os.getenv("GOOGLE_CLIENT_SECRET")
}

config = Config(environ=config_data)
oauth = OAuth(config)

oauth.register(
    name='google',
    client_id=config_data["GOOGLE_CLIENT_ID"],
    client_secret=config_data["GOOGLE_CLIENT_SECRET"],
    authorize_url='https://accounts.google.com/o/oauth2/auth',
    authorize_params=None,
    access_token_url='https://accounts.google.com/o/oauth2/token',
    access_token_params=None,
    refresh_token_url=None,
    redirect_uri='http://localhost:8000/auth/google/callback',
    client_kwargs={'scope': 'openid profile email'}
)

async def login_with_google(request: Request):
    redirect_uri = request.url_for('auth_google_callback')
    return await oauth.google.authorize_redirect(request, redirect_uri)

async def auth_google_callback(request: Request):
    token = await oauth.google.authorize_access_token(request)
    user = await oauth.google.parse_id_token(request, token)
    if not user:
        raise HTTPException(status_code=400, detail="Failed to fetch user information")
    request.session['user'] = dict(user)
    return RedirectResponse(url='/')

async def auth_status(request: Request):
    user = request.session.get('user')
    if not user:
        return {'isLoggedIn': False}
    return {'isLoggedIn': True, 'user': user}

async def logout(request: Request):
    request.session.pop('user', None)
    return RedirectResponse(url='/')