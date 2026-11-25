from __future__ import annotations

from app.db.session import SessionLocal
from app.services.demo_seed import ensure_public_showcase_seeded


def main() -> None:
    db = SessionLocal()
    try:
        org = ensure_public_showcase_seeded(db)
        print(f"TalentOS showcase dataset ready: {org.name} ({org.slug})")
    finally:
        db.close()


if __name__ == "__main__":
    main()
