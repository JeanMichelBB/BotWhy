# Frontend Credit System Design
**Date:** 2026-07-01
**Project:** BotWhy
**Stack:** React + Vite + Axios + Stripe.js (@stripe/react-stripe-js)

---

## Goal

Surface the backend credit system in the UI so users can:
- See their current balance in Settings
- Buy credits on a dedicated `/credits` page using Stripe
- Be prompted to buy more when they run out mid-chat (402 modal)
- View their full transaction history on `/credits`

---

## File Structure

### New files
```
frontend-react/src/
  hooks/
    useCredits.js
  pages/
    Credits/
      Credits.jsx
      Credits.css
  components/
    InsufficientCreditsModal/
      InsufficientCreditsModal.jsx
      InsufficientCreditsModal.css
```

### Modified files
```
  components/Settings/Settings.jsx   ← add balance + Buy Credits link
  App.jsx                            ← add /credits route
  pages/Home/Home.jsx                ← catch 402 → show modal
```

---

## Components

### `useCredits` hook (`hooks/useCredits.js`)

Fetches `GET /credits/balance` on mount. Returns:
```js
{ balanceCents, balanceDisplay, transactions, refetch }
```
- Uses `Authorization: Bearer <token>` header (same pattern as rest of app)
- No polling — fetches once on mount
- `refetch()` called after successful purchase to update balance

### `Credits` page (`pages/Credits/Credits.jsx`)

Route: `/credits` (protected — requires login)

Three sections stacked vertically:

**1. Balance**
```
Your Balance: $4.50
```

**2. Buy Credits**
- Three pack cards in a flex row: Starter ($5.00 / 500 credits), Standard ($10.00 / 1000 credits), Pro ($25.00 / 2500 credits)
- Selected pack gets `--color-action` border highlight
- Fee breakdown computed client-side (2.9% + $0.30), displayed as:
  ```
  Processing fee: $0.59
  Total charged:  $10.59
  ```
- Stripe `CardElement` for card input
- "Pay $X.XX" button → `POST /credits/checkout?pack_id=<id>` → `stripe.confirmCardPayment(client_secret)`
- On success: call `refetch()`, show inline "Payment successful!" message
- On Stripe error: show inline error below form

**3. Transaction History**
- Table: Date | Type | Amount (last 20 rows from `/credits/balance`)
- Ordered newest first
- Amount positive = green (+$10.00), negative = muted (-$0.03)

### `InsufficientCreditsModal` (`components/InsufficientCreditsModal/`)

Triggered when AI call returns HTTP 402.

```
┌─────────────────────────────┐
│  You've run out of credits  │
│                             │
│  Buy credits to keep        │
│  chatting with BotWhy.      │
│                             │
│  [Buy Credits]  [Cancel]    │
└─────────────────────────────┘
```

- Same overlay style as existing `ConfirmationOverlay` component
- "Buy Credits" → `navigate('/credits')`
- "Cancel" → closes modal, user stays in chat

### Settings patch (`components/Settings/Settings.jsx`)

Add "Credits" section at the top (above existing account actions):
```
Credits
Balance: $4.50
Buy Credits →    ← Link to /credits
```
Uses `useCredits` hook to fetch balance on mount.

---

## Data Flow

### Balance fetch
1. Component mounts → `useCredits` calls `GET /credits/balance`
2. Renders `balanceDisplay` from response

### Purchase flow
1. User selects pack → fee breakdown updates instantly (JS computation, no API call)
2. Click "Pay" → `POST /credits/checkout?pack_id=<id>` → returns `{ client_secret, base_cents, stripe_fee_cents, total_cents }`
3. `stripe.confirmCardPayment(client_secret, { payment_method: { card: cardElement } })`
4. On success → `refetch()` → show "Payment successful!"
5. On error → show Stripe error message inline

### 402 handling
1. Home.jsx AI call catches `error.response.status === 402`
2. Sets `showInsufficientCreditsModal = true`
3. Modal renders with "Buy Credits" → `/credits` or "Cancel"

---

## Stripe Setup

- Install: `@stripe/react-stripe-js` and `@stripe/stripe-js`
- Publishable key from: `VITE_STRIPE_PUBLISHABLE_KEY` env var
- `<Elements>` provider wraps only the Credits page (not the whole app)
- No card data touches the backend — Stripe handles it entirely client-side

---

## Styling

- Follow existing pattern: one `.css` file per component
- Use only CSS variables from `colors.css`:
  - `--color-bg`, `--color-surface`, `--color-text`, `--color-muted`, `--color-action`, `--color-hover`, `--color-overlay`
- No new fonts, no new color variables
- Pack cards: flex row, equal width, border highlight on selection

---

## Environment Variables

Add to `frontend-react/.env`:
```
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

---

## Out of Scope
- Balance in header
- Polling / real-time balance updates
- Subscription / recurring billing UI
- Refund UI
- Admin credit management
