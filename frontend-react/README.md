# Frontend

React + Vite frontend with Google OAuth authentication.

## Requirements

- Node.js 18+
- npm

## Setup

1. Install dependencies

```bash
npm install
```

2. Create a `.env` file at the root of `frontend-react/`

```env
VITE_API_URL=http://localhost:8000
```

## Development

```bash
npm run dev
```

Runs on `http://localhost:80`.

## Build

```bash
npm run build
```

## Lint

```bash
npm run lint
```

## Pages & Routes

| Route | Description |
|---|---|
| `/` | Home |
| `/about` | About |
| `/trending` | Trending — browse/like/comment on shared conversations |
| `/settings` | Settings (protected, requires login) |
| `/credits` | Buy credit packs via Stripe (protected) |
| `/usage` | Usage/transaction history (protected) |
| `/admin/*` | Admin panel — users, credits, trending moderation, model settings (protected, requires `role = "admin"`) |

## Project Structure

```
src/
  components/   # Reusable UI components (Header, Footer, Login, Settings, InsufficientCreditsModal, etc.)
  pages/        # Route-level pages (Home, Trending, Credits, Usage, Admin, NotFound)
  hooks/        # Data hooks (e.g. useCredits)
  utils/        # Validation helpers
  api.jsx       # API base URL config
  App.jsx       # App entry, routing, auth state
  main.jsx      # React DOM mount
```
