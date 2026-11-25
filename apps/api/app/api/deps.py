from __future__ import annotations

import uuid
from dataclasses import dataclass

import jwt
from fastapi import Cookie, Depends, Header, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import decode_access_token
from app.db.session import get_db
from app.models import Organization, OrganizationMember, User

ACCESS_COOKIE_NAME = "talentos_access_token"
REFRESH_COOKIE_NAME = "talentos_refresh_token"


@dataclass(frozen=True)
class AuthContext:
    user: User
    organization: Organization | None
    membership: OrganizationMember | None

    @property
    def role(self) -> str:
        if self.membership:
            return self.membership.role
        return "candidate"

    @property
    def is_demo(self) -> bool:
        return bool(self.user.is_demo or (self.organization and self.organization.is_demo))


def _extract_bearer_token(
    authorization: str | None = Header(default=None),
    cookie_token: str | None = Cookie(default=None, alias=ACCESS_COOKIE_NAME),
) -> str | None:
    if authorization and authorization.lower().startswith("bearer "):
        return authorization[7:].strip()
    if cookie_token:
        return cookie_token
    return None


def get_optional_auth(
    token: str | None = Depends(_extract_bearer_token),
    db: Session = Depends(get_db),
) -> AuthContext | None:
    if not token:
        return None
    try:
        payload = decode_access_token(token)
        user_id = uuid.UUID(str(payload["sub"]))
    except (jwt.PyJWTError, ValueError, KeyError):
        return None

    user = db.get(User, user_id)
    if not user or not user.is_active:
        return None

    org: Organization | None = None
    membership: OrganizationMember | None = None
    org_id_raw = payload.get("org_id")

    if org_id_raw:
        try:
            org_uuid = uuid.UUID(str(org_id_raw))
            membership = db.scalar(
                select(OrganizationMember).where(
                    OrganizationMember.user_id == user.id,
                    OrganizationMember.organization_id == org_uuid,
                    OrganizationMember.status == "active",
                )
            )
            if membership:
                org = db.get(Organization, org_uuid)
        except ValueError:
            membership = None
    elif user.account_type != "candidate":
        membership = db.scalar(
            select(OrganizationMember).where(
                OrganizationMember.user_id == user.id,
                OrganizationMember.status == "active",
            )
        )
        if membership:
            org = db.get(Organization, membership.organization_id)

    return AuthContext(user=user, organization=org, membership=membership)


def get_current_auth(
    auth: AuthContext | None = Depends(get_optional_auth),
) -> AuthContext:
    if auth is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required.",
        )
    return auth


def require_org_roles(*allowed_roles: str):
    def _dependency(auth: AuthContext = Depends(get_current_auth)) -> AuthContext:
        if auth.organization is None or auth.membership is None:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Organization workspace membership is required.",
            )
        if allowed_roles and auth.membership.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to perform this action.",
            )
        return auth

    return _dependency


def require_candidate_user(auth: AuthContext = Depends(get_current_auth)) -> AuthContext:
    if auth.user.account_type != "candidate":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Candidate portal access is restricted to candidate accounts.",
        )
    return auth
