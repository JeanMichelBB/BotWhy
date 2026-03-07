# Backend API

FastAPI backend with MySQL, Google OAuth, and OpenAI integration.

## Requirements

- Python 3.10+
- MySQL (via Homebrew on macOS)

## Setup

1. Clone the repository

2. Create and activate a virtual environment

```bash
python -m venv venv
source venv/bin/activate
```

3. Install dependencies

```bash
pip install -r requirements.txt
```

4. Create a `.env` file at the root of `backend-api/`

```env
DB_USER=user
DB_PASSWORD=yourpassword
DB_HOST=localhost
DB_NAME=chatbox_db
DB_ROOT_PASSWORD=yourrootpassword

ORIGIN_URLS=http://localhost:80

SQLALCHEMY_DATABASE_URL=mysql+pymysql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}/${DB_NAME}

OPENAI_API_KEY=your_openai_key

GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:8000/auth/google/callback
```

## Development

Run the dev script to set up MySQL, then start the API:

```bash
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

`dev.sh` runs automatically on startup to install and configure MySQL using `DB_ROOT_PASSWORD` from `.env`.

## Docker

```bash
docker build -t backend-api .
docker run -p 8000:8000 --env-file .env backend-api
```

## API Docs

Available at `http://localhost:8000/docs` (disabled in production).

## Project Structure

```
app/
  api/endpoints/   # Route handlers (user, chatbox, openai)
  core/            # Database connection and config
  models/          # SQLAlchemy models, schemas, seed data
  utils/           # AI utilities
tests/             # Test suite
dev.sh             # Local MySQL setup script
dockerfile         # Container image
```
