from datetime import datetime, timezone
from typing import Optional
from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.models import User
from app.core.security import verify_password, hash_password, create_access_token, decode_access_token, oauth2_scheme

def init_admin_user(db: Session) -> User:
    """Ensure at least one admin account exists on initial installation."""
    admin = db.query(User).filter(User.username == "admin").first()
    if not admin:
        admin = User(
            username="admin",
            password_hash=hash_password("adminpassword123"),
            role="admin",
            is_active=True,
            created_at=datetime.now(timezone.utc)
        )
        db.add(admin)
        db.commit()
        db.refresh(admin)
    return admin

def authenticate_user(db: Session, username: str, password: str) -> Optional[User]:
    """Authenticate admin credentials."""
    user = db.query(User).filter(User.username == username, User.is_active == True).first()
    if not user:
        return None
    if not verify_password(password, user.password_hash):
        return None
    user.last_login = datetime.now(timezone.utc)
    db.commit()
    return user

def get_current_user(token: Optional[str] = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    """Validate JWT token and return active admin user."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials or session expired.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if not token:
        raise credentials_exception

    payload = decode_access_token(token)
    if payload is None:
        raise credentials_exception

    username: str = payload.get("sub")
    if username is None:
        raise credentials_exception

    user = db.query(User).filter(User.username == username, User.is_active == True).first()
    if user is None:
        raise credentials_exception

    return user
