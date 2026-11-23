import io
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import HTTPException, status
from fastapi.responses import StreamingResponse
from app.database.models import Project, ProjectFile
from app.utils.archive import create_project_zip


class ExportService:
    @staticmethod
    async def export_zip(db: AsyncSession, project_id: str) -> StreamingResponse:
        project_result = await db.execute(
            select(Project).where(Project.id == project_id)
        )
        project = project_result.scalar_one_or_none()
        if not project:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

        files_result = await db.execute(
            select(ProjectFile).where(ProjectFile.project_id == project_id)
        )
        files = [
            {"name": f.name, "content": f.content}
            for f in files_result.scalars().all()
        ]

        zip_io = create_project_zip(files, project.title)
        safe_title = "".join(c for c in project.title if c.isalnum() or c in ("-", "_")).rstrip()
        if not safe_title:
            safe_title = "codecanvas_project"

        filename = f"{safe_title}.zip"
        return StreamingResponse(
            zip_io,
            media_type="application/zip",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'}
        )
