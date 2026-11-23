from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete
from sqlalchemy.orm import selectinload
from fastapi import HTTPException, status
from typing import List, Optional, Dict, Any
from app.database.models import Project, ProjectFile, ProjectCollaborator, User
from app.schemas.project import ProjectCreate, ProjectUpdate, ProjectImportPaste
from app.utils.html_sync import inject_stable_identifiers
from app.utils.archive import extract_project_zip

DEFAULT_HTML = """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to CodeCanvas</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <div class="container" data-cc-id="container-1">
    <header class="header" data-cc-id="header-1">
      <div class="badge" data-cc-id="badge-1">⚡ Next-Gen Visual Editor</div>
      <h1 class="main-title" data-cc-id="title-1">Craft Stunning Web Experiences</h1>
      <p class="subtitle" data-cc-id="subtitle-1">
        CodeCanvas lets you edit text, tweak styles, swap imagery, and inspect elements visually while maintaining clean, synchronized source code.
      </p>
      <div class="cta-group" data-cc-id="cta-group-1">
        <button id="cta-button" class="btn primary-btn" data-cc-id="btn-1">Get Started Free</button>
        <button class="btn secondary-btn" data-cc-id="btn-2">Explore Features</button>
      </div>
    </header>

    <main class="content-grid" data-cc-id="grid-1">
      <div class="card" data-cc-id="card-1">
        <div class="card-icon" data-cc-id="icon-1">🎨</div>
        <h3 class="card-title" data-cc-id="card-title-1">Visual Styling</h3>
        <p class="card-text" data-cc-id="card-text-1">
          Adjust colors, typography, spacing, and borders with intuitive live controls.
        </p>
      </div>
      <div class="card" data-cc-id="card-2">
        <div class="card-icon" data-cc-id="icon-2">⚡</div>
        <h3 class="card-title" data-cc-id="card-title-2">Real-Time Sync</h3>
        <p class="card-text" data-cc-id="card-text-2">
          Every visual edit updates the Monaco code editor and underlying source instantly.
        </p>
      </div>
      <div class="card" data-cc-id="card-3">
        <div class="card-icon" data-cc-id="icon-3">🤖</div>
        <h3 class="card-title" data-cc-id="card-title-3">AI Assistant</h3>
        <p class="card-text" data-cc-id="card-text-3">
          Execute structured edits using natural language prompts without breaking layout.
        </p>
      </div>
    </main>

    <footer class="footer" data-cc-id="footer-1">
      <p data-cc-id="footer-text-1">Built with CodeCanvas &copy; 2025. All rights reserved.</p>
    </footer>
  </div>
  <script src="script.js"></script>
</body>
</html>"""

DEFAULT_CSS = """* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  background-color: #0b0f19;
  color: #f3f4f6;
  min-height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 2rem 1rem;
}

.container {
  max-width: 960px;
  width: 100%;
  margin: 0 auto;
}

.header {
  text-align: center;
  padding: 3rem 1.5rem;
  background: linear-gradient(180deg, #131b2e 0%, #0b0f19 100%);
  border-radius: 1rem;
  border: 1px solid #1e293b;
  margin-bottom: 2.5rem;
}

.badge {
  display: inline-block;
  padding: 0.35rem 0.85rem;
  background-color: #1e293b;
  color: #60a5fa;
  font-size: 0.875rem;
  font-weight: 600;
  border-radius: 9999px;
  border: 1px solid #3b82f644;
  margin-bottom: 1.25rem;
}

.main-title {
  font-size: 2.75rem;
  font-weight: 800;
  color: #ffffff;
  letter-spacing: -0.025em;
  line-height: 1.2;
  margin-bottom: 1rem;
}

.subtitle {
  font-size: 1.125rem;
  color: #94a3b8;
  max-width: 600px;
  margin: 0 auto 2rem auto;
  line-height: 1.6;
}

.cta-group {
  display: flex;
  gap: 1rem;
  justify-content: center;
  flex-wrap: wrap;
}

.btn {
  padding: 0.75rem 1.75rem;
  font-size: 1rem;
  font-weight: 600;
  border-radius: 0.5rem;
  cursor: pointer;
  border: none;
  transition: all 0.2s ease;
}

.primary-btn {
  background-color: #3b82f6;
  color: #ffffff;
}

.primary-btn:hover {
  background-color: #2563eb;
  transform: translateY(-1px);
}

.secondary-btn {
  background-color: #1e293b;
  color: #e2e8f0;
  border: 1px solid #334155;
}

.secondary-btn:hover {
  background-color: #334155;
}

.content-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2.5rem;
}

.card {
  background-color: #131b2e;
  border: 1px solid #1e293b;
  border-radius: 0.75rem;
  padding: 1.75rem;
  transition: border-color 0.2s ease, transform 0.2s ease;
}

.card:hover {
  border-color: #3b82f6;
  transform: translateY(-2px);
}

.card-icon {
  font-size: 1.75rem;
  margin-bottom: 1rem;
}

.card-title {
  font-size: 1.25rem;
  color: #f8fafc;
  margin-bottom: 0.5rem;
  font-weight: 600;
}

.card-text {
  font-size: 0.95rem;
  color: #94a3b8;
  line-height: 1.5;
}

.footer {
  text-align: center;
  color: #64748b;
  font-size: 0.875rem;
  padding-top: 1rem;
}
"""

DEFAULT_JS = """// CodeCanvas Interactive Script
document.addEventListener('DOMContentLoaded', () => {
  const ctaBtn = document.getElementById('cta-button');
  if (ctaBtn) {
    ctaBtn.addEventListener('click', () => {
      alert('Awesome! You clicked the interactive button.');
    });
  }
  console.log('CodeCanvas live preview loaded successfully!');
});
"""


