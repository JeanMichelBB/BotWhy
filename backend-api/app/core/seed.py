# app/core/seed.py
from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.models import models
from app.auth.auth import hash_password  # Import hash_password function
import uuid
from datetime import datetime

def seed_users(db: Session):
    # Example: Seed users with unique usernames and additional fields
    users_to_insert = [
        models.User(
            id=uuid.uuid4(),  # Generate a unique UUID for each user
            username="user1",
            email="user1@example.com",
            password_hash=hash_password("password1"),  # Hash the password
            first_name="User",
            last_name="One",
            profile_picture="http://example.com/profile1.jpg",
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
            is_active=True
        ),
        models.User(
            id=uuid.uuid4(),
            username="user2",
            email="user2@example.com",
            password_hash=hash_password("password2"),
            first_name="User",
            last_name="Two",
            profile_picture="http://example.com/profile2.jpg",
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
            is_active=True
        ),
        models.User(
            id=uuid.uuid4(),
            username="user3",
            email="user3@example.com",
            password_hash=hash_password("password3"),
            first_name="User",
            last_name="Three",
            profile_picture="http://example.com/profile3.jpg",
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
            is_active=True
        ),
        models.User(
            id=uuid.uuid4(),
            username="user4",
            email="user4@example.com",
            password_hash=hash_password("password4"),
            first_name="User",
            last_name="Four",
            profile_picture="http://example.com/profile4.jpg",
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
            is_active=True
        ),
        models.User(
            id=uuid.uuid4(),
            username="user5",
            email="user5@example.com",
            password_hash=hash_password("password5"),
            first_name="User",
            last_name="Five",
            profile_picture="http://example.com/profile5.jpg",
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
            is_active=True
        ),
    ]
    
    # Check for existing usernames in the database
    existing_usernames = {user.username for user in db.query(models.User).all()}
    
    # Filter out users that already exist in the database
    users_to_insert = [
        user for user in users_to_insert if user.username not in existing_usernames
    ]
    
    # Insert new users
    if users_to_insert:
        db.add_all(users_to_insert)
        db.commit()
        print(f"{len(users_to_insert)} new users seeded successfully!")
    else:
        print("No new users to seed.")

def seed_data():
    db = SessionLocal()
    try:
        seed_users(db)
    except Exception as e:
        print(f"Error seeding data: {e}")
    finally:
        db.close()
