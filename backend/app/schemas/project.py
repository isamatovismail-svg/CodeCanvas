from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime
from typing import Optional, List, Dict, Any
from app.schemas.file import FileResponse
from app.schemas.version import VersionResponse


class ProjectBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    is_public: bool = False
    active_framework: str = "vanilla"


class ProjectCreate(ProjectBase):
    pass


class ProjectUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    is_public: Optional[bool] = None
    active_framework: Optional[str] = None


class ProjectImportPaste(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    html_code: str = ""
    css_code: str = ""
    js_code: str = ""


class ProjectListItem(ProjectBase):
    id: str
    owner_id: str
    created_at: datetime
    updated_at: datetime
    file_count: int = 0

    model_config = ConfigDict(from_attributes=True)


class ProjectDetailResponse(ProjectBase):
    id: str
    owner_id: str
    created_at: datetime
    updated_at: datetime
    files: List[FileResponse] = []
    versions: List[VersionResponse] = []

    model_config = ConfigDict(from_attributes=True)
