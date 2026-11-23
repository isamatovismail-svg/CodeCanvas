import io
import os
import zipfile
from typing import List, Dict, Any, Tuple
from fastapi import HTTPException, status
from app.utils.security_sandbox import (
    sanitize_filename,
    validate_file_safety,
    MAX_ZIP_EXTRACTED_SIZE,
    MAX_ZIP_FILES
)


def create_project_zip(files: List[Dict[str, Any]], project_title: str) -> io.BytesIO:
    """
    Creates an in-memory zip archive containing all project files.
    """
    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zf:
        for f in files:
            file_name = sanitize_filename(f.get("name", "unnamed.txt"))
            content = f.get("content", "")
            zf.writestr(file_name, content)
            
    zip_buffer.seek(0)
    return zip_buffer


def extract_project_zip(zip_bytes: bytes) -> List[Dict[str, str]]:
    """
    Safely extracts files from a zip archive.
    Protects against Zip Slip (path traversal) and Zip Bombs.
    Returns list of dicts with 'name', 'content', 'file_type'.
    """
    extracted_files = []
    total_size = 0
    file_count = 0

    try:
        with zipfile.ZipFile(io.BytesIO(zip_bytes)) as zf:
            for member in zf.infolist():
                if member.is_dir():
                    continue

                file_count += 1
                if file_count > MAX_ZIP_FILES:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Archive contains too many files (maximum {MAX_ZIP_FILES})."
                    )

                total_size += member.file_size
                if total_size > MAX_ZIP_EXTRACTED_SIZE:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Extracted archive size exceeds safe limits (Zip Bomb protection)."
                    )

                clean_name = sanitize_filename(member.filename)
                validate_file_safety(clean_name, member.file_size)

                ext = os.path.splitext(clean_name)[1].lower()
                file_type = "asset"
                if ext in [".html", ".htm"]:
                    file_type = "html"
                elif ext == ".css":
                    file_type = "css"
                elif ext in [".js", ".mjs"]:
                    file_type = "js"
                elif ext == ".json":
                    file_type = "json"

                file_data = zf.read(member)
                try:
                    content_str = file_data.decode("utf-8")
                except UnicodeDecodeError:
                    # Non-text binary asset (e.g., png/jpg), skip or store as base64 if needed
                    content_str = ""

                extracted_files.append({
                    "name": clean_name,
                    "content": content_str,
                    "file_type": file_type
                })

        return extracted_files

    except zipfile.BadZipFile:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is not a valid ZIP archive."
        )
