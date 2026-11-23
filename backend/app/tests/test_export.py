import io
import zipfile
import pytest


@pytest.mark.asyncio
async def test_export_and_version_history(client):
    # 1. Create project
    proj_resp = await client.post("/api/v1/projects", json={"title": "Exportable Website"})
    project_id = proj_resp.json()["id"]

    # 2. Export ZIP
    export_resp = await client.get(f"/api/v1/projects/{project_id}/export/zip")
    assert export_resp.status_code == 200
    assert export_resp.headers["content-type"] == "application/zip"

    # Verify zip content
    zip_bytes = export_resp.content
    with zipfile.ZipFile(io.BytesIO(zip_bytes)) as zf:
        namelist = zf.namelist()
        assert "index.html" in namelist
        assert "styles.css" in namelist
        assert "script.js" in namelist

    # 3. Create Version Snapshot
    version_resp = await client.post(
        f"/api/v1/projects/{project_id}/versions",
        json={"title": "Initial Release Snapshot", "description": "Working draft"}
    )
    assert version_resp.status_code == 200
    version_data = version_resp.json()
    assert version_data["title"] == "Initial Release Snapshot"
    assert version_data["version_number"] == 1
    version_id = version_data["id"]

    # 4. List versions
    list_versions = await client.get(f"/api/v1/projects/{project_id}/versions")
    assert list_versions.status_code == 200
    assert len(list_versions.json()) >= 1

    # 5. Restore version
    restore_resp = await client.post(f"/api/v1/projects/{project_id}/versions/{version_id}/restore")
    assert restore_resp.status_code == 200
    assert restore_resp.json()["id"] == version_id
