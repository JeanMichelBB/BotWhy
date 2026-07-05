# Admin UI Design

**Goal:** Give a designated admin (initially `jeanmichelbberube@gmail.com`, via `ADMIN_EMAILS` env var) a UI to manage users, moderate trending posts, audit the credit ledger, and switch the active AI model — without redeploying or touching the DB by hand.

**Architecture:** New `role` column on `User` (`"user"` | `"admin"`), granted automatically on login when the email matches `ADMIN_EMAILS`. One new backend router (`app/api/endpoints/admin.py`) holds every admin endpoint behind a `require_admin` dependency. One new frontend route tree (`/admin/*`) reuses the existing per-page-folder convention, reachable only via a link in Settings (not the header nav) and gated by an `AdminRoute` wrapper. A new `AppSetting` key-value table stores the one runtime-editable value (active OpenRouter model), replacing the current import-time env read.

**Tech Stack:** FastAPI, SQLAlchemy, Alembic migration, React 18 + react-router, existing `getAuthHeader()` Bearer-token pattern, existing `CreditTransaction` audit-trail pattern.

---

## Admin Bootstrapping

Users are created lazily on first Google login (`login()` in `user.py`) — there is no user row at DB-creation time, so admin status cannot be seeded during provisioning.

**In `login()`**, after the user row is resolved or created: if `user.email` appears in `os.getenv("ADMIN_EMAILS", "").split(",")` and `user.role != "admin"`, set `role = "admin"` and commit. Comma-separated so more admins can be added later via env var alone, no schema change. Idempotent and self-healing — runs on every login, not just the first.

---

## Data Model Changes

### `User` — new column
`role = Column(String(20), nullable=False, default="user")`

String, not boolean — matches the existing enum-as-string pattern already used for `Message.type` and `CreditTransaction.type`, and leaves room for a future `"moderator"` tier at zero extra migration cost today.

### New table: `AppSetting`
```
key         String(64)  PRIMARY KEY
value       String(255)
updated_at  Timestamp
```
Single row for now: `key="active_model"`. Seeded from `OPENROUTER_MODEL` env var on first read if no row exists.

### Migration
New Alembic revision: add `users.role` (default `"user"` for all existing rows), create `app_settings` table.

---

## Backend Changes

### `app/api/dependencies.py` — new dependency
```
require_admin(current_user: User = Depends(get_current_user)) -> User
```
Raises `403` if `current_user.role != "admin"`. Reuses the existing token-hash trust boundary — no new auth mechanism, just an added gate on top of `get_current_user`.

### `app/api/endpoints/admin.py` — new router, prefix `/admin`, every route behind `require_admin`

