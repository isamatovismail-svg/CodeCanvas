from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List


class WSEventMessage(BaseModel):
    event: str = Field(..., description="The WebSocket event name e.g. project.join, code.update")
    project_id: Optional[str] = None
    data: Dict[str, Any] = Field(default_factory=dict)
    sender_id: Optional[str] = None
    timestamp: Optional[float] = None


class ElementUpdatePayload(BaseModel):
    element_id: str
    tag_name: Optional[str] = None
    text_content: Optional[str] = None
    attributes: Optional[Dict[str, str]] = None
    styles: Optional[Dict[str, str]] = None
    outer_html: Optional[str] = None


class CodeUpdatePayload(BaseModel):
    filename: str
    content: str
    change_source: Optional[str] = "monaco"  # monaco, visual, ai


class CursorMovePayload(BaseModel):
    x: float
    y: float
    user_name: Optional[str] = "Collaborator"
    user_color: Optional[str] = "#3b82f6"
