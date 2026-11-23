#!/usr/bin/env python3
import sys
import os
import uvicorn

# Add backend directory to sys.path
backend_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "backend"))
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

if __name__ == "__main__":
    print("=" * 60)
    print("  CodeCanvas: AI-Powered Real-Time Visual Website Editor")
    print("  Backend API:  http://127.0.0.1:8000")
    print("  Swagger Docs: http://127.0.0.1:8000/docs")
    print("  WebSocket:    ws://127.0.0.1:8000/ws/projects/{project_id}")
    print("=" * 60)
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
