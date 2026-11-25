from __future__ import annotations

import io

from docx import Document as DocxDocument
from fastapi.testclient import TestClient


def _auth_header(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def test_role_permissions_and_docx_resume_processing(client: TestClient) -> None:
    # Owner registers an organization
    owner_res = client.post(
        "/api/v1/auth/register",
        json={
            "full_name": "Clara Owner",
            "email": "clara.owner@company.example.com",
            "password": "Password!234",
            "account_type": "recruiter",
            "organization_name": "Cedar Systems",
        },
    )
    assert owner_res.status_code == 201
    owner_token = owner_res.json()["access_token"]

    # Invite a Hiring Manager
    invite_res = client.post(
        "/api/v1/team/invite",
        headers=_auth_header(owner_token),
        json={
            "full_name": "Hendra Manager",
            "email": "hendra.hm@company.example.com",
            "role": "hiring_manager",
            "department": "Engineering",
        },
    )
    assert invite_res.status_code == 201

    # Demo hiring manager cannot create jobs or update organization settings
    hm_demo = client.post("/api/v1/auth/demo", json={"role": "hiring_manager"})
    assert hm_demo.status_code == 200
    hm_token = hm_demo.json()["access_token"]

    forbidden_job = client.post(
        "/api/v1/jobs",
        headers=_auth_header(hm_token),
        json={
            "title": "Unauthorized Role",
            "department": "Engineering",
            "employment_type": "full_time",
            "work_arrangement": "remote",
            "location": "Remote",
            "description": "Hiring managers must not create job openings directly.",
        },
    )
    assert forbidden_job.status_code == 403

    forbidden_org = client.patch(
        "/api/v1/organizations/current",
        headers=_auth_header(hm_token),
        json={"name": "Hijacked Org"},
    )
    assert forbidden_org.status_code == 403

    # Build a valid DOCX file in memory and upload as candidate
    cand_res = client.post(
        "/api/v1/auth/register",
        json={
            "full_name": "Dina Docx",
            "email": "dina.docx@applicant.example.com",
            "password": "Password!234",
            "account_type": "candidate",
            "consent_resume_processing": True,
        },
    )
    assert cand_res.status_code == 201
    cand_token = cand_res.json()["access_token"]

    docx = DocxDocument()
    docx.add_heading("Dina Docx Resume", level=1)
    docx.add_paragraph("SUMMARY")
    docx.add_paragraph("Product designer with 5 years building Figma Design Systems and WCAG interfaces.")
    buf = io.BytesIO()
    docx.save(buf)
    buf.seek(0)

    upload_res = client.post(
        "/api/v1/documents/upload",
        headers=_auth_header(cand_token),
        data={"document_type": "resume", "consent_granted": "true"},
        files={
            "file": (
                "dina_resume.docx",
                buf.getvalue(),
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            )
        },
    )
    assert upload_res.status_code == 201
    signed_url = upload_res.json()["signed_download_url"]
    assert signed_url

    # Signed download succeeds for owner candidate and fails for another org
    dl_ok = client.get(signed_url, headers=_auth_header(cand_token))
    assert dl_ok.status_code == 200
    dl_cross = client.get(signed_url, headers=_auth_header(owner_token))
    assert dl_cross.status_code == 404

    # Candidate self-service data deletion works for non-demo accounts
    del_res = client.delete("/api/v1/auth/account", headers=_auth_header(cand_token))
    assert del_res.status_code == 200
    after_me = client.get("/api/v1/auth/me", headers=_auth_header(cand_token))
    assert after_me.status_code == 401


def test_password_reset_refresh_rotation_and_csv_export(client: TestClient) -> None:
    reg = client.post(
        "/api/v1/auth/register",
        json={
            "full_name": "Tariq Reset",
            "email": "tariq.reset@example.com",
            "password": "OldPassword!23",
            "account_type": "recruiter",
            "organization_name": "Reset Org",
        },
    )
    assert reg.status_code == 201
    refresh_1 = reg.json()["refresh_token"]

    # Refresh token rotates cleanly
    ref = client.post("/api/v1/auth/refresh", json={"refresh_token": refresh_1})
    assert ref.status_code == 200
    assert ref.json()["refresh_token"] != refresh_1
    # Reusing revoked token fails
    reuse = client.post("/api/v1/auth/refresh", json={"refresh_token": refresh_1})
    assert reuse.status_code == 401

    # Password reset flow works end-to-end
    req_reset = client.post("/api/v1/auth/password-reset/request", json={"email": "tariq.reset@example.com"})
    assert req_reset.status_code == 200
    reset_token = req_reset.json()["dev_reset_token"]
    confirm = client.post(
        "/api/v1/auth/password-reset/confirm",
        json={"token": reset_token, "new_password": "NewPassword!99"},
    )
    assert confirm.status_code == 200

    # Login with new password succeeds & analytics CSV export works
    login = client.post(
        "/api/v1/auth/login",
        json={"email": "tariq.reset@example.com", "password": "NewPassword!99"},
    )
    assert login.status_code == 200
    token = login.json()["access_token"]
    csv_res = client.get("/api/v1/analytics/export.csv", headers=_auth_header(token))
    assert csv_res.status_code == 200
    assert "Active Job Openings" in csv_res.text
