# Payment & Credit System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the per-user message limit with a Stripe-backed credit system using OpenRouter for AI cost tracking, free starter credits, and soft-delete abuse prevention.

**Architecture:** Credits are stored as integer cents on the User row and in an append-only `credit_transactions` ledger. Every AI call deducts the exact OpenRouter cost; Stripe webhooks top up the balance. A FastAPI dependency blocks AI calls when balance ≤ 0.

**Tech Stack:** FastAPI, SQLAlchemy (MySQL/pymysql), Alembic, OpenRouter (openai SDK), Stripe Python SDK, pytest + TestClient (SQLite in-memory for unit tests)

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `backend-api/requirements.txt` | Modify | Add `stripe`, `alembic` (already present) |
| `backend-api/alembic.ini` | Create | Alembic config pointing at DB URL |
| `backend-api/alembic/env.py` | Create | Alembic env wiring SQLAlchemy models |
| `backend-api/alembic/versions/001_credit_schema.py` | Create | Migration: new User columns + credit_transactions table |
| `backend-api/app/models/models.py` | Modify | Add `CreditTransaction` model; update `User` |
| `backend-api/app/utils/ai.py` | Modify | OpenRouter client + `call_openrouter()` returning content + cost_cents |
| `backend-api/app/api/dependencies.py` | Modify | Add `require_credits` dependency |
| `backend-api/app/api/endpoints/openai.py` | Modify | Use `call_openrouter()`, deduct credits atomically |
| `backend-api/app/api/endpoints/user.py` | Modify | Free grant on signup; soft delete; reactivate on re-login |
| `backend-api/app/api/endpoints/credits.py` | Create | `/credits/checkout`, `/credits/webhook`, `/credits/balance` |
| `backend-api/app/main.py` | Modify | Register `credits` router |
| `backend-api/tests/conftest.py` | Create | Shared pytest fixtures (SQLite in-memory DB + TestClient) |
| `backend-api/tests/test_credits.py` | Create | All credit system tests |

---

## Task 1: Add `stripe` to requirements and initialize Alembic

**Files:**
- Modify: `backend-api/requirements.txt`
- Create: `backend-api/alembic.ini`
- Create: `backend-api/alembic/env.py`
- Create: `backend-api/alembic/versions/.gitkeep`

- [ ] **Step 1: Add stripe to requirements.txt**

Replace the contents of `backend-api/requirements.txt`:

```
fastapi==0.115.6
starlette==0.41.3
uvicorn[standard]
sqlalchemy
pydantic
pymysql
alembic
python-dotenv
requests
oauthlib
starlette-authlib
google-auth
itsdangerous
openai
stripe
logging
```

- [ ] **Step 2: Install new dependency**

```bash
cd backend-api && pip install stripe
```

Expected: `Successfully installed stripe-...`

- [ ] **Step 3: Initialize Alembic**

```bash
cd backend-api && alembic init alembic
```

Expected: Creates `alembic/` directory and `alembic.ini`.

- [ ] **Step 4: Configure alembic.ini**

In `backend-api/alembic.ini`, find the line:
```
sqlalchemy.url = driver://user:pass@localhost/dbname
```
Replace with:
```
sqlalchemy.url = mysql+pymysql://%(DB_USER)s:%(DB_PASSWORD)s@%(DB_HOST)s/%(DB_NAME)s
```

- [ ] **Step 5: Configure alembic/env.py**

Replace the generated `backend-api/alembic/env.py` with:

```python
import os
from logging.config import fileConfig
from sqlalchemy import engine_from_config, pool
from alembic import context
from dotenv import load_dotenv

load_dotenv()

config = context.config

# Inject DB URL from environment
config.set_section_option(config.config_ini_section, "DB_USER", os.getenv("DB_USER", ""))
config.set_section_option(config.config_ini_section, "DB_PASSWORD", os.getenv("DB_PASSWORD", ""))
config.set_section_option(config.config_ini_section, "DB_HOST", os.getenv("DB_HOST", "localhost"))
config.set_section_option(config.config_ini_section, "DB_NAME", os.getenv("DB_NAME", ""))

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

from app.models.models import Base
target_metadata = Base.metadata


def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(url=url, target_metadata=target_metadata, literal_binds=True)
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
```

- [ ] **Step 6: Commit**

