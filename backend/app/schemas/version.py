from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional, Dict, Any


class VersionCreate(BaseModel):
    title: str = "Manual Snapshot"
    description: Optional[str] = None


class VersionResponse(BaseModel):
    id: str
    project_id: str
    version_number: int
    title: str
    description: Optional[str] = None
    snapshot: Dict[str, Any]
    created_at: datetime
    created_by_id: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)
