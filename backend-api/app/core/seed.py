# app/core/seed.py

from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.models import models

def seed_users(db: Session):
    # Example: Seed users with unique usernames
    users_to_insert = [
        models.User(
            username="user1",
            email="user1@example.com",
            hashed_password="password1",
            full_name="User One",
            is_active=True
        ),
        models.User(
            username="user2",
            email="user2@example.com",
            hashed_password="password2",
            full_name="User Two",
            is_active=True
        ),
        models.User(
            username="user3",
            email="user3@example.com",
            hashed_password="password3",
            full_name="User Three",
            is_active=True
        ),
        models.User(
            username="user4",
            email="user4@example.com",
            hashed_password="password4",
            full_name="User Four",
            is_active=True
        ),
        models.User(
            username="user5",
            email="user5@example.com",
            hashed_password="password5",
            full_name="User Five",
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