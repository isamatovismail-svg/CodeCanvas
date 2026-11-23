import logging
import time
from typing import Dict, Any
from fastapi import WebSocket, WebSocketDisconnect
from app.websocket.manager import ws_manager
from app.websocket.events import WSEvent
from app.database.connection import AsyncSessionLocal
from app.services.code_service import CodeService
from app.services.version_service import VersionService
from app.core.security import decode_access_token

logger = logging.getLogger("codecanvas.websocket.handler")


async def handle_websocket_connection(websocket: WebSocket, project_id: str, token: str = None):
    # Authenticate user from token if provided, or assign guest collaborator identity
    user_id = "guest-" + str(int(time.time() * 1000))[-6:]
    user_name = "Collaborator"

    if token:
        payload = decode_access_token(token)
        if payload and "sub" in payload:
            user_id = payload["sub"]
            user_name = payload.get("email", "Developer").split("@")[0].capitalize()

    # Deterministic nice color based on user_id
    colors = ["#3b82f6", "#10b981", "#8b5cf6", "#f59e0b", "#ec4899", "#06b6d4"]
    user_color = colors[hash(user_id) % len(colors)]

    user_info = {
        "userId": user_id,
        "userName": user_name,
        "userColor": user_color,
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

            event_type = message.get("event")
            payload = message.get("data", {})

            if event_type == WSEvent.CODE_UPDATE:
                filename = payload.get("filename")
                content = payload.get("content")
                if filename and content is not None:
                    async with AsyncSessionLocal() as db:
                        try:
                            await CodeService.update_file_content(db, project_id, filename, content)
                        except Exception as e:
                            logger.error(f"Error persisting code update: {e}")

                    # Broadcast to other clients
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
                            # Broadcast to all clients including sender or excluding
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
                        "data": {
                            "x": x,
                            "y": y,
                            "user": user_info
                        },
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
                        # Notify all clients that project was saved
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