```bash
git add backend-api/requirements.txt backend-api/alembic.ini backend-api/alembic/
git commit -m "chore: add stripe dependency and initialize alembic"
```

---

## Task 2: DB migration — credit schema

**Files:**
- Create: `backend-api/alembic/versions/001_credit_schema.py`
- Modify: `backend-api/app/models/models.py`

- [ ] **Step 1: Add CreditTransaction model and update User in models.py**

In `backend-api/app/models/models.py`, add these imports at the top:
```python
from sqlalchemy import Integer, String, JSON, TIMESTAMP, Column, ForeignKey, Text, func, Boolean, Numeric
```

Update the `User` class — add three columns after `trending_conversation_count`:
```python
credit_balance_cents = Column(Integer, nullable=False, default=0)
is_deleted = Column(Boolean, nullable=False, default=False)
deleted_at = Column(TIMESTAMP, nullable=True)
```

Also add the relationship at the end of the `User` class:
```python
credit_transactions = relationship("CreditTransaction", back_populates="user")
```

Add the new model after the `Message` class:
```python
class CreditTransaction(Base):
    __tablename__ = "credit_transactions"

    id = Column(CHAR(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(CHAR(36), ForeignKey('users.user_id'), nullable=False)
    amount_cents = Column(Integer, nullable=False)
    type = Column(String(20), nullable=False)  # 'purchase' | 'spend' | 'free_grant'
    description = Column(String(255), nullable=True)
    stripe_payment_id = Column(String(255), nullable=True)
    created_at = Column(TIMESTAMP, server_default=func.now())

    user = relationship("User", back_populates="credit_transactions")
```

- [ ] **Step 2: Create the Alembic migration file**

Create `backend-api/alembic/versions/001_credit_schema.py`:

```python
"""credit schema

Revision ID: 001
Revises:
Create Date: 2026-07-01
"""
from alembic import op
import sqlalchemy as sa

revision = '001'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('users', sa.Column('credit_balance_cents', sa.Integer(), nullable=False, server_default='0'))
    op.add_column('users', sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default='0'))
    op.add_column('users', sa.Column('deleted_at', sa.TIMESTAMP(), nullable=True))

    op.create_table(
        'credit_transactions',
        sa.Column('id', sa.CHAR(36), primary_key=True),
        sa.Column('user_id', sa.CHAR(36), sa.ForeignKey('users.user_id'), nullable=False),
        sa.Column('amount_cents', sa.Integer(), nullable=False),
        sa.Column('type', sa.String(20), nullable=False),
        sa.Column('description', sa.String(255), nullable=True),
        sa.Column('stripe_payment_id', sa.String(255), nullable=True),
        sa.Column('created_at', sa.TIMESTAMP(), server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table('credit_transactions')
    op.drop_column('users', 'deleted_at')
    op.drop_column('users', 'is_deleted')
    op.drop_column('users', 'credit_balance_cents')
```

- [ ] **Step 3: Run the migration against your dev DB**

```bash
cd backend-api && alembic upgrade head
```

Expected: `Running upgrade  -> 001, credit schema`

- [ ] **Step 4: Verify downgrade works**

```bash
cd backend-api && alembic downgrade base && alembic upgrade head
```

Expected: Both commands complete without error.

- [ ] **Step 5: Commit**

```bash
git add backend-api/alembic/versions/001_credit_schema.py backend-api/app/models/models.py
git commit -m "feat: add credit schema — User balance columns + credit_transactions table"
```

---

## Task 3: Test infrastructure (conftest.py)

**Files:**
- Create: `backend-api/tests/conftest.py`

- [ ] **Step 1: Create conftest.py**

Create `backend-api/tests/conftest.py`:

```python
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.database import Base, get_db
from app.main import app

SQLITE_URL = "sqlite:///./test.db"

engine = create_engine(SQLITE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def db():
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def client(db):
    def override_get_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture
def make_user(db):
    from app.models.models import User
    import uuid

    def _make_user(email="test@example.com", balance=500, is_deleted=False):
        import hashlib
        token = str(uuid.uuid4())
        hashed = hashlib.sha256(token.encode()).hexdigest()
        user = User(
            email=email,
            given_name="Test",
            token=hashed,
            credit_balance_cents=balance,
            is_deleted=is_deleted,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        user._raw_token = token
        return user

    return _make_user
```

- [ ] **Step 2: Install pytest + httpx for TestClient**

