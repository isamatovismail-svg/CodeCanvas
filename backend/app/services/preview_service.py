import re
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import HTTPException, status
from app.database.models import ProjectFile
from app.utils.html_sync import inject_preview_bridge, inject_stable_identifiers
from app.utils.security_sandbox import sanitize_html_preview


class PreviewService:
    @staticmethod
    async def build_preview_document(db: AsyncSession, project_id: str) -> str:
        """
        Assembles all project files (HTML, CSS, JS) into a self-contained,
        sandboxed preview document with the CodeCanvas Visual Bridge injected.
        """
        result = await db.execute(
            select(ProjectFile).where(ProjectFile.project_id == project_id)
        )
        files = list(result.scalars().all())

        # Locate entrypoint HTML
        html_file = next((f for f in files if f.is_entry_point and f.file_type == "html"), None)
        if not html_file:
            html_file = next((f for f in files if f.file_type == "html"), None)

        if not html_file:
            html_content = "<!DOCTYPE html><html><head><title>Preview</title></head><body><p>No HTML files found.</p></body></html>"
        else:
            html_content = html_file.content

        # Ensure stable identifiers
        html_content = inject_stable_identifiers(html_content)

        # Collect CSS files and inline them
        css_blocks = []
        for f in files:
            if f.file_type == "css":
                css_blocks.append(f"/* File: {f.name} */\n{f.content}")

        combined_css = "\n".join(css_blocks)
        if combined_css.strip():
            style_tag = f"\n<style id=\"codecanvas-injected-styles\">\n{combined_css}\n</style>\n"
            if "</head>" in html_content:
                html_content = html_content.replace("</head>", f"{style_tag}</head>")
            else:
                html_content = f"{style_tag}{html_content}"

        # Collect JS files and append them before </body>
        js_blocks = []
        for f in files:
            if f.file_type == "js":
                js_blocks.append(f"// File: {f.name}\ntry {{\n{f.content}\n}} catch (e) {{ console.error('Error in {f.name}:', e); }}")

        combined_js = "\n".join(js_blocks)
        if combined_js.strip():
            script_tag = f"\n<script id=\"codecanvas-injected-scripts\">\n{combined_js}\n</script>\n"
            if "</body>" in html_content:
                html_content = html_content.replace("</body>", f"{script_tag}</body>")
            else:
                html_content = f"{html_content}{script_tag}"

        # Sanitize HTML preview
        html_content = sanitize_html_preview(html_content)

        # Inject CodeCanvas Bridge for visual interaction & console monitoring
        full_preview = inject_preview_bridge(html_content, project_id)

        return full_preview
