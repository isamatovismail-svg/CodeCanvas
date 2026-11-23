import json
import asyncio
import logging
from typing import Dict, Set, Any, Optional
from fastapi import WebSocket
from app.core.config import settings

logger = logging.getLogger("codecanvas.websocket")


class ConnectionManager:
    def __init__(self):
        # project_id -> Set[WebSocket]
        self.rooms: Dict[str, Set[WebSocket]] = {}
        # WebSocket -> user info dict
        self.client_meta: Dict[WebSocket, Dict[str, Any]] = {}
        self.redis_client = None
        self._pubsub_task = None

    async def init_redis(self):
        try:
            import redis.asyncio as aioredis
            self.redis_client = aioredis.from_url(
                settings.REDIS_URL,
                encoding="utf-8",
                decode_responses=True
            )
            await self.redis_client.ping()
            logger.info("Connected to Redis for WebSocket Pub/Sub broadcasting.")
        except Exception as e:
            logger.warning(f"Redis not accessible ({e}). Running with local in-memory WebSocket rooms.")
            self.redis_client = None

    async def connect(self, websocket: WebSocket, project_id: str, user_info: Dict[str, Any]):
        await websocket.accept()
        if project_id not in self.rooms:
            self.rooms[project_id] = set()
        self.rooms[project_id].add(websocket)
        self.client_meta[websocket] = user_info

    async def disconnect(self, websocket: WebSocket, project_id: str) -> Optional[Dict[str, Any]]:
        user_info = self.client_meta.pop(websocket, None)
        if project_id in self.rooms and websocket in self.rooms[project_id]:
            self.rooms[project_id].remove(websocket)
            if not self.rooms[project_id]:
                del self.rooms[project_id]
        return user_info

    def get_room_users(self, project_id: str) -> list:
        users = []
        if project_id in self.rooms:
            for ws in self.rooms[project_id]:
                meta = self.client_meta.get(ws)
                if meta:
                    users.append(meta)
        return users

    async def broadcast_to_room(
        self,
        project_id: str,
        message: Dict[str, Any],
        exclude: Optional[WebSocket] = None
    ):
        """Broadcasts event to all active clients in the project room."""
        # Broadcast locally
        if project_id in self.rooms:
            dead_connections = []
            for ws in list(self.rooms[project_id]):
                if ws != exclude:
                    try:
                        await ws.send_json(message)
                    except Exception:
                        dead_connections.append(ws)

            for dead in dead_connections:
                await self.disconnect(dead, project_id)

        # Also publish to Redis if active for multi-instance scaling
        if self.redis_client:
            try:
                channel = f"codecanvas:project:{project_id}"
                await self.redis_client.publish(channel, json.dumps(message))
            except Exception as e:
                logger.error(f"Failed to publish to Redis channel: {e}")

    async def send_personal(self, websocket: WebSocket, message: Dict[str, Any]):
        try:
            await websocket.send_json(message)
        except Exception as e:
            logger.error(f"Error sending personal message: {e}")


ws_manager = ConnectionManager()