**Users**
- `GET /admin/users?search=&page=&page_size=` — paginated, search by email
- `GET /admin/users/{user_id}` — profile, balance, recent transactions, conversation/trending counts
- `POST /admin/users/{user_id}/credit-adjustment` — body `{amount_cents, reason}`. Updates `credit_balance_cents` **and** inserts `CreditTransaction(type="admin_adjustment", amount_cents=<signed>, description=reason)` — never a bare balance edit, matches the existing purchase/spend audit pattern
- `POST /admin/users/{user_id}/soft-delete` — reuses `_soft_delete_user`
- `POST /admin/users/{user_id}/reactivate` — new `_admin_reactivate_user` helper (the existing `_reactivate_user` expects a fresh login token an admin doesn't have; the admin version only clears `is_deleted`/`deleted_at`, leaves `token=None` until the user logs in again themselves)
- `POST /admin/users/{user_id}/role` — body `{role}`. Blocks an admin from demoting **themselves** (`current_user.user_id == user_id` → 400) to avoid a mid-session lockout with no other admin to undo it

**Trending moderation**
- `GET /admin/trending/reported` — trending posts where `reports` is non-empty
- `DELETE /admin/trending/{id}` — deletes the post; existing cascade relationship already removes its messages

**Transaction ledger**
- `GET /admin/transactions?user_id=&type=&page=&page_size=` — all `CreditTransaction` rows across all users, joined with user email, filterable/paginated

**Model config**
- `GET /admin/settings/active-model` — current `AppSetting` value + selectable list (reuses `FALLBACK_TIERS` keys from `config.py` as the known-good options)
- `PUT /admin/settings/active-model` — body `{model}`, validated against that list (`400` if unknown), upserts the `AppSetting` row

### `app/utils/ai.py` — required change for the setting to actually work
`MODEL` is currently a module-level constant read once at import time from `OPENROUTER_MODEL`. `call_openrouter`'s fallback must instead look up the current `AppSetting` value at call time (falling back to the env var if no row exists yet), or an admin's model change would silently do nothing until the next deploy/restart.

---

## Frontend Changes

### `GET /user/protected` — enrich response
Add `role` to the existing response (alongside `is_free_tier`, `free_messages_remaining`) — the frontend already calls this once on load in `App.jsx`, so no second round-trip is needed to know if the current user is an admin.

### `App.jsx`
- New `role` state, set from `protected`'s response
- New `AdminRoute` wrapper (same shape as the existing `ProtectedRoute`), additionally checks `role === 'admin'`, redirects to `/` otherwise
- New route: `/admin/*` → `AdminLayout`, reachable only through `AdminRoute`
- `Settings` receives a new `role` prop

### `Settings.jsx` — entry point (not the header nav)
Inside the existing `settings__credits` block, after the "Buy Credits →" / "View Usage →" links:
```jsx
{role === 'admin' && (
  <Link to="/admin" className="settings__credits-link">
    Admin Panel →
  </Link>
)}
```

### New folder: `frontend-react/src/pages/Admin/`
One file per section, matching the existing one-folder-per-page convention:
- `AdminLayout.jsx` — sidebar/tabs: Users, Moderation, Transactions, Settings
- `AdminUsers.jsx` — search table, credit-adjustment modal, soft-delete/reactivate/role-change actions
- `AdminModeration.jsx` — reported trending posts list + delete action
- `AdminTransactions.jsx` — paginated ledger table with filters
- `AdminSettings.jsx` — active-model selector

All pages use the existing `getAuthHeader()` Bearer-token axios pattern already used in `Settings.jsx`/`Home.jsx`. Tables are plain HTML with Prev/Next pagination — no new UI library, matches the app's existing hand-rolled CSS at this scale (single admin, small user base).

---

## Testing

- Extend `make_user` fixture in `conftest.py` with an optional `role="user"` param
- New `tests/test_admin.py`:
  - `require_admin` gate: non-admin → 403, admin → 200, unauthenticated → 401
  - Credit adjustment: asserts balance change **and** the `admin_adjustment` transaction row exists
  - Soft-delete / reactivate / role-change, including the self-demotion guard
  - Trending moderation: reported-list filtering, delete cascades messages
  - Transaction ledger: pagination/filter params
  - Model config: valid model accepted, unknown model rejected with 400
  - `login()` auto-promotion: login with an `ADMIN_EMAILS`-matching email (via `monkeypatch.setenv`) results in `role="admin"`

## Error Handling

Follows existing codebase conventions exactly — plain `HTTPException`, no new framework:
- `403` — role/auth failures (matches `delete_user`'s existing "Not authorized" 403)
- `404` — missing resource
- `400` — invalid input (matches `checkout`'s unknown-pack-id 400), including self-demotion attempts and unknown model selections

## Edge Cases

- Admin demotes themselves → blocked with 400, must have another admin do it
- Model changed to something not in `FALLBACK_TIERS` → rejected with 400 before it's persisted
- User reactivated by admin has no valid token until they log in again themselves — expected, matches how `token` is only ever set during login
- `ADMIN_EMAILS` env var unset or empty → no auto-promotion happens, existing admins (if any, from a previous env value) keep their role until explicitly changed
