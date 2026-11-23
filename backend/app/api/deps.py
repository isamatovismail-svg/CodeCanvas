from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database.connection import get_db
from app.database.models import User
from app.core.security import decode_access_token

security_scheme = HTTPBearer(auto_error=False)

DEFAULT_USER_EMAIL = "developer@codecanvas.io"
DEFAULT_USER_ID = "00000000-0000-0000-0000-000000000001"


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
    if auth and auth.credentials:
        payload = decode_access_token(auth.credentials)
        if payload and "sub" in payload:
            user_id = payload["sub"]
            result = await db.execute(select(User).where(User.id == user_id))
            user = result.scalar_one_or_none()
            if user:
                return user

    # If no token provided or invalid, return default local developer user
    return await get_or_create_default_user(db)
