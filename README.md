# BotWhy

![BotWhy Banner](botwhy.png)

**BotWhy** is a full-stack AI chat application where the bot is sarcastic, witty, and intentionally unhelpful. Powered by multiple AI models via OpenRouter, with a pay-as-you-go credit system, Google OAuth authentication, a React + Vite frontend, and a FastAPI backend.

## Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, React Router |
| Backend | FastAPI, SQLAlchemy, MySQL |
| Auth | Google OAuth 2.0, JWT |
| AI | OpenRouter (GPT-4o, Claude, Gemini, Llama, and more) |
| Payments | Stripe (pay-as-you-go, no subscription) |
| Deployment | Docker, Kubernetes (k3s) |
| CI/CD | GitHub Actions |

## Features

### Free Trial
- New users get **10 free messages** with no credit card required
- Free trial is limited to **gpt-4o-mini**
- A countdown shows how many messages are left
- After 10 messages, credits are required to continue

### Credits (Pay-As-You-Go)
- Buy credit packs once via Stripe — no subscription, no auto-renewal
- Credits are deducted per message based on the model and message length
- Balance is displayed in real time in the model picker
- Full transaction history available in Settings → Credits

### AI Models
Paid users can choose from 8 models:

| Model | Provider | Price (input / 1M tokens) |
|---|---|---|
| gpt-4o-mini | OpenAI | $0.15 |
| gpt-4o | OpenAI | $2.50 |
| claude-3-haiku | Anthropic | $0.25 |
| claude-sonnet-4.5 | Anthropic | $3.00 |
| claude-opus-4.5 | Anthropic | $15.00 |
| gemini-2.5-flash | Google | $0.15 |
| gemini-2.5-pro | Google | $1.25 |
| llama-3.3-70b | Meta | $0.59 |

The selected model is remembered across sessions.

### Other
- **Trending Conversations** — share and browse funny exchanges
- **Google Login** — sign in securely with your Google account

## Prerequisites

- [Node.js 18+](https://nodejs.org/)
- [Python 3.10+](https://www.python.org/downloads/)
- [MySQL](https://dev.mysql.com/downloads/)
- [Docker](https://www.docker.com/get-started)

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

Create `backend-api/.env`:

```env
DB_USER=user
DB_PASSWORD=yourpassword
DB_HOST=localhost
DB_NAME=chatbox_db
DB_ROOT_PASSWORD=yourrootpassword
SQLALCHEMY_DATABASE_URL=mysql+pymysql://user:yourpassword@localhost/chatbox_db
ORIGIN_URLS=http://localhost,http://localhost:5173

OPENROUTER_API_KEY=sk-or-...
OPENROUTER_MODEL=openai/gpt-4o-mini

STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=http://localhost:8000/auth/google/callback
```

Start the backend:

```bash
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

### Frontend

```bash
cd frontend-react
npm install
```

Create `frontend-react/.env.development`:

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
| `DB_PASSWORD` | MySQL password |
| `DB_HOST` | MySQL host |
| `DB_NAME` | Database name |
| `ORIGIN_URLS` | Comma-separated allowed CORS origins |
| `OPENROUTER_API_KEY` | OpenRouter API key |
| `OPENROUTER_MODEL` | Default model (e.g. `openai/gpt-4o-mini`) |
| `STRIPE_SECRET_KEY` | Stripe secret key |
| `STRIPE_PUBLISHABLE_KEY` | Stripe publishable key (served to frontend via `/config`) |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `GOOGLE_REDIRECT_URI` | Google OAuth redirect URI |

### Frontend

| File | Used for |
|---|---|
| `.env.development` | Local dev — `VITE_API_URL=http://localhost:8000` |
| `.env.production` | Production build — `VITE_API_URL=https://yourdomain.com` |

Note: the Stripe publishable key is fetched from the backend at runtime, not from the frontend env.

## Database Migration

Run once on a fresh database or when upgrading from a previous version:

```sql
ALTER TABLE users
  ADD COLUMN credit_balance_cents FLOAT NOT NULL DEFAULT 0,
  ADD COLUMN is_deleted TINYINT(1) NOT NULL DEFAULT 0,
  ADD COLUMN deleted_at DATETIME NULL;

CREATE TABLE IF NOT EXISTS credit_transactions (
  id CHAR(36) NOT NULL DEFAULT (UUID()),
  user_id CHAR(36) NOT NULL,
  amount_cents FLOAT NOT NULL,
  type VARCHAR(50) NOT NULL,
  description VARCHAR(255) NULL,
  stripe_payment_id VARCHAR(255) NULL,
  created_at DATETIME NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id),
  KEY idx_user_id (user_id)
);
```

## API Endpoints

### Auth
- `GET /auth/google` — Redirect to Google OAuth
- `GET /auth/google/callback` — Handle OAuth callback

### User
- `GET /user/protected` — Verify token, returns `is_free_tier` + `free_messages_remaining`

### Chatbot
- `POST /chatbox/conversation/{id}/message` — Send a user message
- `GET /chatbox/conversation/{id}/messages` — Get conversation messages
- `POST /openai/answer` — Get AI response (requires credits or free trial)

### Credits
- `GET /credits/balance` — Get balance + transaction history
- `POST /credits/checkout` — Create Stripe PaymentIntent
- `POST /credits/webhook` — Stripe webhook handler

## Testing

```bash
cd backend-api
pytest
```

21 tests covering: credit deduction, free trial enforcement, Stripe webhook idempotency, model restriction, soft delete, and more.

## Deployment

```bash
docker build -t jeanmichelbb/oci-backend:latest ./backend-api
docker push jeanmichelbb/oci-backend:latest
kubectl apply -f k3s/secrets/botwhy-backend-secret.yml
kubectl apply -f k3s/
```

## Troubleshooting

- **CORS errors** — Make sure `ORIGIN_URLS` includes your frontend origin (e.g. `http://localhost` for port 80)
- **402 on AI calls** — Free trial exhausted (10 messages used) or paid user balance is 0
- **403 on AI calls** — Free-tier user attempted to use a non-gpt-4o-mini model
- **Balance not updating** — Check the Stripe webhook is registered and `STRIPE_WEBHOOK_SECRET` is correct
- **401 Unauthorized** — Google OAuth credentials or redirect URI misconfigured