```bash
cd backend-api && pip install pytest httpx
```

Expected: `Successfully installed pytest-... httpx-...`

- [ ] **Step 3: Verify conftest loads**

```bash
cd backend-api && python -m pytest tests/ --collect-only
```

Expected: No import errors. `0 tests collected` is fine — tests come in later tasks.

- [ ] **Step 4: Commit**

```bash
git add backend-api/tests/conftest.py
git commit -m "test: add pytest conftest with SQLite in-memory fixtures"
```

---

## Task 4: OpenRouter swap (`app/utils/ai.py`)

**Files:**
- Modify: `backend-api/app/utils/ai.py`
- Modify: `backend-api/app/api/endpoints/openai.py`

- [ ] **Step 1: Write failing tests**

Create `backend-api/tests/test_credits.py`:

```python
import pytest
from unittest.mock import MagicMock, patch


def make_openrouter_response(content="Answer", cost=0.0234):
    response = MagicMock()
    response.choices[0].message.content = content
    response.usage.cost = cost
    return response


def test_cost_cents_rounding():
    from app.utils.ai import cost_to_cents
    assert cost_to_cents(0.0234) == 2
    assert cost_to_cents(0.005) == 1   # rounds up, not 0
    assert cost_to_cents(0.0) == 0
    assert cost_to_cents(0.01) == 1


def test_call_openrouter_returns_content_and_cost(monkeypatch):
    from app.utils import ai as ai_module
    mock_response = make_openrouter_response(content="Hello", cost=0.01)
    mock_client = MagicMock()
    mock_client.chat.completions.create.return_value = mock_response
    monkeypatch.setattr(ai_module, "client", mock_client)

    from app.utils.ai import call_openrouter
    content, cost_cents = call_openrouter(messages=[{"role": "user", "content": "hi"}])
    assert content == "Hello"
    assert cost_cents == 1
```

- [ ] **Step 2: Run tests — verify FAIL**

```bash
cd backend-api && python -m pytest tests/test_credits.py::test_cost_cents_rounding tests/test_credits.py::test_call_openrouter_returns_content_and_cost -v
```

Expected: FAIL — `ImportError: cannot import name 'cost_to_cents'`

- [ ] **Step 3: Implement app/utils/ai.py**

```python
import os
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

client = OpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=os.getenv("OPENROUTER_API_KEY"),
)

MODEL = os.getenv("OPENROUTER_MODEL", "openai/gpt-4o-mini")


def cost_to_cents(cost_usd: float) -> int:
    return round(cost_usd * 100)


def call_openrouter(messages: list) -> tuple[str, int]:
    response = client.chat.completions.create(
        model=MODEL,
        messages=messages,
    )
    content = response.choices[0].message.content
    cost_cents = cost_to_cents(getattr(response.usage, "cost", 0.0) or 0.0)
    return content, cost_cents
```

- [ ] **Step 4: Run tests — verify PASS**

```bash
cd backend-api && python -m pytest tests/test_credits.py::test_cost_cents_rounding tests/test_credits.py::test_call_openrouter_returns_content_and_cost -v
```

Expected: PASS

- [ ] **Step 5: Update openai.py to use call_openrouter**

Replace `backend-api/app/api/endpoints/openai.py`:

```python
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models import models
from app.api.dependencies import get_current_user
from app.utils.ai import call_openrouter

router = APIRouter()


@router.post("/answer")
def answer_question(
    question: str,
    user_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    user_conversation = db.query(models.Conversation).filter(
        models.Conversation.user_id == user_id
    ).first()

    if not user_conversation:
        raise HTTPException(status_code=404, detail="Conversation not found.")

    conversation_messages = db.query(models.Message).filter(
        models.Message.conversation_id == user_conversation.id
    ).all()

    context = "".join(f"[{m.type}] {m.content} " for m in conversation_messages)

    messages = [
        {"role": "system", "content": "You are a sarcastic and humorous assistant. Your responses should be short, witty, and not very helpful."},
        {"role": "user", "content": f"Context: {context}"},
        {"role": "user", "content": f"Question: {question}"},
    ]

    message_content, cost_cents = call_openrouter(messages=messages)

    new_message = models.Message(
        conversation_id=user_conversation.id,
        content=message_content,
        type="Machine",
    )
    db.add(new_message)
    db.commit()

    return {"answer": message_content}
```

