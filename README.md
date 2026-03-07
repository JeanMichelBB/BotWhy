# BotWhy

![BotWhy Banner](botwhy.png)

**BotWhy** is a full-stack AI chat application powered by OpenAI's GPT-4o Mini, with Google OAuth authentication, a React + Vite frontend, a FastAPI backend, and a MySQL database.

## Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, React Router |
| Backend | FastAPI, SQLAlchemy, MySQL |
| Auth | Google OAuth 2.0, JWT |
| AI | OpenAI GPT-4o Mini |
| Deployment | Docker, Kubernetes (k3s) |
| CI/CD | GitHub Actions |

## Prerequisites

- [Node.js 18+](https://nodejs.org/)
- [Python 3.10+](https://www.python.org/downloads/)
- [MySQL](https://dev.mysql.com/downloads/) (or via Homebrew: `brew install mysql`)
- [Docker](https://www.docker.com/get-started) (for containerized deployment)

## Setup

### Clone the Repository

```bash
git clone https://github.com/JeanMichelBB/BotWhy.git
cd BotWhy
```

### Backend

```bash
cd backend-api
python -m venv venv
source venv/bin/activate       # macOS/Linux
# venv\Scripts\activate        # Windows
pip install -r requirements.txt
```

Create a `.env` file in `backend-api/` — see [backend-api/README.md](./backend-api/README.md) for all required variables.

Start the backend (also sets up MySQL automatically via `dev.sh`):

```bash
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

### Frontend

```bash
cd frontend-react
npm install
```

Create a `.env` file in `frontend-react/`:

```env
VITE_API_URL=http://localhost:8000
```

Start the frontend:

```bash
npm run dev
```

Frontend runs on `http://localhost:80`, backend on `http://localhost:8000`.

## Environment Variables

### Backend (`backend-api/.env`)

| Variable | Description |
|---|---|
| `DB_USER` | MySQL user |
| `DB_PASSWORD` | MySQL user password |
| `DB_HOST` | MySQL host |
| `DB_NAME` | Database name |
| `DB_ROOT_PASSWORD` | MySQL root password |
| `ORIGIN_URLS` | Allowed CORS origins |
| `OPENAI_API_KEY` | OpenAI API key |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `GOOGLE_REDIRECT_URI` | Google OAuth redirect URI |

### Frontend (`frontend-react/.env`)

| Variable | Description |
|---|---|
| `VITE_API_URL` | Backend API base URL |

## Directory Structure

```
BotWhy/
  backend-api/       # FastAPI backend
    app/             # API, models, core, utils
    tests/           # Test suite
    dev.sh           # Local MySQL setup script
    dockerfile       # Backend container image
  frontend-react/    # React frontend
    src/             # Components, pages, utils
  k3s/               # Kubernetes manifests
  .github/workflows/ # CI/CD pipelines
```

## API Endpoints

### Authentication

- `GET /auth/google` — Redirect to Google OAuth
- `GET /auth/google/callback` — Handle OAuth callback

### User

- `GET /user/protected` — Verify auth token

### Chatbot

- `POST /chatbox/conversation` — Create a new conversation
- `GET /chatbox/conversation/{id}/messages` — Get messages from a conversation

## Deployment

The backend is containerized and deployed on a k3s Kubernetes cluster via GitHub Actions.

```bash
docker build -t jeanmichelbb/oci-backend:latest ./backend-api
docker push jeanmichelbb/oci-backend:latest
kubectl apply -f k3s/
```

## Testing

```bash
# Backend
cd backend-api
pytest

# Frontend
cd frontend-react
npm run lint
```

## Troubleshooting

- **Database connection issues** — Verify MySQL is running and `.env` credentials are correct.
- **CORS errors** — Make sure `ORIGIN_URLS` in the backend `.env` matches your frontend URL.
- **401 Unauthorized** — Check that the Google OAuth credentials and redirect URI are correctly configured.
