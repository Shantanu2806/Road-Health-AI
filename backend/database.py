"""
database.py - SQLite Database Configuration using SQLAlchemy
"""

from pathlib import Path
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

# Database file placed in backend folder
DB_PATH = Path(__file__).resolve().parent / "road_health.db"
SQLALCHEMY_DATABASE_URL = f"sqlite:///{DB_PATH}"

# check_same_thread=False is needed for SQLite when used with multi-threaded FastAPI
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """FastAPI dependency that yields an isolated DB session per request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
