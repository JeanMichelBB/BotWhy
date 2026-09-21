# BotWhy

![BotWhy Banner](botwhy.png)

**BotWhy** is a full-stack AI chat application where the bot is sarcastic, witty, and intentionally unhelpful. Powered by multiple AI models via OpenRouter, with a pay-as-you-go credit system, Google sign-in, an admin panel, a React + Vite frontend, and a FastAPI backend deployed via GitOps.

## Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, React Router |
| Backend | FastAPI, SQLAlchemy, MySQL |
| Auth | Google Identity Services (client-side), backend-issued session token |
| AI | OpenRouter (GPT-4o, Claude, Gemini, Llama, and more), tiered by price |
| Payments | Stripe (pay-as-you-go credit packs, no subscription) |
| Rate limiting | slowapi (per-IP limits on AI calls) |
| Observability | Prometheus (`/metrics` + custom credit-ledger gauge), OpenTelemetry tracing → Tempo |
| Secrets | Doppler (`DopplerSecret` CRD syncs into a k8s `Secret`, auto-reloads on change) |
| Deployment | Docker (multi-arch), Kubernetes (k3s) via Kustomize, ArgoCD + ArgoCD Image Updater (GitOps) |
| Ingress | Traefik, public via Cloudflare |
| CI/CD | GitHub Actions — build, Trivy critical-CVE gate, push to Docker Hub |

An **admin panel** (role-gated) provides user management, credit adjustments, trending-post moderation, active-model override, and spend reconciliation against OpenRouter's billing API.

