"""
SQLAlchemy engine and session factory.
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase

from app.config import get_settings

settings = get_settings()

connect_args = {}
engine_kwargs = {
    "echo": settings.debug,
}

if settings.database_url.startswith("postgresql"):
    # PostgreSQL-specific performance and timeout settings
    engine_kwargs.update({
        "pool_pre_ping": False,
        "pool_size": 5,
        "max_overflow": 10,
        "pool_timeout": 10,
    })
    connect_args["connect_timeout"] = 5
elif settings.database_url.startswith("sqlite"):
    # SQLite-specific settings (allow multiple threads for FastAPI)
    connect_args["check_same_thread"] = False

engine = create_engine(
    settings.database_url,
    connect_args=connect_args,
    **engine_kwargs
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    """Base class for all ORM models."""
    pass


def get_db():
    """
    FastAPI dependency that yields a database session and ensures
    it is closed after the request completes.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
