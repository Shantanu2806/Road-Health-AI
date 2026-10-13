from database import SessionLocal
from models import User
from auth import verify_password

db = SessionLocal()
admin = db.query(User).filter(User.email == "kauteshantanu80@gmail.com").first()
if admin:
    print(f"Admin found: id={admin.id}, email={admin.email}, role={admin.role}, is_active={admin.is_active}, is_approved={admin.is_approved}")
    pwd_match = verify_password("Admin@2026", admin.password_hash) if admin.password_hash else False
    print(f"Password 'Admin@2026' match: {pwd_match}")
else:
    print("Admin NOT found in database")
db.close()
