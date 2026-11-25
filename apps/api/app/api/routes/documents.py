from __future__ import annotations

import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, Request, UploadFile, status
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import AuthContext, get_current_auth, require_org_roles
from app.core.config import get_settings
from app.core.rate_limit import client_ip, rate_limiter
from app.core.security import create_signed_document_url, verify_signed_document_params
from app.db.session import get_db
from app.models import (
    Application,
    Candidate,
    CandidateDocument,
    CandidateSkill,
    Job,
    ResumeAnalysis,
)
from app.schemas.candidates import (
    CandidateDocumentOut,
    ResumeAnalysisOut,
    ResumeAnalysisReviewRequest,
    ResumeAnalysisStructuredOutput,
)
from app.schemas.common import MessageResponse
from app.services.activity import create_notification, record_activity
from app.services.documents import (
    read_upload_bytes,
    resolve_stored_file,
    sanitize_filename,
    save_private_bytes,
    validate_and_extract_document,
)
from app.services.resume_ai import run_resume_analysis

router = APIRouter(tags=["Documents & Resume Intelligence"])


class AnalyzeResumeRequest(BaseModel):
    document_id: uuid.UUID
    candidate_id: uuid.UUID
    job_id: uuid.UUID | None = None
    application_id: uuid.UUID | None = None


def _can_access_document(auth: AuthContext, doc: CandidateDocument) -> bool:
    if auth.user.account_type == "candidate":
        return doc.user_id == auth.user.id
    if auth.organization is not None and doc.organization_id == auth.organization.id:
        return True
    return False


@router.post("/documents/upload", response_model=CandidateDocumentOut, status_code=status.HTTP_201_CREATED)
async def upload_document(
    request: Request,
    file: UploadFile = File(...),
    document_type: str = Form(default="resume"),
    consent_granted: bool = Form(default=False),
    candidate_id: uuid.UUID | None = Form(default=None),
    auth: AuthContext = Depends(get_current_auth),
    db: Session = Depends(get_db),
) -> CandidateDocumentOut:
    settings = get_settings()
    rate_limiter.check(f"upload:{client_ip(request)}", settings.rate_limit_upload_per_minute)

    if not consent_granted:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Explicit candidate processing consent is required before uploading a resume.",
        )
    if document_type not in {"resume", "cover_letter", "portfolio"}:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unsupported document_type.")

    org_id: uuid.UUID | None = None
    target_cand_id: uuid.UUID | None = None
    owner_user_id: uuid.UUID | None = None

    if auth.user.account_type == "candidate":
        owner_user_id = auth.user.id
        linked_cand = db.scalar(select(Candidate).where(Candidate.user_id == auth.user.id))
        if linked_cand:
            target_cand_id = linked_cand.id
            org_id = linked_cand.organization_id
    else:
        if auth.organization is None or auth.membership is None or auth.membership.role not in {"organization_owner", "recruiter"}:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Recruiter permission required to upload candidate documents.")
        if candidate_id is None:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="candidate_id is required when uploading from the recruiter workspace.")
        cand = db.scalar(
            select(Candidate).where(Candidate.id == candidate_id, Candidate.organization_id == auth.organization.id)
        )
        if not cand:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Candidate not found.")
        org_id = auth.organization.id
        target_cand_id = cand.id
        owner_user_id = cand.user_id

    safe_name = sanitize_filename(file.filename or "resume.pdf")
    raw_bytes = await read_upload_bytes(file)
    mime_type, sha256_hex, extracted_text = validate_and_extract_document(safe_name, file.content_type, raw_bytes)
    rel_path = save_private_bytes(raw_bytes, Path(safe_name).suffix, subdir="uploads")

    doc = CandidateDocument(
        organization_id=org_id,
        candidate_id=target_cand_id,
        user_id=owner_user_id,
        document_type=document_type,
        original_filename=safe_name,
        stored_path=rel_path,
        mime_type=mime_type,
        file_size_bytes=len(raw_bytes),
        sha256_hash=sha256_hex,
        extracted_text=extracted_text,
        consent_granted=consent_granted,
        is_demo=auth.is_demo,
    )
    db.add(doc)
    db.flush()

    if org_id:
        record_activity(
            db,
            organization_id=org_id,
            actor_id=auth.user.id,
            entity_type="document",
            entity_id=doc.id,
            action="document_uploaded",
            summary=f"Uploaded {safe_name} ({len(raw_bytes) // 1024 or 1} KB)",
        )
    db.commit()
    db.refresh(doc)
    signed_url, _ = create_signed_document_url(str(doc.id))
    return CandidateDocumentOut(
        id=doc.id,
        document_type=doc.document_type,
        original_filename=doc.original_filename,
        mime_type=doc.mime_type,
        file_size_bytes=doc.file_size_bytes,
        consent_granted=doc.consent_granted,
        is_demo=doc.is_demo,
        created_at=doc.created_at,
        signed_download_url=signed_url,
    )


