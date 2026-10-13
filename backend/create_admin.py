from database import SessionLocal, engine
from models import Base, User
from auth import get_password_hash
from datetime import datetime

Base.metadata.create_all(bind=engine)
db = SessionLocal()
existing = db.query(User).filter(
    User.email == "kauteshantanu80@gmail.com"
).first()
if not existing:
    admin = User(
        email="kauteshantanu80@gmail.com",
        full_name="Admin",
        password_hash=get_password_hash("Admin@2026"),
        role="admin",
        is_active=True,
        is_approved=True,
        otp_verified=True,
        created_at=datetime.utcnow()
    )
    db.add(admin)
    db.commit()
    print("Admin account created successfully")
else:
    print("Admin already exists — updating password")
    existing.password_hash = get_password_hash("Admin@2026")
    existing.is_active = True
    existing.is_approved = True
    db.commit()
    print("Admin password reset to Admin@2026")
db.close()
