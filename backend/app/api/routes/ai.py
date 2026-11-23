from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.database.connection import get_db
from app.database.models import User
from app.api.deps import get_current_user
from app.schemas.ai import AIEditRequest, AIEditResponse
from app.services.ai_service import AIService
from app.services.project_service import ProjectService

router = APIRouter(prefix="/projects/{project_id}/ai", tags=["AI Assistant"])


@router.post("/edit", response_model=AIEditResponse)
async def ai_edit(
    project_id: str,
    request: AIEditRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Processes an AI natural language visual edit request and returns
    structured editing operations.
    """
    await ProjectService.get_project_by_id(db, project_id, current_user.id)
    return await AIService.process_edit_request(request)
