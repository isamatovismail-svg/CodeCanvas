from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.database.connection import get_db
from app.database.models import User
from app.api.deps import get_current_user
from app.schemas.version import VersionCreate, VersionResponse
from app.services.version_service import VersionService
from app.services.project_service import ProjectService

router = APIRouter(prefix="/projects/{project_id}/versions", tags=["Version History"])


@router.get("", response_model=List[VersionResponse])
async def list_versions(
    project_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    await ProjectService.get_project_by_id(db, project_id, current_user.id)
    return await VersionService.get_versions(db, project_id)


@router.post("", response_model=VersionResponse)
async def create_version_snapshot(
    project_id: str,
    data: VersionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    await ProjectService.get_project_by_id(db, project_id, current_user.id)
    return await VersionService.create_version(
        db=db,
        project_id=project_id,
        user_id=current_user.id,
        title=data.title,
        description=data.description
    )


@router.post("/{version_id}/restore", response_model=VersionResponse)
async def restore_version(
    project_id: str,
    version_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    await ProjectService.get_project_by_id(db, project_id, current_user.id)
    return await VersionService.restore_version(db, project_id, version_id)
