import json
import uuid
import asyncio
import logging
from typing import Dict, Set, Any, Optional
from fastapi import WebSocket
from app.core.config import settings

logger = logging.getLogger("codecanvas.websocket")

# Channel prefix used for Redis Pub/Sub
REDIS_CHANNEL_PREFIX = "codecanvas:project:"


class ConnectionManager:
    def __init__(self):
        # Unique instance ID to deduplicate Pub/Sub messages across multi-instance clusters
        self.instance_id = uuid.uuid4().hex
        # project_id -> Set[WebSocket]
        self.rooms: Dict[str, Set[WebSocket]] = {}
        # WebSocket -> user info dict
        self.client_meta: Dict[WebSocket, Dict[str, Any]] = {}
        self.redis_client = None
        self._pubsub_task: Optional[asyncio.Task] = None

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

    async def start_redis_subscriber(self):
        """
        Subscribes to all project channels on Redis (pattern: codecanvas:project:*).
        When a message is received from Redis it means another backend instance
        published it. We relay it to our own local WebSocket clients.
        Messages originated by this instance are skipped to prevent duplicate delivery.
        """
        if not self.redis_client:
            return

        import redis.asyncio as aioredis
        backoff = 1.0

        while True:
            sub_client = None
            pubsub = None
            try:
                sub_client = aioredis.from_url(
                    settings.REDIS_URL,
                    encoding="utf-8",
                    decode_responses=True
                )
                pubsub = sub_client.pubsub()
                await pubsub.psubscribe(f"{REDIS_CHANNEL_PREFIX}*")
                logger.info("Redis Pub/Sub subscriber started — listening on codecanvas:project:*")
                backoff = 1.0  # reset on successful connection

                async for message in pubsub.listen():
                    if message is None:
                        continue
                    if message.get("type") not in ("pmessage", "message"):
                        continue

                    channel = message.get("channel", "")
                    project_id = channel.removeprefix(REDIS_CHANNEL_PREFIX) if channel.startswith(REDIS_CHANNEL_PREFIX) else None
                    if not project_id:
                        continue

                    try:
                        data = json.loads(message.get("data", "{}"))
                    except (json.JSONDecodeError, TypeError):
                        continue

                    # Deduplication: skip messages that this instance published
                    if data.get("_origin_instance") == self.instance_id:
                        continue

                    # Clean internal metadata before relaying to local clients
                    clean_data = {k: v for k, v in data.items() if k != "_origin_instance"}
                    await self._broadcast_local_only(project_id, clean_data)

            except asyncio.CancelledError:
                logger.info("Redis subscriber task cancelled, shutting down cleanly.")
                if pubsub:
                    try:
                        await pubsub.unsubscribe()
                    except Exception:
                        pass
                if sub_client:
                    try:
                        await sub_client.close()
                    except Exception:
                        pass
                raise
            except Exception as e:
                logger.error(f"Redis subscriber error: {e}. Reconnecting in {backoff:.0f}s…")
                await asyncio.sleep(backoff)
                backoff = min(backoff * 2, 60)  # cap at 60 s

    async def _broadcast_local_only(
        self,
        project_id: str,
        message: Dict[str, Any],
        exclude: Optional[WebSocket] = None
    ):
        """Broadcast to WebSocket clients connected to THIS instance only. No Redis publish."""
        if project_id not in self.rooms:
            return
        dead_connections = []
        for ws in list(self.rooms[project_id]):
            if ws != exclude:
                try:
                    await ws.send_json(message)
                except Exception:
                    dead_connections.append(ws)
        for dead in dead_connections:
            await self.disconnect(dead, project_id)

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
        """
        Broadcasts an event to all active clients in the project room.

        Strategy:
        1. Send immediately to all WebSocket clients connected to THIS backend instance.
        2. Publish to Redis with our instance_id attached, so OTHER backend instances
           relay the message to their own local clients, while this instance skips it.
        """
        await self._broadcast_local_only(project_id, message, exclude=exclude)

        # Publish to Redis for multi-instance fan-out
        if self.redis_client:
            try:
                channel = f"{REDIS_CHANNEL_PREFIX}{project_id}"
                redis_payload = {**message, "_origin_instance": self.instance_id}
                await self.redis_client.publish(channel, json.dumps(redis_payload))
            except Exception as e:
                logger.error(f"Failed to publish to Redis channel {channel}: {e}")

    async def send_personal(self, websocket: WebSocket, message: Dict[str, Any]):
        try:
            await websocket.send_json(message)
        except Exception as e:
            logger.error(f"Error sending personal message: {e}")


ws_manager = ConnectionManager()
