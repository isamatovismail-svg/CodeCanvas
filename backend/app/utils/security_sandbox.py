import os
import re
from pathlib import Path
from fastapi import HTTPException, status

ALLOWED_EXTENSIONS = {
    ".html", ".htm",
    ".css",
    ".js", ".mjs",
    ".json",
    ".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp", ".ico",
    ".woff", ".woff2", ".ttf", ".eot"
}

DISALLOWED_EXTENSIONS = {
    ".exe", ".bat", ".cmd", ".sh", ".bash", ".zsh",
    ".py", ".pyc", ".pyd", ".php", ".pl", ".rb",
    ".bin", ".dll", ".so", ".dylib", ".jar"
}

MAX_FILE_SIZE = 25 * 1024 * 1024  # 25 MB
MAX_ZIP_EXTRACTED_SIZE = 100 * 1024 * 1024  # 100 MB
MAX_ZIP_FILES = 500


def sanitize_filename(filename: str) -> str:
    """Sanitizes filename, preventing path traversal and non-standard characters."""
    filename = filename.replace("\\", "/").strip()
    
    # Remove directory traversals
    parts = [p for p in filename.split("/") if p and p != ".." and p != "."]
    cleaned = "/".join(parts)
    
    if not cleaned:
        cleaned = "unnamed_file.txt"
        
    return cleaned


def validate_file_safety(filename: str, size: int = 0):
    """Ensures file extension is safe and within size bounds."""
    ext = Path(filename).suffix.lower()
    
    if ext in DISALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Security rejection: Executable or script file type '{ext}' is not permitted."
        )

    if size > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File exceeds maximum allowed size of {MAX_FILE_SIZE // (1024*1024)}MB."
        )


def sanitize_html_preview(html_content: str) -> str:
    """
    Sanitizes HTML content before sending to preview iframe to prevent iframe escaping
    or sandbox evasion while preserving normal web capabilities (styles, scripts, DOM).
    """
    if not html_content:
        return ""
    
    # Strip any attempts to break out of iframe or override parent window navigation
    cleaned = re.sub(r'target\s*=\s*["\']_top["\']', 'target="_blank"', html_content, flags=re.IGNORECASE)
    cleaned = re.sub(r'target\s*=\s*["\']_parent["\']', 'target="_blank"', cleaned, flags=re.IGNORECASE)
    
    return cleaned
