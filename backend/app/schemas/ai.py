from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any


class AIOperation(BaseModel):
    op_type: str = Field(..., description="update_style, update_text, replace_attribute, insert_element, delete_element, update_code")
    target_selector: Optional[str] = None
    target_element_id: Optional[str] = None
    styles: Optional[Dict[str, str]] = None
    text_content: Optional[str] = None
    attributes: Optional[Dict[str, str]] = None
    filename: Optional[str] = None
    code_patch: Optional[str] = None
    explanation: Optional[str] = None


class AIEditRequest(BaseModel):
    prompt: str = Field(..., min_length=1, max_length=1000)
    selected_element_id: Optional[str] = None
    selected_element_tag: Optional[str] = None
    selected_element_classes: Optional[str] = None
    current_html: Optional[str] = None
    current_css: Optional[str] = None


class AIEditResponse(BaseModel):
    success: bool
    message: str
    operations: List[AIOperation] = []
    generated_code: Optional[Dict[str, str]] = None
    provider: str = "mock-or-configured"
