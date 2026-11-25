from __future__ import annotations

import re
import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Cookie, Depends, HTTPException, Request, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import (
    ACCESS_COOKIE_NAME,
    REFRESH_COOKIE_NAME,
    AuthContext,
    get_current_auth,
    get_optional_auth,
)
from app.core.config import get_settings
from app.core.rate_limit import client_ip, rate_limiter
from app.core.security import (
    create_access_token,
    generate_opaque_token,
    hash_password,
    hash_token,
    verify_password,
)
from app.db.session import get_db
from app.models import (
    Candidate,
    CandidateDocument,
    Organization,
    OrganizationMember,
    RefreshToken,
    User,
    UserPreference,
    UserProfile,
)
from app.schemas.auth import (
    AuthenticatedUser,
    AuthResponse,
    DemoSessionRequest,
    LoginRequest,
    OrganizationSummary,
    PasswordResetConfirmRequest,
    PasswordResetRequest,
    RefreshRequest,
    RegisterRequest,
    UserPreferencesOut,
    UserPreferencesUpdate,
)
from app.schemas.common import MessageResponse
from app.services.demo_seed import create_isolated_demo_session

router = APIRouter(prefix="/auth", tags=["Authentication"])


def _slugify(value: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return slug[:60] or "organization"


def _set_auth_cookies(response: Response, access_token: str, refresh_token: str, access_ttl: int) -> None:
    settings = get_settings()
    response.set_cookie(
        key=ACCESS_COOKIE_NAME,
        value=access_token,
        httponly=True,
        samesite="lax",
        secure=settings.cookie_secure,
        max_age=access_ttl,
        path="/",
    )
    response.set_cookie(
        key=REFRESH_COOKIE_NAME,
        value=refresh_token,
        httponly=True,
        samesite="lax",
        secure=settings.cookie_secure,
        max_age=settings.refresh_token_expire_days * 86400,
        path="/",
    )


def _clear_auth_cookies(response: Response) -> None:
    response.delete_cookie(ACCESS_COOKIE_NAME, path="/")
    response.delete_cookie(REFRESH_COOKIE_NAME, path="/")


def _build_auth_user(
    db: Session,
    user: User,
    org: Organization | None,
    membership: OrganizationMember | None,
) -> AuthenticatedUser:
    pref = db.scalar(select(UserPreference).where(UserPreference.user_id == user.id))
    if pref is None:
        pref = UserPreference(user_id=user.id)
        db.add(pref)
        db.commit()
        db.refresh(pref)
    return AuthenticatedUser(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        account_type=user.account_type,
        role=membership.role if membership else "candidate",
        is_verified=user.is_verified,
        is_demo=bool(user.is_demo or (org and org.is_demo)),
        demo_session_id=user.demo_session_id,
        organization=OrganizationSummary.model_validate(org) if org else None,
        preferences=UserPreferencesOut.model_validate(pref),
    )


def _issue_session(
    db: Session,
    response: Response,
    user: User,
    org: Organization | None,
    membership: OrganizationMember | None,
) -> AuthResponse:
    settings = get_settings()
    role = membership.role if membership else "candidate"
    access_token, ttl = create_access_token(
        subject=str(user.id),
        account_type=user.account_type,
        organization_id=str(org.id) if org else None,
        role=role,
        is_demo=bool(user.is_demo),
        demo_session_id=user.demo_session_id,
    )
    raw_refresh = generate_opaque_token(36)
    db.add(
        RefreshToken(
            user_id=user.id,
            token_hash=hash_token(raw_refresh),
            expires_at=datetime.now(timezone.utc) + timedelta(days=settings.refresh_token_expire_days),
        )
    )
    db.commit()
    _set_auth_cookies(response, access_token, raw_refresh, ttl)
    return AuthResponse(
        access_token=access_token,
        refresh_token=raw_refresh,
        expires_in=ttl,
        user=_build_auth_user(db, user, org, membership),
    )


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def register(
    payload: RegisterRequest,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
) -> AuthResponse:
    settings = get_settings()
    rate_limiter.check(f"register:{client_ip(request)}", settings.rate_limit_auth_per_minute)

    normalized_email = payload.email.lower().strip()
    existing = db.scalar(select(User).where(User.email == normalized_email))
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email address already exists.",
        )

    user = User(
        email=normalized_email,
        password_hash=hash_password(payload.password),
        full_name=payload.full_name.strip(),
        account_type=payload.account_type,
        is_active=True,
        is_verified=not settings.email_configured,
    )
    db.add(user)
    db.flush()

    now = datetime.now(timezone.utc)
    db.add(
        UserProfile(
            user_id=user.id,
            consent_resume_processing=payload.consent_resume_processing,
            consent_recorded_at=now if payload.consent_resume_processing else None,
        )
    )
    db.add(UserPreference(user_id=user.id))

    org: Organization | None = None
    membership: OrganizationMember | None = None
    if payload.account_type == "recruiter":
        org_name = (payload.organization_name or f"{payload.full_name.strip()} Hiring Team").strip()
        base_slug = _slugify(org_name)
        slug = f"{base_slug}-{uuid.uuid4().hex[:6]}"
        org = Organization(name=org_name, slug=slug)
        db.add(org)
        db.flush()
        membership = OrganizationMember(
            organization_id=org.id,
            user_id=user.id,
            role="organization_owner",
            status="active",
            title="Organization Owner",
        )
        db.add(membership)
        db.flush()

    return _issue_session(db, response, user, org, membership)


