import pytest
import pytest_asyncio
import asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from app.database.connection import Base, get_db
from app.database.models import User
from app.core.security import get_password_hash, create_access_token
from app.main import app

TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

test_engine = create_async_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
TestSessionLocal = async_sessionmaker(bind=test_engine, class_=AsyncSession, expire_on_commit=False)

# Default test user constants (re-used across all legacy tests)
TEST_USER_ID = "00000000-0000-0000-0000-000000000001"
TEST_USER_EMAIL = "developer@codecanvas.io"


@pytest_asyncio.fixture(scope="function")
async def db_session():
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with TestSessionLocal() as session:
        # Always ensure the default test user exists so token-based auth works
        from sqlalchemy import select
        result = await session.execute(select(User).where(User.id == TEST_USER_ID))
        if not result.scalar_one_or_none():
            user = User(
                id=TEST_USER_ID,
                email=TEST_USER_EMAIL,
                full_name="CodeCanvas Developer",
                hashed_password=get_password_hash("developer123"),
                is_active=True,
            )
            session.add(user)
            await session.commit()
        yield session

    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest_asyncio.fixture(scope="function")
async def client(db_session):
    """
    HTTP test client.  In ENVIRONMENT=test mode, authentication is strict, so
    we pre-inject a valid Authorization header for the default test user so
    that existing tests that don't set their own auth still pass.
    """
    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db

    # Build a default Bearer token for the test user
    default_token = create_access_token({"sub": TEST_USER_ID, "email": TEST_USER_EMAIL})
    default_headers = {"Authorization": f"Bearer {default_token}"}

    transport = ASGITransport(app=app)
    async with AsyncClient(
        transport=transport,
        base_url="http://test",
        headers=default_headers,
    ) as c:
        yield c
    app.dependency_overrides.clear()


@pytest_asyncio.fixture(scope="function")
async def anon_client(db_session):
    """Unauthenticated HTTP client — used only by security tests that verify 401 responses."""
    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c
    app.dependency_overrides.clear()

