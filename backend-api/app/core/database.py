# app/core/database.py

import os
import time
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv
from sqlalchemy.exc import OperationalError
import logging

# Load environment variables
load_dotenv()

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)

DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")
DB_HOST = os.getenv("DB_HOST")
DB_NAME = os.getenv("DB_NAME")
DB_ROOT_PASSWORD = os.getenv("DB_ROOT_PASSWORD")

SQLALCHEMY_DATABASE_URL = f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}/{DB_NAME}"

# Create the SQLAlchemy engine and session
engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Function to get a database session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def provision_db(max_retries=15, base_delay=2):
    """Connect as root and create the database/user if they don't exist."""
    from sqlalchemy import text
    root_url = f"mysql+pymysql://root:{DB_ROOT_PASSWORD}@{DB_HOST}/"
    root_engine = create_engine(root_url)
    for attempt in range(max_retries):
        try:
            with root_engine.connect() as conn:
                conn.execute(text(f"CREATE DATABASE IF NOT EXISTS `{DB_NAME}`"))
                conn.execute(text(f"CREATE USER IF NOT EXISTS '{DB_USER}'@'%' IDENTIFIED BY '{DB_PASSWORD}'"))
                conn.execute(text(f"GRANT ALL PRIVILEGES ON `{DB_NAME}`.* TO '{DB_USER}'@'%'"))
                conn.execute(text("FLUSH PRIVILEGES"))
                logger.info(f"Database '{DB_NAME}' and user '{DB_USER}' are ready.")
                return
        except OperationalError:
            delay = base_delay * (2 ** attempt)
            logger.info(f"MySQL not ready yet, retrying in {delay}s... (attempt {attempt + 1}/{max_retries})")
            time.sleep(delay)
    raise Exception("Could not connect to MySQL as root after several retries")

# Function to wait for the database to be available
def wait_for_db(max_retries=10, base_delay=1):
    for attempt in range(max_retries):
        try:
            with engine.connect() as connection:
                logger.info("Database is up and running!")
                return
        except OperationalError:
            delay = base_delay * (2 ** attempt)  # exponential backoff
            logger.info(f"Database not ready, retrying in {delay}s...")
            time.sleep(delay)
    raise Exception("Could not connect to the database after several retries")

# Create all tables
def create_all_tables():
    Base.metadata.create_all(bind=engine)
    # Idempotent column additions for existing tables
    from sqlalchemy import text
    with engine.connect() as conn:
        try:
            conn.execute(text("ALTER TABLE users ADD COLUMN given_name VARCHAR(255)"))
            conn.commit()
        except Exception:
            pass
        try:
            conn.execute(text("ALTER TABLE trending_conversations ADD COLUMN liked_by JSON"))
            conn.commit()
        except Exception:
            pass
        try:
            conn.execute(text("ALTER TABLE users ADD COLUMN role VARCHAR(20) NOT NULL DEFAULT 'user'"))
            conn.commit()
        except Exception:
            pass
        try:
            conn.execute(text("ALTER TABLE credit_transactions ADD COLUMN provider_generation_id VARCHAR(255)"))
            conn.commit()
        except Exception:
            pass