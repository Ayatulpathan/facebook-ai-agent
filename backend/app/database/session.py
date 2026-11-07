from sqlalchemy import create_engine, event
from sqlalchemy.orm import declarative_base, sessionmaker
from app.core.config import settings

# SQLite connection args: check_same_thread=False for FastAPI concurrency
engine = create_engine(
    settings.DATABASE_URL,
    connect_args={"check_same_thread": False},
    echo=False
)

# Enable SQLite foreign key constraints & WAL mode on each connection
@event.listens_for(engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.execute("PRAGMA journal_mode=WAL")
    cursor.execute("PRAGMA synchronous=NORMAL")
    cursor.close()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def apply_sqlite_migrations(eng):
    """Safely adds missing columns to SQLite tables if tables already exist."""
    with eng.connect() as conn:
        # Check page_connections columns
        cursor = conn.connection.cursor()
        cursor.execute("PRAGMA table_info(page_connections)")
        existing_cols = {row[1] for row in cursor.fetchall()}
        
        column_defs = {
            "missing_permissions": "TEXT DEFAULT '[]'",
            "app_id": "VARCHAR(100)",
            "app_secret_masked": "VARCHAR(100)",
            "category": "VARCHAR(100) DEFAULT 'Business Page'",
            "followers_count": "INTEGER DEFAULT 0",
            "avatar_url": "VARCHAR(500) DEFAULT ''",
            "is_mock_mode": "BOOLEAN DEFAULT 1"
        }
        
        for col_name, col_type in column_defs.items():
            if existing_cols and col_name not in existing_cols:
                cursor.execute(f"ALTER TABLE page_connections ADD COLUMN {col_name} {col_type}")
        conn.connection.commit()
        cursor.close()

def get_db():
    """Dependency that provides a database session and ensures cleanup."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
