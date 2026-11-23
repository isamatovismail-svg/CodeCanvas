from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from fastapi import HTTPException, status
from typing import List, Optional, Dict, Any
from app.database.models import ProjectFile, Project
from app.schemas.file import FileCreate, FileUpdate
from app.utils.html_sync import update_element_in_html, inject_stable_identifiers
from app.utils.security_sandbox import validate_file_safety, sanitize_filename


class CodeService:
    @staticmethod
    async def get_files(db: AsyncSession, project_id: str) -> List[ProjectFile]:
        result = await db.execute(
            select(ProjectFile)
            .where(ProjectFile.project_id == project_id)
            .order_by(ProjectFile.is_entry_point.desc(), ProjectFile.name.asc())
        )
        return list(result.scalars().all())

    @staticmethod
    async def get_file_by_name(db: AsyncSession, project_id: str, filename: str) -> Optional[ProjectFile]:
        result = await db.execute(
            select(ProjectFile).where(
                ProjectFile.project_id == project_id,
                ProjectFile.name == filename
            )
        )
        return result.scalar_one_or_none()

    @staticmethod
    async def create_file(db: AsyncSession, project_id: str, data: FileCreate) -> ProjectFile:
        clean_name = sanitize_filename(data.name)
        validate_file_safety(clean_name, len(data.content.encode("utf-8")))

        existing = await CodeService.get_file_by_name(db, project_id, clean_name)
        if existing:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="File already exists")

        content = data.content
        if data.file_type == "html":
            content = inject_stable_identifiers(content)

        file_obj = ProjectFile(
            project_id=project_id,
            name=clean_name,
            file_type=data.file_type,
            content=content,
            is_entry_point=data.is_entry_point
        )
        db.add(file_obj)
        await db.commit()
        await db.refresh(file_obj)
        return file_obj

    @staticmethod
    async def update_file_content(db: AsyncSession, project_id: str, filename: str, content: str) -> ProjectFile:
        file_obj = await CodeService.get_file_by_name(db, project_id, filename)
        if not file_obj:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")

        # If it's HTML, ensure stable IDs are maintained
        if file_obj.file_type == "html":
            content = inject_stable_identifiers(content)

        file_obj.content = content
        await db.commit()
        await db.refresh(file_obj)
        return file_obj

    @staticmethod
    async def apply_visual_element_update(
        db: AsyncSession,
        project_id: str,
        element_id: str,
        text_content: Optional[str] = None,
        styles: Optional[Dict[str, str]] = None,
        attributes: Optional[Dict[str, str]] = None,
        append_child_html: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Locates the HTML file containing the element, applies the visual modification,
        and synchronizes back to the database.
        """
        # Find entry HTML file (e.g. index.html)
        result = await db.execute(
            select(ProjectFile).where(
                ProjectFile.project_id == project_id,
                ProjectFile.file_type == "html"
            ).order_by(ProjectFile.is_entry_point.desc())
        )
        html_files = list(result.scalars().all())
        if not html_files:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No HTML file in project")

        # Target entrypoint first
        target_file = html_files[0]
        updated_html = update_element_in_html(
            html_content=target_file.content,
            element_id=element_id,
            text_content=text_content,
            styles=styles,
            attributes=attributes,
            append_child_html=append_child_html
        )

        target_file.content = updated_html
        await db.commit()
        await db.refresh(target_file)

        return {
            "success": True,
            "filename": target_file.name,
            "element_id": element_id,
            "updated_html": updated_html
        }

    @staticmethod
    async def delete_file(db: AsyncSession, project_id: str, filename: str) -> None:
        file_obj = await CodeService.get_file_by_name(db, project_id, filename)
        if not file_obj:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")

        if file_obj.is_entry_point:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot delete entry point file")

        await db.delete(file_obj)
        await db.commit()
