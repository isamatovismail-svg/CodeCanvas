from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.database.connection import get_db
from app.services.export_service import ExportService

router = APIRouter(prefix="/projects/{project_id}", tags=["Export"])


@router.get("/export/zip")
async def export_project_zip(
    project_id: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Exports and downloads the complete project as a structured ZIP file.
    """
    return await ExportService.export_zip(db, project_id)
