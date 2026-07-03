# Free Tier Model Restriction Design

**Goal:** Restrict new users to `gpt-4o-mini` and show a message countdown during their 10-message free trial; lift all restrictions once they make a purchase.

**Architecture:** Detect free tier via absence of any `type='purchase'` transaction — no schema changes needed. Backend enforces the model restriction and enriches `/user/protected` with tier status. Frontend uses that data to gate the model picker and swap the button dot for a countdown number.

**Tech Stack:** FastAPI, SQLAlchemy, React 18, existing `useCredits` hook, existing `CreditTransaction` model.

---

## Free Tier Definition

A user is **free tier** when they have zero `CreditTransaction` rows with `type='purchase'`.
A user becomes **paid** the moment the Stripe webhook writes a `purchase` transaction — regardless of balance.

The 10-message free trial maps to the existing `message_count` field on `User`. `free_messages_remaining = max(0, 10 - message_count)`.

---

## Backend Changes

### `GET /user/protected` — enrich response
Add two fields to the existing response:
- `is_free_tier: bool` — true if no purchase transaction exists
- `free_messages_remaining: int` — `max(0, 10 - user.message_count)`, only meaningful when `is_free_tier` is true

**Computation:** single `db.query(CreditTransaction).filter_by(user_id=user.user_id, type='purchase').count() == 0`

### `POST /openai/answer` — enforce model
If `is_free_tier` and `model != 'openai/gpt-4o-mini'`:
→ raise `HTTPException(403, "Free tier is limited to gpt-4o-mini. Buy credits to unlock all models.")`

---

## Frontend Changes

### `App.jsx` — store tier state
Parse `is_free_tier` and `free_messages_remaining` from `/user/protected` response and pass down to `Home` via props (or a context if preferred — props is fine here since only `Home` needs it).

### `Home.jsx` — model button
- Free tier: render the countdown number instead of `<span className="chatbox__model-dot" />`
- Paid: render dot as today

### `Home.jsx` — model picker (free tier)
Header area gets a free tier notice:
> "Free trial · X messages left. Buy credits to unlock all models."
> [Buy Credits →] link to `/credits`

Each non-`gpt-4o-mini` model row:
- Grayed out (opacity 0.4)
- Not clickable
- Shows "🔒 Upgrade" label instead of tier dots + price

`gpt-4o-mini` row gets a small "Free" badge.

### `Home.css`
- `.chatbox__model-btn--free`: font-size 11px, font-weight 700 to display the number cleanly
- `.chatbox__model-option--locked`: opacity 0.4, cursor not-allowed, pointer-events none
- `.chatbox__model-picker-free-notice`: small banner inside picker header, muted text + link

---

## Data Flow

```
/user/protected → { is_free_tier, free_messages_remaining }
       ↓
App.jsx passes props to Home
       ↓
Home renders: button = number | dot
              picker = locked rows + notice | normal
       ↓
On send: POST /openai/answer?model=...
       ↓
Backend: if free tier + wrong model → 403
```

---

## Edge Cases

- User at message 10 with no purchase → `free_messages_remaining = 0`, button shows `0`, next `/chatbox/message` returns 400 "Message limit reached", `InsufficientCreditsModal` shown
- User buys credits mid-session → on next page load `/user/protected` returns `is_free_tier: false` → dot restored, all models unlocked
- Backend always enforces regardless of frontend state (defense in depth)
