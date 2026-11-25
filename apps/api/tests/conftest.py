from __future__ import annotations

import os
from collections.abc import Generator
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session, sessionmaker

os.environ["APP_ENV"] = "test"
os.environ["JWT_SECRET_KEY"] = "test-only-jwt-secret-key-at-least-32-characters-long"
os.environ["SIGNED_URL_SECRET"] = "test-only-signed-url-secret-key-at-least-32-chars"

from app.core.config import get_settings
from app.core.rate_limit import rate_limiter
from app.db.base import Base
from app.db.session import build_engine, get_db
from app.main import create_app


@pytest.fixture()
def test_db(tmp_path: Path) -> Generator[Session, None, None]:
    os.environ["LOCAL_STORAGE_PATH"] = str(tmp_path / "storage")
    get_settings.cache_clear()

    test_db_url = os.environ.get("TEST_DATABASE_URL")
    if test_db_url:
        engine = build_engine(test_db_url)
        Base.metadata.drop_all(bind=engine)
        Base.metadata.create_all(bind=engine)
    else:
        db_file = tmp_path / "test_talentos.db"
        engine = build_engine(f"sqlite:///{db_file.as_posix()}")
        Base.metadata.create_all(bind=engine)

    TestingSessionLocal = sessionmaker(
        bind=engine, autoflush=False, autocommit=False, expire_on_commit=False
    )
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        if test_db_url:
            Base.metadata.drop_all(bind=engine)
        engine.dispose()


@pytest.fixture()
def client(test_db: Session) -> Generator[TestClient, None, None]:
    rate_limiter.reset()
    app = create_app()

    def _override_get_db() -> Generator[Session, None, None]:
        try:
            yield test_db
        finally:
            pass

    app.dependency_overrides[get_db] = _override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()
