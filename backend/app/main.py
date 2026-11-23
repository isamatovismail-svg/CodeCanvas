import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from app.core.config import settings
from app.database.connection import init_db
from app.websocket.manager import ws_manager
from app.websocket.handlers import handle_websocket_connection

# Routers
from app.api.routes import auth, projects, files, preview, export, versions, ai


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: initialize database tables
    await init_db()
    # Initialize Redis connection for WebSocket Pub/Sub if running
    await ws_manager.init_redis()
    # Start Redis subscriber for multi-instance event relay (no-op if Redis is unavailable)
    if ws_manager.redis_client:
        ws_manager._pubsub_task = asyncio.create_task(ws_manager.start_redis_subscriber())
    yield
    # Shutdown
    if ws_manager._pubsub_task and not ws_manager._pubsub_task.done():
        ws_manager._pubsub_task.cancel()
    if ws_manager.redis_client:
        await ws_manager.redis_client.close()


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="CodeCanvas: AI-Powered Real-Time Visual Website Editor API",
    lifespan=lifespan
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API Routers under /api/v1
api_prefix = settings.API_V1_STR
app.include_router(auth.router, prefix=api_prefix)
app.include_router(projects.router, prefix=api_prefix)
app.include_router(files.router, prefix=api_prefix)
app.include_router(preview.router, prefix=api_prefix)
app.include_router(export.router, prefix=api_prefix)
app.include_router(versions.router, prefix=api_prefix)
app.include_router(ai.router, prefix=api_prefix)


# Health Check
@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "database": "connected"
    }


# WebSocket Real-Time Endpoint
@app.websocket("/ws/projects/{project_id}")
async def websocket_project_endpoint(
    websocket: WebSocket,
    project_id: str,
    token: str = Query(None)
):
    await handle_websocket_connection(websocket, project_id, token)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
