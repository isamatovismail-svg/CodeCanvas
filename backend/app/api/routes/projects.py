from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from app.database.connection import get_db
from app.database.models import User, Project
from app.api.deps import get_current_user
from app.schemas.project import (
    ProjectCreate,
    ProjectUpdate,
    ProjectImportPaste,
    ProjectListItem,
    ProjectDetailResponse
)
from app.services.project_service import ProjectService

router = APIRouter(prefix="/projects", tags=["Projects"])


@router.get("", response_model=List[ProjectListItem])
async def list_projects(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    projects = await ProjectService.get_projects(db, current_user.id)
    result = []
    for p in projects:
        item = ProjectListItem(
            id=p.id,
            title=p.title,
            description=p.description,
            is_public=p.is_public,
            active_framework=p.active_framework,
            owner_id=p.owner_id,
            created_at=p.created_at,
            updated_at=p.updated_at,
            file_count=len(p.files) if p.files else 0
        )
        result.append(item)
    return result


@router.post("", response_model=ProjectDetailResponse)
async def create_project(
    data: ProjectCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    project = await ProjectService.create_project(db, current_user.id, data)
    return project


@router.post("/import/paste", response_model=ProjectDetailResponse)
async def import_paste(
    data: ProjectImportPaste,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    project = await ProjectService.import_paste_project(db, current_user.id, data)
    return project


@router.post("/import/zip", response_model=ProjectDetailResponse)
async def import_zip(
    title: str = Form(...),
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    zip_bytes = await file.read()
    project = await ProjectService.import_zip_project(db, current_user.id, title, zip_bytes)
    return project


@router.get("/{project_id}", response_model=ProjectDetailResponse)
async def get_project(
    project_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    project = await ProjectService.get_project_by_id(db, project_id, current_user.id)
    return project


@router.put("/{project_id}", response_model=ProjectDetailResponse)
async def update_project(
    project_id: str,
    data: ProjectUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    project = await ProjectService.update_project(db, project_id, current_user.id, data)
    return project


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(
    project_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    await ProjectService.delete_project(db, project_id, current_user.id)