In production, this app connects to a shared MySQL instance — see [`shared-mysql`](https://github.com/JeanMichelBB/shared-mysql). It doesn't run its own database in k3s.

## Features

### Free Trial
- New users get **10 free messages** with no credit card required
- Free trial is limited to **gpt-4o-mini**
- A countdown shows how many messages are left
- After 10 messages, credits are required to continue

### Credits (Pay-As-You-Go)
- Buy a credit pack once via Stripe — no subscription, no auto-renewal
- Packs: **Starter ($1)**, **Standard ($5)**, **Pro ($10)** base credit, plus the Stripe processing fee (2.9% + $0.30) added at checkout
- Each AI response deducts the *actual* cost reported by OpenRouter (sub-cent precision)
- Balance is displayed in real time in the model picker
- Full transaction history available in Settings → Credits, and per-user in the admin panel

### AI Models
Model list is fetched live from OpenRouter, with a fallback price/tier table baked into the backend if that lookup fails. Models are grouped into 3 price tiers (cheap / medium / expensive) that drive the free-tier gate and the picker's tier dots — for example:

| Model | Provider | Tier |
|---|---|---|
| gpt-4o-mini | OpenAI | 1 (cheap) |
| gpt-4o / gpt-4 | OpenAI | 2 |
| claude-3-haiku | Anthropic | 1 |
| claude-3-sonnet / claude-3.5-sonnet | Anthropic | 2 |
| claude-3-opus | Anthropic | 3 |
| gemini-flash-1.5 | Google | 1 |
| gemini-pro-1.5 | Google | 2 |
| llama-3-8b / llama-3-70b-instruct | Meta | 1 |

The default model is set via `OPENROUTER_MODEL`, admins can override the active model at runtime (`/admin/settings/active-model`), and the user's picked model is remembered across sessions via `localStorage`.

### Trending Conversations
- Share a conversation publicly (up to 5 per user)
- Browse, like/unlike, and comment on other users' posts
- Report inappropriate posts; authors can delete their own posts (comments can be deleted by their author)
- Admins can moderate (view all, delete) from the admin panel

### Admin Panel
Role-gated (`role = "admin"`, granted via `ADMIN_EMAILS` on login). Provides:
- Paginated/searchable user list and detail view (balance, message count, transaction history)
- Manual credit adjustments with a required reason (audit-logged as a transaction)
- Soft-delete / reactivate users, promote/demote admin role
- View and moderate all trending posts
- View/filter all credit transactions
- Get/set the active AI model
- **Spend reconciliation** — cross-checks stored `spend` transactions against OpenRouter's generation billing API to catch cost-tracking drift

### Auth
- Google Identity Services on the frontend produces an ID token, which the backend verifies and exchanges for an opaque session token (`POST /user/login`)
- Soft-delete on account deletion — the user row, balance, and history are preserved; logging back in with the same Google account reactivates it

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

Create `backend-api/.env` (see `backend-api/.env.example`):

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

FREE_CREDITS_CENTS=500

GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

ADMIN_EMAILS=you@example.com

ENV=dev
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
| `DB_ROOT_PASSWORD` | MySQL root password (used by `dev.sh` for local provisioning) |
| `ORIGIN_URLS` | Comma-separated allowed CORS origins |
| `OPENROUTER_API_KEY` | OpenRouter API key |
| `OPENROUTER_MODEL` | Default model (e.g. `openai/gpt-4o-mini`) |
| `STRIPE_SECRET_KEY` | Stripe secret key |
| `STRIPE_PUBLISHABLE_KEY` | Stripe publishable key (served to frontend via `/config`) |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |
| `FREE_CREDITS_CENTS` | Free-trial credit grant, in cents |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID (verifies the frontend's ID token) |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `ADMIN_EMAILS` | Comma-separated emails auto-promoted to `role = "admin"` on login |
| `ENV` | Set to `production` to disable `/docs` and `/redoc` |

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

### Health
- `GET /health` — 503 until the DB is provisioned and reachable; used as the k8s readiness probe
- `GET /api/health` — alias of `/health`
- `GET /metrics` — Prometheus metrics (request stats + `botwhy_credit_transactions_last_hour` gauge)

### Auth / User
- `POST /user/login` — verify a Google ID token, create/reactivate the user, issue a session token
- `GET /user/logout` — invalidate the current session token
- `GET /user/protected` — verify token, returns `is_free_tier`, `free_messages_remaining`, `role`
- `DELETE /user/user/{user_id}` — soft-delete own account
- `DELETE /user/user/{user_id}/messages` — delete own messages
- `DELETE /user/user/{user_id}/trending_conversations` — delete own trending posts

### Chatbot
- `GET /chatbox/user/{user_id}/conversation` — get (or create) the user's conversation
- `GET /chatbox/conversation/{id}/messages` — get conversation messages
- `POST /chatbox/conversation/{id}/message` — send a user message
- `POST /openai/answer` — get an AI response (requires credits or free trial, rate-limited to 20/min/IP)

### Trending Conversations
- `GET /chatbox/trending_conversations` — list all trending posts
- `POST /chatbox/user/{user_id}/trending_conversation` — publish a conversation (max 5/user)
- `GET /chatbox/trending_conversation/{id}/messages` — get a trending post's messages
- `POST|DELETE /chatbox/trending_conversation/{id}/like` — like / unlike
- `POST|DELETE /chatbox/trending_conversation/{id}/comment` — add / delete a comment
- `POST /chatbox/trending_conversation/{id}/report` — report a post
- `DELETE /chatbox/trending_conversation/{id}` — delete own post

### Credits
- `GET /credits/balance` — get balance + transaction history
- `POST /credits/checkout` — create a Stripe PaymentIntent for a credit pack
- `POST /credits/webhook` — Stripe webhook handler (idempotent on `stripe_payment_id`)

### Config
- `GET /config` — Stripe publishable key + the active model and its price tier

### Admin (role = `admin`)
- `GET /admin/users`, `GET /admin/users/{id}` — search/paginate users, view detail
- `POST /admin/users/{id}/credit-adjustment` — manually adjust a user's balance
- `POST /admin/users/{id}/soft-delete`, `POST /admin/users/{id}/reactivate`
- `POST /admin/users/{id}/role` — promote/demote admin
- `GET /admin/trending`, `DELETE /admin/trending/{id}` — moderate trending posts
- `GET /admin/transactions` — filterable credit ledger
- `GET|PUT /admin/settings/active-model` — read/override the active AI model
- `POST /admin/reconcile-spend` — cross-check stored spend against OpenRouter's billing API

## Testing

```bash
cd backend-api
pytest
```

62 tests covering: credit deduction, free trial enforcement, Stripe webhook idempotency, model restriction, soft delete/reactivate, admin authorization, and more.

## Deployment

GitOps, not manual `kubectl apply`:

1. Push to `main` → GitHub Actions builds multi-arch (`amd64`/`arm64`) images for `frontend-react/` and `backend-api/`
2. Each image is scanned with Trivy (build fails on a fixable CRITICAL CVE) before it's pushed to Docker Hub as `:latest` and `:<git-sha>`
3. **ArgoCD Image Updater** (`k3s/image-updater.yaml`) watches Docker Hub for new 40-char-sha tags, updates `k3s/kustomization.yaml`, and commits the bump back to this repo (the `chore(deploy): bump image tag(s)` commits)
4. ArgoCD syncs the updated manifests to the k3s cluster

The `k3s/` directory is a Kustomize root:

| File | Purpose |
|---|---|
| `kustomization.yaml` | Kustomize entrypoint, pins current image tags |
| `backend-deployment.yaml` / `frontend-deployment.yaml` | Deployments + Services (backend also exposes a NodePort `:30083` for Prometheus scraping) |
| `doppler-secret.yaml` | `DopplerSecret` CRD — syncs the `botwhy-backend-secret` from Doppler, auto-reloads pods on change |
| `ingress.yaml` | Traefik ingress, public via Cloudflare (`botwhy.sacenpapier.org`, `botwhyapi.sacenpapier.org`) |
| `networkpolicy.yaml` | Restricts frontend ingress to Traefik; backend's `:8000` is left open (shared by the app and `/metrics`) |
| `image-updater.yaml` | ArgoCD Image Updater config |
| `secrets/botwhy-backend-secret.yml` | Bootstrap secret (not the Doppler-managed one) |

Manual local image build (for testing only):

```bash
docker build -t jeanmichelbb/oci-backend:latest ./backend-api
docker build -t jeanmichelbb/oci-frontend:latest ./frontend-react
```

## Troubleshooting

- **CORS errors** — Make sure `ORIGIN_URLS` includes your frontend origin (e.g. `http://localhost` for port 80)
- **402 on AI calls** — Free trial exhausted (10 messages used) or paid user balance is 0
- **403 on AI calls** — Free-tier user attempted to use a non-gpt-4o-mini model
- **Balance not updating** — Check the Stripe webhook is registered and `STRIPE_WEBHOOK_SECRET` is correct
- **401 Unauthorized** — `GOOGLE_CLIENT_ID` misconfigured, or the session token expired/was invalidated by logout
- **403 on admin routes** — the account's email isn't in `ADMIN_EMAILS` (role is only granted/re-checked at login)
- **Local OpenAI/OpenRouter timeouts** — see [`docs/incidents/2026-06-11-openai-timeout-local-dev.md`](docs/incidents/2026-06-11-openai-timeout-local-dev.md)