class ProjectService:
    @staticmethod
    async def get_projects(db: AsyncSession, user_id: str) -> List[Project]:
        result = await db.execute(
            select(Project)
            .where(Project.owner_id == user_id)
            .options(selectinload(Project.files))
            .order_by(Project.updated_at.desc())
        )
        return list(result.scalars().all())

    @staticmethod
    async def get_project_by_id(db: AsyncSession, project_id: str, user_id: Optional[str] = None) -> Project:
        result = await db.execute(
            select(Project)
            .where(Project.id == project_id)
            .options(
                selectinload(Project.files),
                selectinload(Project.versions),
                selectinload(Project.collaborators)
            )
        )
        project = result.scalar_one_or_none()
        if not project:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

        # Authorization check: owner, public, or collaborator
        if user_id and not project.is_public and project.owner_id != user_id:
            # Check collaborator
            collab_result = await db.execute(
                select(ProjectCollaborator).where(
                    ProjectCollaborator.project_id == project_id,
                    ProjectCollaborator.user_id == user_id
                )
            )
            if not collab_result.scalar_one_or_none():
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

        return project

    @staticmethod
    async def create_project(db: AsyncSession, user_id: str, data: ProjectCreate) -> Project:
        project = Project(
            title=data.title,
            description=data.description,
            owner_id=user_id,
            is_public=data.is_public,
            active_framework=data.active_framework
        )
        db.add(project)
        await db.flush()

        # Create starter files
        html_content = inject_stable_identifiers(DEFAULT_HTML)
        f_html = ProjectFile(
            project_id=project.id,
            name="index.html",
            file_type="html",
            content=html_content,
            is_entry_point=True
        )
        f_css = ProjectFile(
            project_id=project.id,
            name="styles.css",
            file_type="css",
            content=DEFAULT_CSS
        )
        f_js = ProjectFile(
            project_id=project.id,
            name="script.js",
            file_type="js",
            content=DEFAULT_JS
        )
        db.add_all([f_html, f_css, f_js])
        await db.commit()
        await db.refresh(project)

        return await ProjectService.get_project_by_id(db, project.id, user_id)

    @staticmethod
    async def import_paste_project(db: AsyncSession, user_id: str, data: ProjectImportPaste) -> Project:
        project = Project(
            title=data.title,
            description=data.description or "Imported via code paste",
            owner_id=user_id
        )
        db.add(project)
        await db.flush()

        html_code = data.html_code if data.html_code.strip() else DEFAULT_HTML
        html_code = inject_stable_identifiers(html_code)

        css_code = data.css_code if data.css_code.strip() else "/* Imported styles */\n"
        js_code = data.js_code if data.js_code.strip() else "// Imported scripts\n"

        f_html = ProjectFile(project_id=project.id, name="index.html", file_type="html", content=html_code, is_entry_point=True)
        f_css = ProjectFile(project_id=project.id, name="styles.css", file_type="css", content=css_code)
        f_js = ProjectFile(project_id=project.id, name="script.js", file_type="js", content=js_code)

        db.add_all([f_html, f_css, f_js])
        await db.commit()
        await db.refresh(project)

        return await ProjectService.get_project_by_id(db, project.id, user_id)

    @staticmethod
    async def import_zip_project(db: AsyncSession, user_id: str, title: str, zip_bytes: bytes) -> Project:
        extracted = extract_project_zip(zip_bytes)
        if not extracted:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="ZIP archive is empty or contains no valid files.")

        project = Project(
            title=title,
            description="Imported from ZIP archive",
            owner_id=user_id
        )
        db.add(project)
        await db.flush()

        has_entry = False
        files_to_add = []
        for file_info in extracted:
            name = file_info["name"]
            is_entry = (name.lower() in ["index.html", "index.htm"] and not has_entry)
            if is_entry:
                has_entry = True
                content = inject_stable_identifiers(file_info["content"])
            else:
                content = file_info["content"]

            pf = ProjectFile(
                project_id=project.id,
                name=name,
                file_type=file_info["file_type"],
                content=content,
                is_entry_point=is_entry
            )
            files_to_add.append(pf)

        # If no entry point HTML found, mark the first HTML or create one
        if not has_entry:
            html_candidates = [f for f in files_to_add if f.file_type == "html"]
            if html_candidates:
                html_candidates[0].is_entry_point = True
                html_candidates[0].content = inject_stable_identifiers(html_candidates[0].content)
            else:
                files_to_add.append(
                    ProjectFile(
                        project_id=project.id,
                        name="index.html",
                        file_type="html",
                        content=inject_stable_identifiers(DEFAULT_HTML),
                        is_entry_point=True
                    )
                )

        db.add_all(files_to_add)
        await db.commit()
        await db.refresh(project)

        return await ProjectService.get_project_by_id(db, project.id, user_id)

    @staticmethod
    async def update_project(db: AsyncSession, project_id: str, user_id: str, data: ProjectUpdate) -> Project:
        project = await ProjectService.get_project_by_id(db, project_id, user_id)
        if project.owner_id != user_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only owner can modify project settings")

        if data.title is not None:
            project.title = data.title
        if data.description is not None:
            project.description = data.description
        if data.is_public is not None:
            project.is_public = data.is_public
        if data.active_framework is not None:
            project.active_framework = data.active_framework

        await db.commit()
        await db.refresh(project)
        return project

    @staticmethod
    async def delete_project(db: AsyncSession, project_id: str, user_id: str) -> None:
        project = await ProjectService.get_project_by_id(db, project_id, user_id)
        if project.owner_id != user_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only owner can delete project")

        await db.delete(project)
        await db.commit()
