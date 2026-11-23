from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime
from typing import Optional, List, Dict, Any


class FileBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    file_type: str = Field(..., description="html, css, js, json, asset")
    content: str = ""
    is_entry_point: bool = False


class FileCreate(FileBase):
    pass


class FileUpdate(BaseModel):
    name: Optional[str] = None
    content: Optional[str] = None
    is_entry_point: Optional[bool] = None


class FileResponse(FileBase):
    id: str
    project_id: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class BatchFilesUpdate(BaseModel):
    files: List[FileBase]
