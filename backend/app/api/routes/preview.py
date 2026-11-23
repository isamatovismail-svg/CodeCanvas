from fastapi import APIRouter, Depends, Response
from sqlalchemy.ext.asyncio import AsyncSession
from app.database.connection import get_db
from app.database.models import User
from app.api.deps import get_current_user
from app.services.preview_service import PreviewService
from app.services.project_service import ProjectService

router = APIRouter(prefix="/projects/{project_id}", tags=["Live Preview"])


@router.get("/preview")
async def get_preview(
    project_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Renders the live sandboxed website preview document.
    Requires authentication; verifies the caller owns or has access to the project.
    """
    # Authorization: raise 403 if user has no access to this project
    await ProjectService.get_project_by_id(db, project_id, current_user.id)

    preview_html = await PreviewService.build_preview_document(db, project_id)

    # Tight CSP for preview isolation.
    # 'unsafe-inline' is required because user HTML/CSS may use inline styles and scripts.
    # 'unsafe-eval' is intentionally omitted — user code rarely needs eval().
    # frame-ancestors restricts embedding to the same origin / localhost only.
    headers = {
        "Content-Type": "text/html; charset=utf-8",
        "X-Content-Type-Options": "nosniff",
        "X-Frame-Options": "SAMEORIGIN",
        "Content-Security-Policy": (
            "default-src 'self' 'unsafe-inline' data: blob: https:; "
            "script-src 'unsafe-inline' 'self' data: blob:; "
            "frame-ancestors 'self' http://localhost:* http://127.0.0.1:*;"
        ),
    }
    return Response(content=preview_html, media_type="text/html", headers=headers)
