import json
import pytest
from starlette.testclient import TestClient
from app.main import app
from app.websocket.events import WSEvent


def test_websocket_realtime_protocol():
    client = TestClient(app)
    
    with client.websocket_connect("/ws/projects/test-collab-room-1") as websocket:
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