@router.post("/login", response_model=AuthResponse)
def login(
    payload: LoginRequest,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
) -> AuthResponse:
    settings = get_settings()
    rate_limiter.check(f"login:{client_ip(request)}", settings.rate_limit_auth_per_minute)

    normalized_email = payload.email.lower().strip()
    user = db.scalar(select(User).where(User.email == normalized_email))
    if not user or not user.is_active or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email address or password.",
        )

    org: Organization | None = None
    membership: OrganizationMember | None = None
    if user.account_type != "candidate":
        membership = db.scalar(
            select(OrganizationMember).where(
                OrganizationMember.user_id == user.id,
                OrganizationMember.status == "active",
            )
        )
        if membership:
            org = db.get(Organization, membership.organization_id)

    return _issue_session(db, response, user, org, membership)


@router.post("/demo", response_model=AuthResponse)
def start_demo_session(
    payload: DemoSessionRequest,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
) -> AuthResponse:
    settings = get_settings()
    rate_limiter.check(f"demo:{client_ip(request)}", settings.rate_limit_demo_per_minute)

    user, org, membership = create_isolated_demo_session(db, payload.role)
    return _issue_session(db, response, user, org, membership)


@router.post("/refresh", response_model=AuthResponse)
def refresh_session(
    response: Response,
    payload: RefreshRequest | None = None,
    cookie_refresh: str | None = Cookie(default=None, alias=REFRESH_COOKIE_NAME),
    db: Session = Depends(get_db),
) -> AuthResponse:
    raw_token = (payload.refresh_token if payload and payload.refresh_token else None) or cookie_refresh
    if not raw_token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token is missing.")

    token_row = db.scalar(select(RefreshToken).where(RefreshToken.token_hash == hash_token(raw_token)))
    now = datetime.now(timezone.utc)
    if not token_row or token_row.revoked_at is not None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token is invalid.")
    expires_at = token_row.expires_at if token_row.expires_at.tzinfo else token_row.expires_at.replace(tzinfo=timezone.utc)
    if expires_at < now:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token has expired.")

    user = db.get(User, token_row.user_id)
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User account is inactive.")

    # Rotate refresh token on use.
    token_row.revoked_at = now
    org: Organization | None = None
    membership: OrganizationMember | None = None
    if user.account_type != "candidate":
        membership = db.scalar(
            select(OrganizationMember).where(
                OrganizationMember.user_id == user.id,
                OrganizationMember.status == "active",
            )
        )
        if membership:
            org = db.get(Organization, membership.organization_id)

    return _issue_session(db, response, user, org, membership)


@router.post("/logout", response_model=MessageResponse)
def logout(
    response: Response,
    cookie_refresh: str | None = Cookie(default=None, alias=REFRESH_COOKIE_NAME),
    db: Session = Depends(get_db),
) -> MessageResponse:
    if cookie_refresh:
        token_row = db.scalar(select(RefreshToken).where(RefreshToken.token_hash == hash_token(cookie_refresh)))
        if token_row and token_row.revoked_at is None:
            token_row.revoked_at = datetime.now(timezone.utc)
            db.commit()
    _clear_auth_cookies(response)
    return MessageResponse(message="Signed out successfully.")


