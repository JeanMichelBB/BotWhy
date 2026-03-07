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
| `/trending` | Trending |
| `/settings` | Settings (protected, requires login) |

## Project Structure

```
src/
  components/   # Reusable UI components (Header, Footer, Login, etc.)
  pages/        # Route-level pages (Home, Trending, NotFound, etc.)
  utils/        # Validation helpers
  api.jsx       # API base URL config
  App.jsx       # App entry, routing, auth state
  main.jsx      # React DOM mount
```
