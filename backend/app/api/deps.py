import os
from typing import Optional
from fastapi import Depends, HTTPException, Query, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database.connection import get_db
from app.database.models import User
from app.core.security import decode_access_token
from app.core.config import settings

security_scheme = HTTPBearer(auto_error=False)

DEFAULT_USER_EMAIL = "developer@codecanvas.io"
DEFAULT_USER_ID = "00000000-0000-0000-0000-000000000001"

_CREDENTIALS_EXCEPTION = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Authentication required. Please provide a valid Bearer token.",
    headers={"WWW-Authenticate": "Bearer"},
)


async def get_or_create_default_user(db: AsyncSession) -> User:
    """Ensures a default developer user exists for seamless zero-friction local usage."""
    result = await db.execute(select(User).where(User.email == DEFAULT_USER_EMAIL))
    user = result.scalar_one_or_none()
    if not user:
        from app.core.security import get_password_hash
        user = User(
            id=DEFAULT_USER_ID,
            email=DEFAULT_USER_EMAIL,
            full_name="CodeCanvas Developer",
            hashed_password=get_password_hash("developer123"),
            is_active=True
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
    return user


async def get_current_user(
    auth: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme),
    db: AsyncSession = Depends(get_db)
) -> User:
    """
    Strict header-only authentication dependency for API endpoints.
    Requires Bearer token in the Authorization header.
    Query parameter ?token= is NOT accepted here, preventing query-string authentication on mutating API calls.
    - In development mode: falls back to default dev user when NO Authorization header is provided.
    - If Authorization header is provided with invalid/expired token: ALWAYS raises HTTP 401.
    - In production/test mode: raises HTTP 401 if no valid Authorization header is supplied.
    """
    environment = (os.getenv("ENVIRONMENT") or settings.ENVIRONMENT or "development").lower()

    if auth and auth.credentials:
        payload = decode_access_token(auth.credentials)
        if payload and "sub" in payload:
            user_id = payload["sub"]
            result = await db.execute(select(User).where(User.id == user_id))
            user = result.scalar_one_or_none()
            if user and user.is_active:
                return user
        # Token was present but invalid/expired — always reject
        raise _CREDENTIALS_EXCEPTION

    # No token provided
    if environment == "development":
        # Zero-friction local dev: use the default developer account
        return await get_or_create_default_user(db)

    # In production/test: require a real token
    raise _CREDENTIALS_EXCEPTION


async def get_current_user_for_media_or_query(
    auth: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme),
    token: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db)
) -> User:
    """
    Dedicated authentication dependency strictly for preview iframe and asset/media GET requests
    where browsers cannot attach custom Authorization headers to navigation or <img> tags.
    Accepts Bearer token in Authorization header OR ?token= query parameter.
    - In development mode: falls back to default dev user when no token is provided.
    - In production/test mode: raises HTTP 401 if neither valid header nor query token is supplied.
    - Invalid tokens in header or query parameter ALWAYS raise HTTP 401.
    """
    raw_token = auth.credentials if (auth and auth.credentials) else token
    environment = (os.getenv("ENVIRONMENT") or settings.ENVIRONMENT or "development").lower()

    if raw_token:
        payload = decode_access_token(raw_token)
        if payload and "sub" in payload:
            user_id = payload["sub"]
            result = await db.execute(select(User).where(User.id == user_id))
            user = result.scalar_one_or_none()
            if user and user.is_active:
                return user
        # Token was present but invalid/expired — always reject
        raise _CREDENTIALS_EXCEPTION

    # No token provided
    if environment == "development":
        return await get_or_create_default_user(db)

    raise _CREDENTIALS_EXCEPTION


async def get_current_user_optional(
    auth: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme),
    token: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db)
) -> Optional[User]:
    """
    Optional authentication dependency.
    Returns the authenticated User if a valid token is present, otherwise None.
    Never raises — suitable for public endpoints that allow anonymous access.
    """
    raw_token = auth.credentials if (auth and auth.credentials) else token
    if not raw_token:
        return None
    try:
        payload = decode_access_token(raw_token)
        if payload and "sub" in payload:
            user_id = payload["sub"]
            result = await db.execute(select(User).where(User.id == user_id))
            user = result.scalar_one_or_none()
            if user and user.is_active:
                return user
    except Exception:
        pass
    return None
