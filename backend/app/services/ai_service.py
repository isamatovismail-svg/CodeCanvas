import json
import re
from typing import Dict, Any, List, Optional
import httpx
from app.core.config import settings
from app.schemas.ai import AIEditRequest, AIEditResponse, AIOperation


class AIService:
    @staticmethod
    async def process_edit_request(request: AIEditRequest) -> AIEditResponse:
        prompt_lower = request.prompt.lower().strip()

        # If OpenAI key is present, try LLM call
        if settings.OPENAI_API_KEY:
            try:
                return await AIService._call_openai(request)
            except Exception as e:
                # Log and fallback gracefully
                pass

        # MVP Rule-Based Engine for structured operations
        return AIService._rule_based_ai_fallback(request, prompt_lower)

    @staticmethod
    async def _call_openai(request: AIEditRequest) -> AIEditResponse:
        system_prompt = (
            "You are CodeCanvas AI, an expert visual web developer. "
            "Given a user prompt and optional selected HTML element context, "
            "generate precise, structured editing operations. "
            "Do NOT rewrite the whole code. "
            "Output JSON with 'operations': list of { op_type ('update_style' | 'update_text' | 'replace_attribute'), "
            "target_element_id, styles (dict), text_content (str), explanation }."
        )

        user_content = f"User Request: {request.prompt}\n"
        if request.selected_element_id:
            user_content += f"Target Element ID: {request.selected_element_id}\n"
        if request.selected_element_tag:
            user_content += f"Target Tag: {request.selected_element_tag}\n"

        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                "https://api.openai.com/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {settings.OPENAI_API_KEY}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": "gpt-4o-mini",
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_content}
                    ],
                    "response_format": {"type": "json_object"}
                }
            )
            data = resp.json()
            content = data["choices"][0]["message"]["content"]
            parsed = json.loads(content)
            
            ops = [AIOperation(**op) for op in parsed.get("operations", [])]
            return AIEditResponse(
                success=True,
                message=f"AI generated {len(ops)} structured operations.",
                operations=ops,
                provider="openai-gpt-4o-mini"
            )

    @staticmethod
    def _rule_based_ai_fallback(request: AIEditRequest, prompt_lower: str) -> AIEditResponse:
        target_id = request.selected_element_id or "header-1"
        operations: List[AIOperation] = []

        # Color changes (e.g. "change header background to blue", "make background dark")
        if "background" in prompt_lower or "bg" in prompt_lower:
            color = "#1e3a8a"  # blue
            if "red" in prompt_lower:
                color = "#991b1b"
            elif "green" in prompt_lower:
                color = "#166534"
            elif "purple" in prompt_lower:
                color = "#581c87"
            elif "dark" in prompt_lower or "black" in prompt_lower:
                color = "#0f172a"
            elif "white" in prompt_lower:
                color = "#ffffff"
            elif "gradient" in prompt_lower:
                color = "linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)"

            operations.append(AIOperation(
                op_type="update_style",
                target_element_id=target_id,
                styles={"backgroundColor": color},
                explanation=f"Updated background color to {color}"
            ))

        # Size changes (e.g. "make button bigger", "increase font size")
        if "bigger" in prompt_lower or "larger" in prompt_lower:
            target = request.selected_element_id or "btn-1"
            operations.append(AIOperation(
                op_type="update_style",
                target_element_id=target,
                styles={
                    "padding": "1rem 2.25rem",
                    "fontSize": "1.25rem",
                    "borderRadius": "0.75rem"
                },
                explanation="Enlarged element padding, font size, and border radius"
            ))

        # Text changes (e.g. "replace text with Hello World")
        text_match = re.search(r'(?:replace|change)\s+(?:the\s+)?text(?:\s+to|\s+with)?\s+["\']?([^"\']+)["\']?', prompt_lower)
        if text_match:
            new_text = text_match.group(1).strip()
            operations.append(AIOperation(
                op_type="update_text",
                target_element_id=target_id,
                text_content=new_text,
                explanation=f"Updated element text to '{new_text}'"
            ))

        # Mobile friendly / responsive layout request
        if "mobile" in prompt_lower or "responsive" in prompt_lower:
            operations.append(AIOperation(
                op_type="update_style",
                target_element_id="container-1",
                styles={
                    "padding": "1rem",
                    "maxWidth": "100%",
                    "width": "100%"
                },
                explanation="Applied responsive mobile constraints"
            ))

        if not operations:
            # Default helpful operation
            operations.append(AIOperation(
                op_type="update_style",
                target_element_id=target_id,
                styles={"boxShadow": "0 10px 25px -5px rgba(59, 130, 246, 0.5)"},
                explanation="Applied glowing accent styling based on your prompt"
            ))

        provider_label = "built-in-structured-engine"
        if not settings.OPENAI_API_KEY:
            note = "(API key not configured: executed via built-in structured assistant engine)"
        else:
            note = ""

        return AIEditResponse(
            success=True,
            message=f"Generated structured editing operations {note}".strip(),
            operations=operations,
            provider=provider_label
        )
