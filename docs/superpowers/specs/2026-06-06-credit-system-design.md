# Credit System Design
**Date:** 2026-06-06  
**Project:** BotWhy  
**Stack:** FastAPI + MySQL + SQLAlchemy + Alembic + Google OAuth

---

## Goal

Replace the existing per-user message limit with a credit system that:
- Mirrors exact OpenRouter API costs (no markup)
- Accepts payments via Stripe (no card data stored)
- Prevents abuse via soft delete (re-signup does not reset balance)
- Gives new users free starter credits

---

## AI Provider: OpenRouter

Switch from OpenAI direct to OpenRouter. Drop-in replacement — same `openai` SDK, different base URL and key.

```python
client = openai.OpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=os.getenv("OPENROUTER_API_KEY"),
)
```

OpenRouter returns `response.usage.cost` (USD float) on every completion. This is the source of truth for credit deduction.

**Env vars:**
- Remove: `OPENAI_API_KEY`
- Add: `OPENROUTER_API_KEY`

---

## Credit Unit

**1 credit = $0.01 USD**

Credits stored as integers (cents) to avoid floating point bugs.

- OpenRouter cost $0.0234 → `round(0.0234 * 100)` = 2 cents deducted
- User buys $5 pack → 500 credits added

---

## Data Model

### User table — new column
```sql
credit_balance_cents  INTEGER  NOT NULL  DEFAULT 0
is_deleted            BOOLEAN  NOT NULL  DEFAULT FALSE
deleted_at            TIMESTAMP NULL
```

### New table: `credit_transactions`
```sql
id                CHAR(36)      PK
user_id           CHAR(36)      FK → users.user_id
amount_cents      INTEGER       NOT NULL  -- positive=credit, negative=debit
type              VARCHAR(20)   NOT NULL  -- 'purchase' | 'spend' | 'free_grant'
description       VARCHAR(255)
stripe_payment_id VARCHAR(255)  NULL      -- only on 'purchase' rows
created_at        TIMESTAMP     server_default=now()
```

---

## Free Tier

On new user creation: insert one `free_grant` transaction + set `credit_balance_cents = FREE_CREDITS_CENTS`.

```
FREE_CREDITS_CENTS=500  (= $5.00 free)
```

Configurable via env var. Only granted once — re-activated soft-deleted accounts do NOT receive a second grant.

---

## Credit Guard

Dependency added to all AI endpoints:

```python
def require_credits(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.credit_balance_cents <= 0:
        raise HTTPException(status_code=402, detail="Insufficient credits")
    return current_user
```

Returns `402 Payment Required`. Frontend catches this and shows buy-credits modal.

---

## Credit Deduction Flow

After every successful OpenRouter API call:

1. Extract `cost_cents = round(response.usage.cost * 100)`
2. Deduct: `user.credit_balance_cents -= cost_cents`
3. Insert `credit_transactions` row: `type='spend'`, `amount_cents=-cost_cents`, `description=<model name>`
4. Commit in same DB transaction — if commit fails, do not charge user

---

## Stripe Payment Flow

User never touches card data. Stripe Elements collects it directly in the browser.

```
User → POST /credits/checkout {pack_id}
Backend → Stripe: create PaymentIntent {amount, currency, metadata}
Backend → return {client_secret} to frontend
Frontend → Stripe Elements renders card UI → user pays
Stripe → POST /credits/webhook (server-to-server, signed)
Backend → verify Stripe signature
  → payment_intent.succeeded → top up balance + insert 'purchase' row
  → idempotent: check stripe_payment_id not already in credit_transactions
```

### Credit Packs

| Pack ID  | Price  | Credits |
|----------|--------|---------|
| starter  | $5.00  | 500     |
| standard | $10.00 | 1000    |
| pro      | $25.00 | 2500    |

Configurable in code, not DB (no dynamic pricing needed).

### New Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/credits/checkout` | Create Stripe PaymentIntent, return `client_secret` |
| POST | `/credits/webhook` | Stripe webhook — top up on success |
| GET  | `/credits/balance` | Return balance + last 20 transactions |

---

## Soft Delete (Re-signup Abuse Prevention)

### Problem
Hard-deleting a user allows re-signup with the same email → new `free_grant` → infinite free credits.

### Fix
Never hard-delete users. Set `is_deleted=True` + `deleted_at=now()`.

### Login/Signup logic (Google OAuth)
```
Email found + is_deleted=False  → normal login
Email found + is_deleted=True   → reactivate (set is_deleted=False, deleted_at=NULL), return existing user
Email not found                 → create new user + free_grant
```

### Delete endpoint
```python
user.is_deleted = True
user.deleted_at = func.now()
# do NOT delete row or zero out balance
```

---

## Tickets

### Ticket 1 — OpenRouter swap
- Swap `app/utils/ai.py`: change base URL + key
- Update `.env.example`: remove `OPENAI_API_KEY`, add `OPENROUTER_API_KEY`
- **Tests:** mock OpenRouter response with `usage.cost`, assert `cost_cents` math (e.g. $0.0234 → 2), assert $0.005 rounds to 1 (not 0)

### Ticket 2 — DB migration: credit schema
- Alembic migration: add `credit_balance_cents`, `is_deleted`, `deleted_at` to `User`
- Create `credit_transactions` table
- **Tests:** migration runs `upgrade` and `downgrade` cleanly, User default balance = 0, `is_deleted` defaults False

### Ticket 3 — Free credits on signup
- On user creation: set `credit_balance_cents = FREE_CREDITS_CENTS`, insert `free_grant` row
- **Tests:** new user has correct balance, transaction row type=`free_grant`, amount=`FREE_CREDITS_CENTS`, second signup with same email does NOT insert second grant

### Ticket 4 — Credit deduction after AI call
- Post-completion: deduct cost, insert `spend` row, commit atomically
- **Tests:** balance decreases by correct cents, transaction inserted, failed DB commit does not charge user, zero-cost response (cost=0.0) inserts no row

### Ticket 5 — Credit guard dependency
- Add `require_credits` to chatbox endpoint
- **Tests:** user with 0 credits → 402, user with 1 credit → passes, balance check happens before OpenRouter call (no API call made when credits=0)

### Ticket 6 — Stripe checkout endpoint
- `POST /credits/checkout {pack_id}` → create PaymentIntent → return `{client_secret}`
- **Tests:** mock Stripe SDK, valid pack_id → correct amount in PaymentIntent, unknown pack_id → 400

### Ticket 7 — Stripe webhook handler
- `POST /credits/webhook` → verify signature → top up balance
- **Tests:** valid signature + `payment_intent.succeeded` → balance increases + purchase row inserted; invalid signature → 400; duplicate `stripe_payment_id` → idempotent (no double top-up)

### Ticket 8 — Balance endpoint
- `GET /credits/balance` → `{balance_cents, balance_display, transactions: [...]}`
- **Tests:** returns correct balance, transactions ordered `created_at DESC`, limited to last 20

### Ticket 9 — Soft delete + re-signup guard
- Add `is_deleted`, `deleted_at` to User model
- Change delete endpoint to soft delete
- Change Google OAuth signup to reactivate soft-deleted accounts
- **Tests:** delete user → row still exists with `is_deleted=True`; re-login with same email → same `user_id` returned, balance unchanged, no new `free_grant` row; new email → fresh user + grant

---

## Out of Scope
- Subscription/recurring billing
- Per-model credit pricing tiers
- Admin credit override UI
- Refunds
