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

#  insert logger.info("Database not ready, retrying...")
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

# Wait for the database before creating tables
wait_for_db()

# Create all tables
def create_all_tables():
    Base.metadata.create_all(bind=engine)