@router.get("/documents/{document_id}/signed-url")
def get_signed_document_url(
    document_id: uuid.UUID,
    auth: AuthContext = Depends(get_current_auth),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    doc = db.get(CandidateDocument, document_id)
    if not doc or not _can_access_document(auth, doc):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found.")
    url, expires_at = create_signed_document_url(str(doc.id), expires_in_seconds=300)
    return {"download_url": url, "expires_at": expires_at}


@router.get("/documents/{document_id}/download")
def download_signed_document(
    document_id: uuid.UUID,
    expires: int = Query(...),
    sig: str = Query(...),
    auth: AuthContext = Depends(get_current_auth),
    db: Session = Depends(get_db),
) -> FileResponse:
    if not verify_signed_document_params(str(document_id), expires, sig):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Signed document link is invalid or expired.")
    doc = db.get(CandidateDocument, document_id)
    if not doc or not _can_access_document(auth, doc):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found.")
    file_path = resolve_stored_file(doc.stored_path)
    return FileResponse(
        path=file_path,
        media_type=doc.mime_type,
        filename=doc.original_filename,
        headers={
            "X-Content-Type-Options": "nosniff",
            "Content-Disposition": f'attachment; filename="{doc.original_filename}"',
        },
    )


@router.delete("/documents/{document_id}", response_model=MessageResponse)
def delete_document(
    document_id: uuid.UUID,
    auth: AuthContext = Depends(get_current_auth),
    db: Session = Depends(get_db),
) -> MessageResponse:
    doc = db.get(CandidateDocument, document_id)
    if not doc or not _can_access_document(auth, doc):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found.")
    if auth.user.account_type != "candidate" and auth.role not in {"organization_owner", "recruiter"}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions to remove documents.")

    filename = doc.original_filename
    stored = doc.stored_path
    db.delete(doc)
    db.commit()

    # Delete private upload file on disk unless it is a shared demo template.
    if stored.startswith("uploads/"):
        try:
            resolve_stored_file(stored).unlink(missing_ok=True)
        except HTTPException:
            pass

    return MessageResponse(message=f"Removed document '{filename}'.")


@router.post("/resume-analyses", response_model=ResumeAnalysisOut, status_code=status.HTTP_201_CREATED)
def analyze_resume(
    payload: AnalyzeResumeRequest,
    request: Request,
    auth: AuthContext = Depends(require_org_roles("organization_owner", "recruiter", "hiring_manager")),
    db: Session = Depends(get_db),
) -> ResumeAnalysisOut:
    assert auth.organization is not None
    settings = get_settings()
    rate_limiter.check(f"analyze:{client_ip(request)}", settings.rate_limit_upload_per_minute)

    cand = db.scalar(
        select(Candidate).where(
            Candidate.id == payload.candidate_id,
            Candidate.organization_id == auth.organization.id,
        )
    )
    if not cand:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Candidate not found.")

    doc = db.scalar(
        select(CandidateDocument).where(
            CandidateDocument.id == payload.document_id,
            CandidateDocument.organization_id == auth.organization.id,
        )
    )
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resume document not found.")
    if not doc.consent_granted or not cand.consent_resume_processing:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Candidate consent for document processing has not been granted.",
        )

    job: Job | None = None
    if payload.job_id:
        job = db.scalar(select(Job).where(Job.id == payload.job_id, Job.organization_id == auth.organization.id))
        if not job:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Target job not found.")

    application: Application | None = None
    if payload.application_id:
        application = db.scalar(
            select(Application).where(
                Application.id == payload.application_id,
                Application.organization_id == auth.organization.id,
            )
        )
        if application and job is None:
            job = db.get(Job, application.job_id)

    resume_text = doc.extracted_text or ""
    if not resume_text.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Document has no extracted text available for analysis.",
        )

    result = run_resume_analysis(
        resume_text=resume_text,
        job_title=job.title if job else None,
        required_qualifications=job.required_qualifications if job else [],
        preferred_qualifications=job.preferred_qualifications if job else [],
        required_skills=job.required_skills if job else [],
        is_demo=auth.is_demo,
    )

    analysis = ResumeAnalysis(
        organization_id=auth.organization.id,
        application_id=application.id if application else None,
        candidate_id=cand.id,
        job_id=job.id if job else None,
        document_id=doc.id,
        analysis_mode=result.analysis_mode,
        provider_name=result.provider_name,
        model_name=result.model_name,
        prompt_injection_flags=result.prompt_injection_flags,
        structured_output=result.structured_output.model_dump(),
        human_reviewed=False,
    )
    db.add(analysis)

    # Sync newly extracted technical skills without overwriting manually curated profile skills.
    existing_skills = {
        s.skill_name.lower()
        for s in db.scalars(select(CandidateSkill).where(CandidateSkill.candidate_id == cand.id)).all()
    }
    for skill in result.structured_output.extracted_technical_skills[:12]:
        if skill.lower() not in existing_skills:
            db.add(
                CandidateSkill(
                    organization_id=auth.organization.id,
                    candidate_id=cand.id,
                    skill_name=skill,
                    category="technical",
                    source="resume_extracted",
                )
            )
            existing_skills.add(skill.lower())

    create_notification(
        db,
        user_id=auth.user.id,
        organization_id=auth.organization.id,
        event_type="resume_analysis_completed",
        title=f"Resume analysis complete for {cand.full_name}",
        body=f"Mode: {result.analysis_mode.replace('_', ' ')} ({result.provider_name}). Ready for human review.",
        link_url=f"/workspace/candidates/{cand.id}",
    )
    record_activity(
        db,
        organization_id=auth.organization.id,
        actor_id=auth.user.id,
        entity_type="resume_analysis",
        entity_id=cand.id,
        action="analysis_executed",
        summary=f"Ran {result.analysis_mode} resume analysis for {cand.full_name}"
        + (f" against {job.title}" if job else ""),
    )
    db.commit()
    db.refresh(analysis)

    return ResumeAnalysisOut(
        id=analysis.id,
        candidate_id=analysis.candidate_id,
        application_id=analysis.application_id,
        job_id=analysis.job_id,
        job_title=job.title if job else None,
        document_id=analysis.document_id,
        analysis_mode=analysis.analysis_mode,
        provider_name=analysis.provider_name,
        model_name=analysis.model_name,
        prompt_injection_flags=analysis.prompt_injection_flags or [],
        structured_output=ResumeAnalysisStructuredOutput.model_validate(analysis.structured_output),
        human_reviewed=analysis.human_reviewed,
        reviewed_by_name=None,
        reviewed_at=analysis.reviewed_at,
        reviewer_corrections=analysis.reviewer_corrections,
        created_at=analysis.created_at,
    )


