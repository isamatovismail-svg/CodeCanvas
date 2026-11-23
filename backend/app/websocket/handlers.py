import os
import logging
import time
from typing import Dict, Any
from fastapi import WebSocket, WebSocketDisconnect
from app.websocket.manager import ws_manager
from app.websocket.events import WSEvent
from app.database.connection import AsyncSessionLocal
from app.services.code_service import CodeService
from app.services.version_service import VersionService
from app.services.project_service import ProjectService
from app.core.security import decode_access_token
from app.core.config import settings

logger = logging.getLogger("codecanvas.websocket.handler")

# WebSocket close codes (4000-4999 are application-defined)
WS_CLOSE_UNAUTHENTICATED = 4001
WS_CLOSE_FORBIDDEN = 4003


async def handle_websocket_connection(websocket: WebSocket, project_id: str, token: str = None):
    """
    WebSocket connection handler with authentication and authorization.

    Authentication:
    - In development mode (ENVIRONMENT=development), a missing token falls back
      to the default dev user identity so local testing requires no login.
    - In all other environments (production, test), a valid JWT token is required.

    Authorization:
    - The authenticated user must own or have collaborator access to the project.
    - Write operations (code.update, element.update, project.save) are only
      permitted to users who passed the initial authorization check.
    """
    environment = (os.getenv("ENVIRONMENT") or settings.ENVIRONMENT or "development").lower()

    # ── Step 1: Resolve user identity from token ──────────────────────────────
    user_id = None
    user_name = "Developer"
    user_email = ""
    # Track whether a token was explicitly provided (even if it is invalid/expired)
    token_was_provided = bool(token)

    if token:
        payload = decode_access_token(token)
        if payload and "sub" in payload:
            user_id = payload["sub"]
            user_email = payload.get("email", "")
            user_name = user_email.split("@")[0].capitalize() if user_email else "Developer"
        # else: token was provided but is invalid/expired — user_id stays None,
        # token_was_provided=True → must be rejected even in development mode.

    if not user_id:
        if not token_was_provided and environment == "development":
            # Only apply dev fallback when NO token was supplied at all.
            user_id = "00000000-0000-0000-0000-000000000001"
            user_name = "Developer"
        else:
            # Reject in every other case:
            #   - invalid/expired token (any environment, including development)
            #   - no token in production or test environment
            await websocket.accept()
            await websocket.send_json({
                "event": WSEvent.ERROR,
                "data": {"message": "Authentication required. Provide a valid token."},
                "timestamp": time.time()
            })
            await websocket.close(code=WS_CLOSE_UNAUTHENTICATED)
            return

    # ── Step 2: Verify project access & roles ─────────────────────────────────
    can_write = False
    is_owner = False
    try:
        async with AsyncSessionLocal() as db:
            project = await ProjectService.get_project_by_id(db, project_id, user_id)
            is_owner = (project.owner_id == user_id)
            if is_owner:
                can_write = True
            else:
                collab = next((c for c in project.collaborators if c.user_id == user_id), None)
                if collab and collab.role in ("owner", "editor"):
                    can_write = True
    except Exception as exc:
        await websocket.accept()
        await websocket.send_json({
            "event": WSEvent.ERROR,
            "data": {"message": "Project not found or access denied."},
            "timestamp": time.time()
        })
        await websocket.close(code=WS_CLOSE_FORBIDDEN)
        return

    # ── Step 3: Accept the connection ─────────────────────────────────────────
    colors = ["#3b82f6", "#10b981", "#8b5cf6", "#f59e0b", "#ec4899", "#06b6d4"]
    user_color = colors[hash(user_id) % len(colors)]

    user_info = {
        "userId": user_id,
        "userName": user_name,
        "userColor": user_color,
        "isOwner": is_owner,
        "canWrite": can_write,
        "joinedAt": time.time()
    }

    await ws_manager.connect(websocket, project_id, user_info)

    # Broadcast user joined
    await ws_manager.broadcast_to_room(
        project_id,
        {
            "event": WSEvent.USER_JOINED,
            "projectId": project_id,
            "data": {"user": user_info},
            "timestamp": time.time()
        },
        exclude=websocket
    )

    # Send confirmation and existing presence list to newly connected user
    current_users = ws_manager.get_room_users(project_id)
    await ws_manager.send_personal(websocket, {
        "event": WSEvent.PROJECT_JOINED,
        "projectId": project_id,
        "data": {
            "currentUser": user_info,
            "activeUsers": current_users
        },
        "timestamp": time.time()
    })

    # ── Step 4: Message loop ──────────────────────────────────────────────────
    try:
        while True:
            raw_data = await websocket.receive_text()
            try:
                import json
                message = json.loads(raw_data)
            except Exception:
                await ws_manager.send_personal(websocket, {
                    "event": WSEvent.ERROR,
                    "data": {"message": "Invalid JSON format"}
                })
                continue

            if not isinstance(message, dict):
                await ws_manager.send_personal(websocket, {
                    "event": WSEvent.ERROR,
                    "data": {"message": "Message must be a JSON object"}
                })
                continue

            event_type = message.get("event")
            payload = message.get("data", {})
            if not isinstance(payload, dict):
                payload = {}

            # ── Write events require write permission (owner or editor) ───────
            WRITE_EVENTS = {WSEvent.CODE_UPDATE, WSEvent.ELEMENT_UPDATE, WSEvent.PROJECT_SAVE}
            if event_type in WRITE_EVENTS and not can_write:
                await ws_manager.send_personal(websocket, {
                    "event": WSEvent.ERROR,
                    "data": {"message": "You do not have write access to this project. Your role is view-only."}
                })
                continue

            if event_type == WSEvent.CODE_UPDATE:
                filename = payload.get("filename")
                content = payload.get("content")
                if filename and content is not None:
                    async with AsyncSessionLocal() as db:
                        try:
                            await CodeService.update_file_content(db, project_id, filename, content)
                        except Exception as e:
                            logger.error(f"Error persisting code update: {e}")

                    await ws_manager.broadcast_to_room(
                        project_id,
                        {
                            "event": WSEvent.CODE_UPDATED,
                            "projectId": project_id,
                            "data": {
                                "filename": filename,
                                "content": content,
                                "source": payload.get("changeSource", "editor"),
                                "user": user_info
                            },
                            "timestamp": time.time()
                        },
                        exclude=websocket
                    )

            elif event_type == WSEvent.ELEMENT_UPDATE:
                element_id = payload.get("elementId")
                styles = payload.get("styles")
                text_content = payload.get("textContent")
                attributes = payload.get("attributes")

                if element_id:
                    async with AsyncSessionLocal() as db:
                        try:
                            res = await CodeService.apply_visual_element_update(
                                db=db,
                                project_id=project_id,
                                element_id=element_id,
                                text_content=text_content,
                                styles=styles,
                                attributes=attributes
                            )
                            await ws_manager.broadcast_to_room(
                                project_id,
                                {
                                    "event": WSEvent.ELEMENT_UPDATED,
                                    "projectId": project_id,
                                    "data": {
                                        "elementId": element_id,
                                        "updatedHtml": res.get("updated_html"),
                                        "filename": res.get("filename"),
                                        "user": user_info
                                    },
                                    "timestamp": time.time()
                                },
                                exclude=websocket
                            )
                        except Exception as e:
                            logger.error(f"Error persisting element update: {e}")

            elif event_type == WSEvent.ELEMENT_SELECT:
                element_id = payload.get("elementId")
                await ws_manager.broadcast_to_room(
                    project_id,
                    {
                        "event": WSEvent.ELEMENT_SELECTED,
                        "projectId": project_id,
                        "data": {
                            "elementId": element_id,
                            "user": user_info
                        },
                        "timestamp": time.time()
                    },
                    exclude=websocket
                )

            elif event_type == WSEvent.CURSOR_MOVE:
                x = payload.get("x")
                y = payload.get("y")
                await ws_manager.broadcast_to_room(
                    project_id,
                    {
                        "event": WSEvent.CURSOR_MOVED,
                        "projectId": project_id,
                        "data": {"x": x, "y": y, "user": user_info},
                        "timestamp": time.time()
                    },
                    exclude=websocket
                )

            elif event_type == WSEvent.PROJECT_SAVE:
                title = payload.get("title", "Saved snapshot")
                async with AsyncSessionLocal() as db:
                    try:
                        version = await VersionService.create_version(
                            db, project_id, user_id=user_id, title=title
                        )
                        await ws_manager.broadcast_to_room(
                            project_id,
                            {
                                "event": WSEvent.PROJECT_SAVED,
                                "projectId": project_id,
                                "data": {
                                    "versionNumber": version.version_number,
                                    "title": version.title,
                                    "timestamp": time.time(),
                                    "user": user_info
                                }
                            }
                        )
                    except Exception as e:
                        logger.error(f"Error creating project save version: {e}")

            else:
                # Unknown event — silently ignore to avoid breaking clients
                logger.debug(f"Unknown WS event '{event_type}' from user {user_id}")

    except WebSocketDisconnect:
        disconnected_user = await ws_manager.disconnect(websocket, project_id)
        if disconnected_user:
            await ws_manager.broadcast_to_room(
                project_id,
                {
                    "event": WSEvent.USER_LEFT,
                    "projectId": project_id,
                    "data": {"user": disconnected_user},
                    "timestamp": time.time()
                }
            )
    except Exception as e:
        logger.error(f"WebSocket error in room {project_id}: {e}")
        await ws_manager.disconnect(websocket, project_id)
