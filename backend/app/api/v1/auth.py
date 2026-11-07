from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.schemas.schemas import LoginRequest, TokenResponse, UserResponse
from app.services.auth_service import authenticate_user, get_current_user
from app.core.security import create_access_token, hash_password
from app.core.config import settings
from app.services.audit_service import log_audit
from app.models.models import User

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/login", response_model=TokenResponse)
def login(request: Request, login_data: LoginRequest, db: Session = Depends(get_db)):
    """Authenticate administrator and return JWT access token."""
    user = authenticate_user(db, login_data.username, login_data.password)
    if not user:
        log_audit(
            db,
            action="LOGIN_FAILED",
            entity="users",
            actor=login_data.username,
            details="Invalid credentials attempt",
            ip_address=request.client.host if request.client else "127.0.0.1"
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username, "role": user.role},
        expires_delta=access_token_expires
    )
    
    log_audit(
        db,
        action="LOGIN_SUCCESS",
        entity="users",
        entity_id=str(user.id),
        actor=user.username,
        details="Administrator logged in successfully",
        ip_address=request.client.host if request.client else "127.0.0.1"
    )
    
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user={
            "id": user.id,
            "username": user.username,
            "role": user.role
        }
    )

@router.get("/me", response_model=UserResponse)
def get_current_admin(current_user: User = Depends(get_current_user)):
    """Retrieve details of the currently authenticated administrator."""
    return current_user
