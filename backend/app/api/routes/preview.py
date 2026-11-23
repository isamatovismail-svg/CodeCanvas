from fastapi import APIRouter, Depends, Response
from sqlalchemy.ext.asyncio import AsyncSession
from app.database.connection import get_db
from app.services.preview_service import PreviewService

router = APIRouter(prefix="/projects/{project_id}", tags=["Live Preview"])


@router.get("/preview")
async def get_preview(
    project_id: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Renders the live sandboxed website preview document.
    """
    preview_html = await PreviewService.build_preview_document(db, project_id)
    
    # Sandboxed headers: isolation from host application
    headers = {
        "Content-Type": "text/html; charset=utf-8",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob: https:; frame-ancestors 'self' http://localhost:* http://127.0.0.1:*;"
    }
    return Response(content=preview_html, media_type="text/html", headers=headers)
