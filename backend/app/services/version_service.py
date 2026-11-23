from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, delete
from fastapi import HTTPException, status
from typing import List, Optional, Dict, Any
from app.database.models import ProjectVersion, ProjectFile, Project
from app.schemas.version import VersionCreate


class VersionService:
    @staticmethod
    async def create_version(
        db: AsyncSession,
        project_id: str,
        user_id: Optional[str] = None,
        title: str = "Auto-save",
        description: Optional[str] = None
    ) -> ProjectVersion:
        # Fetch existing files to snapshot
        result = await db.execute(
            select(ProjectFile).where(ProjectFile.project_id == project_id)
        )
        files = list(result.scalars().all())

        snapshot_data = {
            "files": [
                {
                    "name": f.name,
                    "file_type": f.file_type,
                    "content": f.content,
                    "is_entry_point": f.is_entry_point
                }
                for f in files
            ]
        }

        # Calculate next version number
        num_result = await db.execute(
            select(func.coalesce(func.max(ProjectVersion.version_number), 0))
            .where(ProjectVersion.project_id == project_id)
        )
        next_ver = num_result.scalar() + 1

        version = ProjectVersion(
            project_id=project_id,
            version_number=next_ver,
            title=title,
            description=description,
            snapshot=snapshot_data,
            created_by_id=user_id
        )
        db.add(version)
        await db.commit()
        await db.refresh(version)
        return version

    @staticmethod
    async def get_versions(db: AsyncSession, project_id: str) -> List[ProjectVersion]:
        result = await db.execute(
            select(ProjectVersion)
            .where(ProjectVersion.project_id == project_id)
            .order_by(ProjectVersion.version_number.desc())
        )
        return list(result.scalars().all())

    @staticmethod
    async def restore_version(db: AsyncSession, project_id: str, version_id: str) -> ProjectVersion:
        result = await db.execute(
            select(ProjectVersion).where(
                ProjectVersion.project_id == project_id,
                ProjectVersion.id == version_id
            )
        )
        version = result.scalar_one_or_none()
        if not version:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Version not found")

        # Snapshot before restoring so work isn't lost
        await VersionService.create_version(
            db, project_id, title=f"Pre-restore backup (before V{version.version_number})"
        )

        # Clear existing project files
        await db.execute(
            delete(ProjectFile).where(ProjectFile.project_id == project_id)
        )

        # Recreate files from snapshot
        files_data = version.snapshot.get("files", [])
        for f_data in files_data:
            new_file = ProjectFile(
                project_id=project_id,
                name=f_data["name"],
                file_type=f_data["file_type"],
                content=f_data["content"],
                is_entry_point=f_data.get("is_entry_point", False)
            )
            db.add(new_file)

        await db.commit()
        return version
