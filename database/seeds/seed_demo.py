"""CLI entry point for seeding the TalentOS synthetic public showcase dataset.

Run from repository root:
    pnpm db:seed
or from apps/api:
    .venv/bin/python -m app.db.seed
"""
from __future__ import annotations

import sys
from pathlib import Path

API_DIR = Path(__file__).resolve().parents[2] / "apps" / "api"
if str(API_DIR) not in sys.path:
    sys.path.insert(0, str(API_DIR))

from app.db.seed import main  # noqa: E402

if __name__ == "__main__":
    main()
