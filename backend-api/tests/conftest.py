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

    def _make_user(email="test@example.com", balance=500, is_deleted=False, role="user"):
        import hashlib
        token = str(uuid.uuid4())
        hashed = hashlib.sha256(token.encode()).hexdigest()
        user = User(
            email=email,
            given_name="Test",
            token=hashed,
            credit_balance_cents=balance,
            is_deleted=is_deleted,
            role=role,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        user._raw_token = token
        return user

    return _make_user
