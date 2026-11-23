from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.database.connection import get_db
from app.database.models import User
from app.api.deps import get_current_user
from app.services.export_service import ExportService
from app.services.project_service import ProjectService

router = APIRouter(prefix="/projects/{project_id}", tags=["Export"])


@router.get("/export/zip")
async def export_project_zip(
    project_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Exports and downloads the complete project as a structured ZIP file.
    Requires authentication and project ownership/access.
    """
    # Authorization: raise 403 if user has no access to this project
    await ProjectService.get_project_by_id(db, project_id, current_user.id)
    return await ExportService.export_zip(db, project_id)
