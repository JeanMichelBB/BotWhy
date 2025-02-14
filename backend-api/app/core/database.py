# app/core/database.py

import os
import time
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv
from sqlalchemy.exc import OperationalError

# Load environment variables
load_dotenv()

DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")

SQLALCHEMY_DATABASE_URL = f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}@mysql/chatbox_db"

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

# Function to wait for the database to be available
def wait_for_db():
    max_retries = 10
    retry_interval = 5
    for _ in range(max_retries):
        try:
            # Try to connect to the database
            with engine.connect() as connection:
                print("Database is up and running!")
                return
        except OperationalError as e:
            print("Database not ready, retrying...")
            time.sleep(retry_interval)
    raise Exception("Could not connect to the database after several retries")

# Wait for the database before creating tables
wait_for_db()

# Create all tables
def create_all_tables():
    Base.metadata.create_all(bind=engine)