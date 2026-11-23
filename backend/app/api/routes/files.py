import os
import shutil
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from fastapi.responses import FileResponse as FastAPIFileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from app.database.connection import get_db
from app.database.models import User, ProjectAsset
from app.api.deps import get_current_user
from app.schemas.file import FileCreate, FileUpdate, FileResponse
from app.schemas.websocket import ElementUpdatePayload
from app.services.code_service import CodeService
from app.services.project_service import ProjectService
from app.core.config import settings
from app.utils.security_sandbox import sanitize_filename, validate_file_safety

router = APIRouter(prefix="/projects/{project_id}", tags=["Files & Visual Sync"])


@router.get("/files", response_model=List[FileResponse])
async def list_files(
    project_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    await ProjectService.get_project_by_id(db, project_id, current_user.id)
    return await CodeService.get_files(db, project_id)


@router.post("/files", response_model=FileResponse)
async def create_file(
    project_id: str,
    data: FileCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    await ProjectService.get_project_by_id(db, project_id, current_user.id)
    return await CodeService.create_file(db, project_id, data)


@router.put("/files/{filename:path}", response_model=FileResponse)
async def update_file(
    project_id: str,
    filename: str,
    data: FileUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    await ProjectService.get_project_by_id(db, project_id, current_user.id)
    if data.content is not None:
        return await CodeService.update_file_content(db, project_id, filename, data.content)
    
    file_obj = await CodeService.get_file_by_name(db, project_id, filename)
    if not file_obj:
        raise HTTPException(status_code=404, detail="File not found")
    return file_obj


@router.delete("/files/{filename:path}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_file(
    project_id: str,
    filename: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    await ProjectService.get_project_by_id(db, project_id, current_user.id)
    await CodeService.delete_file(db, project_id, filename)


@router.post("/element-update")
async def apply_element_update(
    project_id: str,
    payload: ElementUpdatePayload,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Visual website editor synchronization endpoint.
    Updates the element in the HTML and returns the clean synced source code.
    """
    await ProjectService.get_project_by_id(db, project_id, current_user.id)
    result = await CodeService.apply_visual_element_update(
        db=db,
        project_id=project_id,
        element_id=payload.element_id,
        text_content=payload.text_content,
        styles=payload.styles,
        attributes=payload.attributes
    )
    return result


@router.post("/upload-asset")
async def upload_asset(
    project_id: str,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Upload an image or asset file for image replacement in visual editor.
    """
    await ProjectService.get_project_by_id(db, project_id, current_user.id)
    clean_name = sanitize_filename(file.filename)
    validate_file_safety(clean_name)

    proj_dir = os.path.join(settings.UPLOAD_DIR, project_id)
    os.makedirs(proj_dir, exist_ok=True)
    file_path = os.path.join(proj_dir, clean_name)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    file_size = os.path.getsize(file_path)
    url_path = f"/api/v1/projects/{project_id}/assets/{clean_name}"

    asset = ProjectAsset(
        project_id=project_id,
        filename=clean_name,
        stored_path=file_path,
        url_path=url_path,
        mime_type=file.content_type or "application/octet-stream",
        size_bytes=file_size
    )
    db.add(asset)
    await db.commit()

    return {
        "success": True,
        "filename": clean_name,
        "url": url_path,
        "size": file_size
    }


@router.get("/assets/{filename}")
async def get_project_asset(
    project_id: str,
    filename: str
):
    clean_name = sanitize_filename(filename)
    file_path = os.path.join(settings.UPLOAD_DIR, project_id, clean_name)
    if not os.path.isfile(file_path):
        raise HTTPException(status_code=404, detail="Asset not found")
    return FastAPIFileResponse(file_path)
