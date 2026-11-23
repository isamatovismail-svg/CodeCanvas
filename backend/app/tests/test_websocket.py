import json
import os
import pytest
from unittest.mock import patch, AsyncMock, MagicMock
from starlette.testclient import TestClient
from app.main import app
from app.websocket.events import WSEvent
from app.core.security import create_access_token
from app.tests.conftest import TEST_USER_ID, TEST_USER_EMAIL


def test_websocket_realtime_protocol():
    """
    WebSocket protocol test.
    Mocks project verification to simulate an existing project owned by the caller.
    """
    token = create_access_token({"sub": TEST_USER_ID, "email": TEST_USER_EMAIL})
    client = TestClient(app)

    mock_project = MagicMock()
    mock_project.id = "test-collab-room-1"
    mock_project.owner_id = TEST_USER_ID
    mock_project.is_public = False

    with patch("app.services.project_service.ProjectService.get_project_by_id", new_callable=AsyncMock) as mock_get_proj:
        mock_get_proj.return_value = mock_project
        with client.websocket_connect(f"/ws/projects/test-collab-room-1?token={token}") as websocket:
            # Read the initial welcome/joined event
            data = websocket.receive_json()
            assert data["event"] == WSEvent.PROJECT_JOINED
            assert data["projectId"] == "test-collab-room-1"
            assert "currentUser" in data["data"]
            assert "activeUsers" in data["data"]

            # Send cursor move
            websocket.send_json({
                "event": WSEvent.CURSOR_MOVE,
                "data": {"x": 250.5, "y": 420.0}
            })

            # Send element select
            websocket.send_json({
                "event": WSEvent.ELEMENT_SELECT,
                "data": {"elementId": "btn-1"}
            })
