import uuid
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from app.database.db import SessionLocal, engine
from app.database.models import Base, User, Borrower, CreditScore, AuditLog

def seed_data():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    
    try:
        # Check if user already exists
        user_email = "admin@elevate.ai"
        existing_user = db.query(User).filter(User.email == user_email).first()
        
        if not existing_user:
            user_id = str(uuid.uuid4())
            user = User(
                user_id=user_id,
                email=user_email,
                full_name="Admin User",
                hashed_password="hashed_password_placeholder",
                role="admin",
                created_at=datetime.now(timezone.utc),
                updated_at=datetime.now(timezone.utc)
            )
            db.add(user)
            db.flush()
            print(f"Created user: {user_email}")
        else:
            user_id = existing_user.user_id
            print(f"User already exists: {user_email}")

        # Create a borrower for this user
        borrower_id = str(uuid.uuid4())
        borrower = Borrower(
            borrower_id=borrower_id,
            user_id=user_id,
            business_name="Acme Corp",
            income=50000.0,
            loan_amount=10000.0,
            transaction_frequency=15,
            business_age=24,
            person_age=30,
            person_income=50000.0,
            person_home_ownership="RENT",
            person_emp_length=5.0,
            loan_intent="PERSONAL",
            loan_grade="A",
            loan_amnt=10000.0,
            loan_int_rate=10.0,
            loan_percent_income=0.2,
            cb_person_default_on_file="N",
            cb_person_cred_hist_length=5,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc)
        )
        db.add(borrower)
        db.flush()
        print(f"Created borrower for {user_email}")

        # Add a credit score
        score = CreditScore(
            score_id=str(uuid.uuid4()),
            borrower_id=borrower_id,
            credit_score=750,
            probability_of_default=0.05,
            risk_level="LOW",
            scored_at=datetime.now(timezone.utc)
        )
        db.add(score)
        
        db.commit()
        print("Database seeded successfully.")
    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_data()
