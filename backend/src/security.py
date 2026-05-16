"""
Authentication and security utilities for JWT token management.
Uses pbkdf2_sha256 for password hashing — avoids passlib/bcrypt version conflicts.
"""

from datetime import datetime, timedelta
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer
from fastapi.security.http import HTTPAuthorizationCredentials
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from src.config import settings
from src.database import get_db
from src.models import User
from src.schemas import TokenData, UserRole

# ====================== PASSWORD HASHING ======================
# pbkdf2_sha256 works reliably regardless of bcrypt version
pwd_context = CryptContext(
    schemes=["pbkdf2_sha256"],
    deprecated="auto",
)


def hash_password(password: str) -> str:
    """Hash a password using pbkdf2_sha256."""
    if not password or not password.strip():
        raise ValueError("Password cannot be empty")
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its pbkdf2_sha256 hash."""
    if not plain_password or not hashed_password:
        return False
    try:
        return pwd_context.verify(plain_password, hashed_password)
    except Exception as e:
        print(f"[security] verify_password error: {e}")
        return False


# ====================== JWT TOKEN UTILITIES ======================
def create_access_token(
    user_id: int,
    email: str,
    role: UserRole,
    expires_delta: Optional[timedelta] = None
) -> str:
    """Create a JWT access token."""
    to_encode = {
        "sub": email,
        "user_id": user_id,
        "role": role.value,
    }

    expire = datetime.utcnow() + (
        expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire})

    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


# ====================== SECURITY SCHEME ======================
security = HTTPBearer()


# ====================== DEPENDENCIES ======================
async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """Dependency to get the current authenticated user from JWT token."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        token = credentials.credentials
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )

        email: str = payload.get("sub")
        user_id: int = payload.get("user_id")

        if email is None or user_id is None:
            raise credentials_exception

        token_data = TokenData(
            sub=email,
            user_id=user_id,
            role=UserRole(payload.get("role", "user"))
        )

    except JWTError:
        raise credentials_exception

    user = db.query(User).filter(User.id == token_data.user_id).first()

    if user is None:
        raise credentials_exception

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive"
        )

    return user


async def get_current_admin_user(
    current_user: User = Depends(get_current_user)
) -> User:
    """Dependency to ensure the current user is an admin (admin or super_admin)."""
    if current_user.role not in (UserRole.ADMIN, UserRole.SUPER_ADMIN):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return current_user


# ====================== HELPER FUNCTIONS ======================
def is_admin(user: User) -> bool:
    """Check if a user is an admin (admin or super_admin)."""
    return user.role in (UserRole.ADMIN, UserRole.SUPER_ADMIN)


def is_complaint_owner(user: User, complaint_user_id: int) -> bool:
    """Check if a user owns a complaint or is an admin."""
    return user.id == complaint_user_id or is_admin(user)