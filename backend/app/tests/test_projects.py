import pytest


@pytest.mark.asyncio
async def test_create_and_list_project(client):
    # 1. Create a project
    create_payload = {
        "title": "My Awesome Website",
        "description": "Visual website test project",
        "is_public": False,
        "active_framework": "vanilla"
    }
    response = await client.post("/api/v1/projects", json=create_payload)
    assert response.status_code == 200
    data = response.json()
    assert data["title"] == "My Awesome Website"
    assert "id" in data
    assert len(data["files"]) >= 3  # index.html, styles.css, script.js
    project_id = data["id"]

    # 2. List projects
    list_resp = await client.get("/api/v1/projects")
    assert list_resp.status_code == 200
    projects = list_resp.json()
    assert any(p["id"] == project_id for p in projects)

    # 3. Get single project
    get_resp = await client.get(f"/api/v1/projects/{project_id}")
    assert get_resp.status_code == 200
    assert get_resp.json()["id"] == project_id

    # 4. Update project title
    update_resp = await client.put(f"/api/v1/projects/{project_id}", json={"title": "Renamed Site"})
    assert update_resp.status_code == 200
    assert update_resp.json()["title"] == "Renamed Site"

    # 5. Delete project
    del_resp = await client.delete(f"/api/v1/projects/{project_id}")
    assert del_resp.status_code == 204

    # 6. Verify 404
    get_again = await client.get(f"/api/v1/projects/{project_id}")
    assert get_again.status_code == 404


@pytest.mark.asyncio
async def test_import_paste_project(client):
    paste_payload = {
        "title": "Pasted Webpage",
        "html_code": '<section id="hero"><h1>Custom Imported Code</h1></section>',
        "css_code": '#hero { background: black; }',
        "js_code": 'console.log("imported");'
    }
    response = await client.post("/api/v1/projects/import/paste", json=paste_payload)
    assert response.status_code == 200
    data = response.json()
    assert data["title"] == "Pasted Webpage"
    html_file = next(f for f in data["files"] if f["file_type"] == "html")
    assert "Custom Imported Code" in html_file["content"]
    assert "data-cc-id" in html_file["content"]
