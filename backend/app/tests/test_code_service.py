import pytest


@pytest.mark.asyncio
async def test_file_crud_and_visual_sync(client):
    # Create project first
    proj_resp = await client.post("/api/v1/projects", json={"title": "Sync Project"})
    project_id = proj_resp.json()["id"]

    # 1. List files
    files_resp = await client.get(f"/api/v1/projects/{project_id}/files")
    assert files_resp.status_code == 200
    files = files_resp.json()
    assert len(files) >= 3

    # 2. Update CSS file
    css_update = await client.put(
        f"/api/v1/projects/{project_id}/files/styles.css",
        json={"content": "body { background: purple; }"}
    )
    assert css_update.status_code == 200
    assert css_update.json()["content"] == "body { background: purple; }"

    # 3. Create a new custom component file
    create_comp = await client.post(
        f"/api/v1/projects/{project_id}/files",
        json={"name": "navbar.html", "file_type": "html", "content": "<nav>Nav Bar</nav>"}
    )
    assert create_comp.status_code == 200
    assert create_comp.json()["name"] == "navbar.html"

    # 4. Perform Visual Element Update (Click-to-edit sync)
    sync_resp = await client.post(
        f"/api/v1/projects/{project_id}/element-update",
        json={
            "element_id": "title-1",
            "text_content": "Visual Edit Heading Synchronized!",
            "styles": {"color": "#ef4444"}
        }
    )
    assert sync_resp.status_code == 200
    sync_data = sync_resp.json()
    assert sync_data["success"] is True
    assert "Visual Edit Heading Synchronized!" in sync_data["updated_html"]
    assert "color: #ef4444" in sync_data["updated_html"]

    # 5. Check Live Preview endpoint
    preview_resp = await client.get(f"/api/v1/projects/{project_id}/preview")
    assert preview_resp.status_code == 200
    preview_html = preview_resp.text
    assert "Visual Edit Heading Synchronized!" in preview_html
    assert "codecanvas-preview-bridge" in preview_html
