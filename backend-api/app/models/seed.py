# app/models/seed.py
from sqlalchemy.orm import sessionmaker
from app.core.database import engine
from app.models.models import User, Conversation, TrendingConversation, Message

def seed_database():
    # Create a new session
    Session = sessionmaker(bind=engine)
    session = Session()

    try:
        # Fetch the first user from the database
        first_user = session.query(User).first()

        if first_user:
            # Clear existing messages and trending conversations first
            session.query(Message).filter(Message.conversation_id.in_(
                session.query(Conversation.id).filter(Conversation.user_id == first_user.user_id)
            )).delete(synchronize_session=False)

            session.query(TrendingConversation).filter(TrendingConversation.user_id == first_user.user_id).delete(synchronize_session=False)

            # Clear existing conversations
            session.query(Conversation).filter(Conversation.user_id == first_user.user_id).delete(synchronize_session=False)
            session.commit()

            # Create a new conversation
            conversation = Conversation(user_id=first_user.user_id)
            session.add(conversation)
            session.commit()

            # Create messages for the conversation
            message1 = Message(
                conversation_id=conversation.id,
                content="This is a sample message in the conversation.",
                type="user"  # Set the type of the message
            )

            message2 = Message(
                conversation_id=conversation.id,
                content="This is another sample message in the conversation.",
                type="machine"  # Set the type of the message
            )

            # Add messages to session
            session.add_all([message1, message2])
            session.commit()

            # Optionally create a trending conversation (if needed)
            trending_conversation = TrendingConversation(
                user_id=first_user.user_id,
                conversation_id=conversation.id,
                title="Trending Conversation Title",
                description="This is a description of the trending conversation.",
                content={
                    "example_key": "example_value"
                },
                likes=[],
                comments=[],
                reports=[]
            )

            # Add the trending conversation to the session
            session.add(trending_conversation)
            session.commit()

            print("Seeding completed successfully with one conversation and messages.")
        else:
            print("No users found in the database. Seeding aborted.")

    finally:
        # Close the session
        session.close()