- [ ] **Step 6: Update .env.example**

In `backend-api/.env.example` (create if it doesn't exist):
```
# Remove OPENAI_API_KEY if present
OPENROUTER_API_KEY=your_openrouter_key_here
OPENROUTER_MODEL=openai/gpt-4o-mini
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
FREE_CREDITS_CENTS=500
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
DB_USER=
DB_PASSWORD=
DB_HOST=
DB_NAME=
DB_ROOT_PASSWORD=
ENV=dev
ORIGIN_URLS=http://localhost:3000
```

- [ ] **Step 7: Commit**

```bash
git add backend-api/app/utils/ai.py backend-api/app/api/endpoints/openai.py backend-api/.env.example backend-api/tests/test_credits.py
git commit -m "feat: swap OpenAI for OpenRouter, extract call_openrouter helper"
```

---

## Task 5: Free credits on signup (Ticket 3)

**Files:**
- Modify: `backend-api/app/api/endpoints/user.py`

- [ ] **Step 1: Write failing tests**

Add to `backend-api/tests/test_credits.py`:

```python
def test_new_user_gets_free_credits(db):
    from app.models.models import User, CreditTransaction
    import os
    os.environ["FREE_CREDITS_CENTS"] = "500"

    from app.api.endpoints.user import _create_user_with_grant
    user = _create_user_with_grant(db, email="new@example.com", given_name="Alice", token_hash="abc123")

    assert user.credit_balance_cents == 500
    txn = db.query(CreditTransaction).filter_by(user_id=user.user_id).first()
    assert txn is not None
    assert txn.type == "free_grant"
    assert txn.amount_cents == 500


def test_reactivated_user_gets_no_second_grant(db):
    from app.models.models import User, CreditTransaction

    from app.api.endpoints.user import _create_user_with_grant, _reactivate_user
    user = _create_user_with_grant(db, email="old@example.com", given_name="Bob", token_hash="hash1")
    user.is_deleted = True
    db.commit()

    _reactivate_user(db, user, given_name="Bob", token_hash="hash2")

    txns = db.query(CreditTransaction).filter_by(user_id=user.user_id).all()
    grant_txns = [t for t in txns if t.type == "free_grant"]
    assert len(grant_txns) == 1
    assert user.is_deleted is False
```

- [ ] **Step 2: Run tests — verify FAIL**

```bash
cd backend-api && python -m pytest tests/test_credits.py::test_new_user_gets_free_credits tests/test_credits.py::test_reactivated_user_gets_no_second_grant -v
```

Expected: FAIL — `ImportError: cannot import name '_create_user_with_grant'`

- [ ] **Step 3: Add helper functions and update login in user.py**

Add these helper functions near the top of `backend-api/app/api/endpoints/user.py` (after imports):

```python
import os
from app.models.models import User, Conversation, Message, TrendingConversation, CreditTransaction

FREE_CREDITS_CENTS = int(os.getenv("FREE_CREDITS_CENTS", "500"))


def _create_user_with_grant(db: Session, email: str, given_name: str, token_hash: str) -> User:
    new_user = User(
        email=email,
        given_name=given_name,
        token=token_hash,
        credit_balance_cents=FREE_CREDITS_CENTS,
    )
    db.add(new_user)
    db.flush()  # get new_user.user_id before inserting transaction
    txn = CreditTransaction(
        user_id=new_user.user_id,
        amount_cents=FREE_CREDITS_CENTS,
        type="free_grant",
        description="Welcome credits",
    )
    db.add(txn)
    db.commit()
    db.refresh(new_user)
    return new_user


def _reactivate_user(db: Session, user: User, given_name: str, token_hash: str) -> User:
    user.is_deleted = False
    user.deleted_at = None
    user.token = token_hash
    user.given_name = given_name
    db.commit()
    return user
```

Update the `login` endpoint to use these helpers:

```python
@router.post("/login")
def login(request: Request, token: str, db: Session = Depends(get_db)):
    token = token.strip()
    if not token:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Token is required")

    try:
        id_info = id_token.verify_oauth2_token(token, google_requests.Request(), CLIENT_ID)
        email = id_info["email"]
        given_name = id_info.get("given_name")
        hashed_token = hash_token(token)

        user = db.query(User).filter(User.email == email).first()

        if user:
            if user.is_deleted:
                _reactivate_user(db, user, given_name=given_name, token_hash=hashed_token)
            else:
                user.token = hashed_token
                user.given_name = given_name
                db.commit()
            return {"user_id": user.user_id}
        else:
            new_user = _create_user_with_grant(db, email=email, given_name=given_name, token_hash=hashed_token)
            return {"user_id": new_user.user_id}

    except ValueError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
```

- [ ] **Step 4: Run tests — verify PASS**

```bash
cd backend-api && python -m pytest tests/test_credits.py::test_new_user_gets_free_credits tests/test_credits.py::test_reactivated_user_gets_no_second_grant -v
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend-api/app/api/endpoints/user.py
git commit -m "feat: grant free credits on signup, skip grant on reactivation"
```

---

## Task 6: Soft delete + re-signup guard (Ticket 9)

**Files:**
- Modify: `backend-api/app/api/endpoints/user.py`

- [ ] **Step 1: Write failing tests**

Add to `backend-api/tests/test_credits.py`:

```python
def test_delete_user_soft_deletes(db, make_user):
    from app.models.models import User
    user = make_user()

    from app.api.endpoints.user import _soft_delete_user
    _soft_delete_user(db, user)

    db.refresh(user)
    assert user.is_deleted is True
    assert user.deleted_at is not None
    # row must still exist
    assert db.query(User).filter_by(user_id=user.user_id).first() is not None


def test_delete_preserves_balance(db, make_user):
    user = make_user(balance=300)
    from app.api.endpoints.user import _soft_delete_user
    _soft_delete_user(db, user)
    db.refresh(user)
    assert user.credit_balance_cents == 300
```

- [ ] **Step 2: Run tests — verify FAIL**

```bash
cd backend-api && python -m pytest tests/test_credits.py::test_delete_user_soft_deletes tests/test_credits.py::test_delete_preserves_balance -v
```

Expected: FAIL — `ImportError: cannot import name '_soft_delete_user'`

- [ ] **Step 3: Add _soft_delete_user and update delete endpoint**

Add helper to `backend-api/app/api/endpoints/user.py`:

```python
from sqlalchemy import func as sqlfunc

def _soft_delete_user(db: Session, user: User) -> None:
    user.is_deleted = True
    user.deleted_at = sqlfunc.now()
    user.token = None
    db.commit()
```

Replace the `delete_user` endpoint:

```python
@router.delete("/user/{user_id}")
def delete_user(user_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    if current_user.user_id != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")
    _soft_delete_user(db, user)
    return {"message": "User deleted successfully"}
```

- [ ] **Step 4: Run tests — verify PASS**

```bash
cd backend-api && python -m pytest tests/test_credits.py::test_delete_user_soft_deletes tests/test_credits.py::test_delete_preserves_balance -v
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend-api/app/api/endpoints/user.py
git commit -m "feat: soft delete users — preserve row and balance, block re-signup grant"
```

---

## Task 7: Credit guard dependency (Ticket 5)

**Files:**
- Modify: `backend-api/app/api/dependencies.py`
- Modify: `backend-api/app/api/endpoints/openai.py`

- [ ] **Step 1: Write failing tests**

Add to `backend-api/tests/test_credits.py`:

```python
def test_require_credits_passes_with_balance(db, make_user):
    from app.api.dependencies import require_credits
    user = make_user(balance=10)
    result = require_credits(current_user=user, db=db)
    assert result.user_id == user.user_id


def test_require_credits_raises_402_when_zero(db, make_user):
    from app.api.dependencies import require_credits
    from fastapi import HTTPException
    user = make_user(balance=0)
    with pytest.raises(HTTPException) as exc:
        require_credits(current_user=user, db=db)
    assert exc.value.status_code == 402
```

- [ ] **Step 2: Run tests — verify FAIL**

```bash
cd backend-api && python -m pytest tests/test_credits.py::test_require_credits_passes_with_balance tests/test_credits.py::test_require_credits_raises_402_when_zero -v
```

Expected: FAIL — `ImportError: cannot import name 'require_credits'`

- [ ] **Step 3: Add require_credits to dependencies.py**

Add to the end of `backend-api/app/api/dependencies.py`:

```python
from fastapi import HTTPException


def require_credits(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> User:
    if current_user.credit_balance_cents <= 0:
        raise HTTPException(status_code=402, detail="Insufficient credits")
    return current_user
```

- [ ] **Step 4: Apply require_credits to the answer endpoint in openai.py**

In `backend-api/app/api/endpoints/openai.py`, update the import:
```python
from app.api.dependencies import get_current_user, require_credits
```

Update the `answer_question` signature:
```python
@router.post("/answer")
def answer_question(
    question: str,
    user_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_credits),  # changed from get_current_user
):
```

- [ ] **Step 5: Run tests — verify PASS**

```bash
cd backend-api && python -m pytest tests/test_credits.py::test_require_credits_passes_with_balance tests/test_credits.py::test_require_credits_raises_402_when_zero -v
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add backend-api/app/api/dependencies.py backend-api/app/api/endpoints/openai.py
git commit -m "feat: add require_credits dependency — 402 when balance is zero"
```

---

## Task 8: Credit deduction after AI call (Ticket 4)

**Files:**
- Modify: `backend-api/app/api/endpoints/openai.py`

- [ ] **Step 1: Write failing tests**

Add to `backend-api/tests/test_credits.py`:

```python
def test_deduct_credits_after_ai_call(db, make_user, monkeypatch):
    from app.models.models import CreditTransaction
    from app.api.endpoints import openai as openai_module
    import app.utils.ai as ai_module

    user = make_user(balance=100)

    mock_response_content = "Witty answer"
    mock_cost_cents = 3

    monkeypatch.setattr(
        ai_module,
        "call_openrouter",
        lambda messages: (mock_response_content, mock_cost_cents),
    )

    # Need a conversation for the user
    from app.models.models import Conversation
    conv = Conversation(user_id=user.user_id)
    db.add(conv)
    db.commit()

    from app.api.endpoints.openai import answer_question
    result = answer_question(question="Why?", user_id=user.user_id, db=db, current_user=user)

    db.refresh(user)
    assert user.credit_balance_cents == 97  # 100 - 3
    txn = db.query(CreditTransaction).filter_by(user_id=user.user_id, type="spend").first()
    assert txn is not None
    assert txn.amount_cents == -3


def test_zero_cost_inserts_no_spend_row(db, make_user, monkeypatch):
    from app.models.models import CreditTransaction, Conversation
    import app.utils.ai as ai_module

    user = make_user(balance=100)
    monkeypatch.setattr(ai_module, "call_openrouter", lambda messages: ("answer", 0))

    conv = Conversation(user_id=user.user_id)
    db.add(conv)
    db.commit()

    from app.api.endpoints.openai import answer_question
    answer_question(question="hi", user_id=user.user_id, db=db, current_user=user)

    spend_txns = db.query(CreditTransaction).filter_by(user_id=user.user_id, type="spend").all()
    assert len(spend_txns) == 0
```

- [ ] **Step 2: Run tests — verify FAIL**

```bash
cd backend-api && python -m pytest tests/test_credits.py::test_deduct_credits_after_ai_call tests/test_credits.py::test_zero_cost_inserts_no_spend_row -v
```

Expected: FAIL — no credit deduction happening yet.

- [ ] **Step 3: Add deduction logic to openai.py**

Update the `answer_question` endpoint body after `call_openrouter`:

```python
    message_content, cost_cents = call_openrouter(messages=messages)

    new_message = models.Message(
        conversation_id=user_conversation.id,
        content=message_content,
        type="Machine",
    )
    db.add(new_message)

    if cost_cents > 0:
        current_user.credit_balance_cents -= cost_cents
        txn = models.CreditTransaction(
            user_id=current_user.user_id,
            amount_cents=-cost_cents,
            type="spend",
            description=f"AI response",
        )
        db.add(txn)

    db.commit()

    return {"answer": message_content}
```

- [ ] **Step 4: Run tests — verify PASS**

```bash
cd backend-api && python -m pytest tests/test_credits.py::test_deduct_credits_after_ai_call tests/test_credits.py::test_zero_cost_inserts_no_spend_row -v
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend-api/app/api/endpoints/openai.py
git commit -m "feat: deduct credits after AI call, insert spend transaction"
```

---

## Task 9: Balance endpoint (Ticket 8)

**Files:**
- Create: `backend-api/app/api/endpoints/credits.py`
- Modify: `backend-api/app/main.py`

- [ ] **Step 1: Write failing tests**

Add to `backend-api/tests/test_credits.py`:

```python
def test_balance_endpoint_returns_balance(client, db, make_user):
    from app.models.models import CreditTransaction
    user = make_user(balance=750)

    txn = CreditTransaction(user_id=user.user_id, amount_cents=-10, type="spend", description="test")
    db.add(txn)
    db.commit()

    response = client.get(
        "/credits/balance",
        headers={"Authorization": f"Bearer {user._raw_token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["balance_cents"] == 750
    assert data["balance_display"] == "$7.50"
    assert len(data["transactions"]) == 1
```

- [ ] **Step 2: Run test — verify FAIL**

```bash
cd backend-api && python -m pytest tests/test_credits.py::test_balance_endpoint_returns_balance -v
```

Expected: FAIL — `404 Not Found` (route doesn't exist yet)

- [ ] **Step 3: Create credits.py**

Create `backend-api/app/api/endpoints/credits.py`:

```python
import os
import stripe
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models import models
from app.api.dependencies import get_current_user

router = APIRouter()

stripe.api_key = os.getenv("STRIPE_SECRET_KEY")
WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET")

CREDIT_PACKS = {
    "starter":  {"base_cents": 500,  "label": "Starter"},
    "standard": {"base_cents": 1000, "label": "Standard"},
    "pro":      {"base_cents": 2500, "label": "Pro"},
}


def calculate_stripe_fee(base_cents: int) -> int:
    return round(base_cents * 0.029 + 30)


@router.get("/balance")
def get_balance(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    transactions = (
        db.query(models.CreditTransaction)
        .filter_by(user_id=current_user.user_id)
        .order_by(models.CreditTransaction.created_at.desc())
        .limit(20)
        .all()
    )
    balance_cents = current_user.credit_balance_cents
    return {
        "balance_cents": balance_cents,
        "balance_display": f"${balance_cents / 100:.2f}",
        "transactions": [
            {
                "id": t.id,
                "amount_cents": t.amount_cents,
                "type": t.type,
                "description": t.description,
                "created_at": t.created_at.isoformat() if t.created_at else None,
            }
            for t in transactions
        ],
    }


@router.post("/checkout")
def checkout(
    pack_id: str,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    pack = CREDIT_PACKS.get(pack_id)
    if not pack:
        raise HTTPException(status_code=400, detail=f"Unknown pack_id '{pack_id}'. Valid: {list(CREDIT_PACKS)}")

    base_cents = pack["base_cents"]
    stripe_fee_cents = calculate_stripe_fee(base_cents)
    total_cents = base_cents + stripe_fee_cents

    intent = stripe.PaymentIntent.create(
        amount=total_cents,
        currency="usd",
        metadata={
            "user_id": current_user.user_id,
            "pack_id": pack_id,
            "base_cents": base_cents,
        },
    )

    return {
        "client_secret": intent.client_secret,
        "base_cents": base_cents,
        "stripe_fee_cents": stripe_fee_cents,
        "total_cents": total_cents,
    }


@router.post("/webhook")
async def stripe_webhook(request: Request, db: Session = Depends(get_db)):
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")

    try:
        event = stripe.Webhook.construct_event(payload, sig_header, WEBHOOK_SECRET)
    except stripe.error.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Invalid signature")

    if event["type"] == "payment_intent.succeeded":
        intent = event["data"]["object"]
        stripe_payment_id = intent["id"]
        user_id = intent["metadata"]["user_id"]
        base_cents = int(intent["metadata"]["base_cents"])

        # idempotency check
        existing = db.query(models.CreditTransaction).filter_by(
            stripe_payment_id=stripe_payment_id
        ).first()
        if existing:
            return {"status": "already_processed"}

        user = db.query(models.User).filter_by(user_id=user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        user.credit_balance_cents += base_cents
        txn = models.CreditTransaction(
            user_id=user_id,
            amount_cents=base_cents,
            type="purchase",
            description=f"Credit pack purchase",
            stripe_payment_id=stripe_payment_id,
        )
        db.add(txn)
        db.commit()

    return {"status": "ok"}
```

- [ ] **Step 4: Register credits router in main.py**

In `backend-api/app/main.py`, add after the other imports:
```python
from app.api.endpoints import credits
```

Add after the existing router includes:
```python
app.include_router(credits.router, prefix="/credits", tags=["credits"])
```

- [ ] **Step 5: Run test — verify PASS**

```bash
cd backend-api && python -m pytest tests/test_credits.py::test_balance_endpoint_returns_balance -v
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add backend-api/app/api/endpoints/credits.py backend-api/app/main.py
git commit -m "feat: add credits router — balance, checkout, webhook endpoints"
```

---

## Task 10: Stripe checkout + webhook tests (Tickets 6 & 7)

**Files:**
- Modify: `backend-api/tests/test_credits.py`

- [ ] **Step 1: Write tests for checkout**

Add to `backend-api/tests/test_credits.py`:

```python
def test_stripe_fee_calculation():
    from app.api.endpoints.credits import calculate_stripe_fee
    assert calculate_stripe_fee(1000) == 59   # 1000 * 0.029 + 30 = 59
    assert calculate_stripe_fee(500) == 45    # 500 * 0.029 + 30 = 44.5 → 45
    assert calculate_stripe_fee(2500) == 103  # 2500 * 0.029 + 30 = 102.5 → 103


def test_checkout_unknown_pack(client, make_user):
    user = make_user()
    response = client.post(
        "/credits/checkout?pack_id=nonexistent",
        headers={"Authorization": f"Bearer {user._raw_token}"},
    )
    assert response.status_code == 400


def test_webhook_idempotent(db, make_user):
    from app.models.models import CreditTransaction
    from app.api.endpoints.credits import stripe_webhook
    from unittest.mock import patch, MagicMock
    import asyncio

    user = make_user(balance=0)

    fake_event = {
        "type": "payment_intent.succeeded",
        "data": {
            "object": {
                "id": "pi_test_123",
                "metadata": {
                    "user_id": user.user_id,
                    "pack_id": "starter",
                    "base_cents": "500",
                },
            }
        },
    }

    with patch("stripe.Webhook.construct_event", return_value=fake_event):
        mock_request = MagicMock()
        mock_request.body = asyncio.coroutine(lambda: b"payload")
        mock_request.headers = {"stripe-signature": "sig"}

        asyncio.get_event_loop().run_until_complete(stripe_webhook(mock_request, db))
        asyncio.get_event_loop().run_until_complete(stripe_webhook(mock_request, db))  # second call

    db.refresh(user)
    assert user.credit_balance_cents == 500  # credited once, not twice
    txns = db.query(CreditTransaction).filter_by(user_id=user.user_id, type="purchase").all()
    assert len(txns) == 1


def test_webhook_invalid_signature(client):
    import stripe
    from unittest.mock import patch
    with patch("stripe.Webhook.construct_event", side_effect=stripe.error.SignatureVerificationError("bad", "sig")):
        response = client.post(
            "/credits/webhook",
            content=b"payload",
            headers={"stripe-signature": "badsig"},
        )
    assert response.status_code == 400
```

- [ ] **Step 2: Run tests — verify PASS**

```bash
cd backend-api && python -m pytest tests/test_credits.py -v
```

Expected: All tests PASS.

- [ ] **Step 3: Run full test suite**

```bash
cd backend-api && python -m pytest tests/ -v
```

Expected: All tests PASS (or only pre-existing failures unrelated to this feature).

- [ ] **Step 4: Commit**

```bash
git add backend-api/tests/test_credits.py
git commit -m "test: full credit system test coverage — checkout, webhook, idempotency, guard"
```

---

## Self-Review

**Spec coverage check:**
- ✅ OpenRouter swap (Task 4)
- ✅ Credit unit + cost_to_cents rounding (Task 4 — `cost_to_cents`)
- ✅ DB migration — User columns + credit_transactions (Task 2)
- ✅ Free tier on signup (Task 5)
- ✅ Credit guard 402 (Task 7)
- ✅ Credit deduction + atomic commit (Task 8)
- ✅ Stripe checkout + fee passthrough (Task 9 — `checkout` endpoint)
- ✅ Stripe webhook + idempotency (Task 9 — `webhook` endpoint)
- ✅ Balance endpoint (Task 9 — `get_balance`)
- ✅ Soft delete (Task 6)
- ✅ Re-signup reactivation — no second grant (Task 5 + 6)
- ✅ Stripe fee calculation tested (Task 10)

**No placeholders found.**

**Type consistency:** `CreditTransaction` defined in Task 2, used consistently in Tasks 5, 8, 9, 10. `call_openrouter` returns `tuple[str, int]` defined in Task 4, consumed in Task 8. All method names consistent across tasks.