@router.patch("/resume-analyses/{analysis_id}/review", response_model=ResumeAnalysisOut)
def review_resume_analysis(
    analysis_id: uuid.UUID,
    payload: ResumeAnalysisReviewRequest,
    auth: AuthContext = Depends(require_org_roles("organization_owner", "recruiter", "hiring_manager")),
    db: Session = Depends(get_db),
) -> ResumeAnalysisOut:
    assert auth.organization is not None
    analysis = db.scalar(
        select(ResumeAnalysis).where(
            ResumeAnalysis.id == analysis_id,
            ResumeAnalysis.organization_id == auth.organization.id,
        )
    )
    if not analysis:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resume analysis record not found.")

    analysis.human_reviewed = payload.human_reviewed
    analysis.reviewed_by_id = auth.user.id
    analysis.reviewed_at = datetime.now(timezone.utc)
    corrections: dict[str, Any] = dict(analysis.reviewer_corrections or {})
    if payload.reviewer_notes is not None:
        corrections["reviewer_notes"] = payload.reviewer_notes.strip()
    if payload.corrected_skills is not None:
        corrections["corrected_skills"] = [s.strip() for s in payload.corrected_skills if s.strip()]
    if payload.corrected_summary is not None:
        corrections["corrected_summary"] = payload.corrected_summary.strip()
    analysis.reviewer_corrections = corrections

    record_activity(
        db,
        organization_id=auth.organization.id,
        actor_id=auth.user.id,
        entity_type="resume_analysis",
        entity_id=analysis.candidate_id,
        action="analysis_reviewed",
        summary=f"{auth.user.full_name} reviewed and verified resume analysis output",
    )
    db.commit()
    db.refresh(analysis)
    job = db.get(Job, analysis.job_id) if analysis.job_id else None

    return ResumeAnalysisOut(
        id=analysis.id,
        candidate_id=analysis.candidate_id,
        application_id=analysis.application_id,
        job_id=analysis.job_id,
        job_title=job.title if job else None,
        document_id=analysis.document_id,
        analysis_mode=analysis.analysis_mode,
        provider_name=analysis.provider_name,
        model_name=analysis.model_name,
        prompt_injection_flags=analysis.prompt_injection_flags or [],
        structured_output=ResumeAnalysisStructuredOutput.model_validate(analysis.structured_output),
        human_reviewed=analysis.human_reviewed,
        reviewed_by_name=auth.user.full_name,
        reviewed_at=analysis.reviewed_at,
        reviewer_corrections=analysis.reviewer_corrections,
        created_at=analysis.created_at,
    )