@router.get("/session")
def get_session(
    auth: AuthContext | None = Depends(get_optional_auth),
    db: Session = Depends(get_db),
) -> dict[str, object]:
    if auth is None:
        return {"authenticated": False, "user": None}
    return {
        "authenticated": True,
        "user": _build_auth_user(db, auth.user, auth.organization, auth.membership).model_dump(mode="json"),
    }


@router.get("/me", response_model=AuthenticatedUser)
def get_me(
    auth: AuthContext = Depends(get_current_auth),
    db: Session = Depends(get_db),
) -> AuthenticatedUser:
    return _build_auth_user(db, auth.user, auth.organization, auth.membership)


@router.patch("/preferences", response_model=UserPreferencesOut)
def update_preferences(
    payload: UserPreferencesUpdate,
    auth: AuthContext = Depends(get_current_auth),
    db: Session = Depends(get_db),
) -> UserPreferencesOut:
    pref = db.scalar(select(UserPreference).where(UserPreference.user_id == auth.user.id))
    if pref is None:
        pref = UserPreference(user_id=auth.user.id)
        db.add(pref)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(pref, field, value)
    db.commit()
    db.refresh(pref)
    return UserPreferencesOut.model_validate(pref)


@router.post("/password-reset/request")
def request_password_reset(
    payload: PasswordResetRequest,
    request: Request,
    db: Session = Depends(get_db),
) -> dict[str, object]:
    settings = get_settings()
    rate_limiter.check(f"reset:{client_ip(request)}", settings.rate_limit_auth_per_minute)
    user = db.scalar(select(User).where(User.email == payload.email.lower().strip()))
    reset_token: str | None = None
    if user and user.is_active and not user.is_demo:
        reset_token = generate_opaque_token(24)
        user.reset_token_hash = hash_token(reset_token)
        user.reset_token_expires_at = datetime.now(timezone.utc) + timedelta(minutes=30)
        db.commit()

    response_payload: dict[str, object] = {
        "message": (
            "If an account matches that email, password reset instructions have been issued."
            if settings.email_configured
            else "Email delivery (SMTP) is not configured in this environment. Use the development reset flow locally or configure SMTP for email dispatch."
        ),
        "email_configured": settings.email_configured,
    }
    if settings.app_env != "production" and reset_token is not None:
        response_payload["dev_reset_token"] = reset_token
    return response_payload


@router.post("/password-reset/confirm", response_model=MessageResponse)
def confirm_password_reset(
    payload: PasswordResetConfirmRequest,
    db: Session = Depends(get_db),
) -> MessageResponse:
    token_hashed = hash_token(payload.token)
    user = db.scalar(select(User).where(User.reset_token_hash == token_hashed))
    now = datetime.now(timezone.utc)
    if not user or not user.reset_token_expires_at:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired reset token.")
    expires_at = (
        user.reset_token_expires_at
        if user.reset_token_expires_at.tzinfo
        else user.reset_token_expires_at.replace(tzinfo=timezone.utc)
    )
    if expires_at < now:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Reset token has expired.")

    user.password_hash = hash_password(payload.new_password)
    user.reset_token_hash = None
    user.reset_token_expires_at = None
    # Revoke active refresh tokens on password change.
    tokens = db.scalars(select(RefreshToken).where(RefreshToken.user_id == user.id, RefreshToken.revoked_at.is_(None))).all()
    for t in tokens:
        t.revoked_at = now
    db.commit()
    return MessageResponse(message="Password updated successfully. Please sign in with your new password.")


@router.delete("/account", response_model=MessageResponse)
def delete_candidate_account(
    response: Response,
    auth: AuthContext = Depends(get_current_auth),
    db: Session = Depends(get_db),
) -> MessageResponse:
    if auth.is_demo:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account deletion is disabled inside public demo sessions.",
        )
    if auth.user.account_type != "candidate":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Self-service data deletion applies to candidate accounts. Contact an organization owner for workspace removal.",
        )
    # Remove personal documents and anonymize/delete candidate user records.
    docs = db.scalars(select(CandidateDocument).where(CandidateDocument.user_id == auth.user.id)).all()
    for doc in docs:
        db.delete(doc)
    cands = db.scalars(select(Candidate).where(Candidate.user_id == auth.user.id)).all()
    for cand in cands:
        db.delete(cand)
    db.delete(auth.user)
    db.commit()
    _clear_auth_cookies(response)
    return MessageResponse(message="Your candidate account, documents, and application records have been permanently deleted.")
