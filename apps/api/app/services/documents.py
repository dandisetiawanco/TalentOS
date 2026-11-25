from __future__ import annotations

import hashlib
import io
import re
import uuid
import zipfile
from pathlib import Path

import fitz
from docx import Document as DocxDocument
from fastapi import HTTPException, UploadFile, status

from app.core.config import get_settings

ALLOWED_EXTENSIONS = {".pdf", ".docx"}
ALLOWED_MIME_TYPES = {
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/octet-stream",
}
SAFE_FILENAME_RE = re.compile(r"[^A-Za-z0-9._-]+")


def sanitize_filename(original: str) -> str:
    base = Path(original).name.strip() or "resume.pdf"
    cleaned = SAFE_FILENAME_RE.sub("_", base)
    return cleaned[:180]


def validate_and_extract_document(filename: str, content_type: str | None, data: bytes) -> tuple[str, str, str]:
    """Validate extension, size, magic bytes, and document structure, then extract plain text.

    Returns (normalized_mime, sha256_hex, extracted_text).
    """
    settings = get_settings()
    if not data:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Uploaded file is empty.")
    if len(data) > settings.max_resume_size_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File exceeds maximum allowed size of {settings.max_resume_size_mb} MB.",
        )

    ext = Path(filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Only PDF (.pdf) and Microsoft Word (.docx) resumes are supported.",
        )

    if content_type and content_type.lower() not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Unsupported document MIME type.",
        )

    sha256_hex = hashlib.sha256(data).hexdigest()

    if ext == ".pdf":
        if not data[:5] == b"%PDF-":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="File header does not match a valid PDF document.",
            )
        text = extract_pdf_text(data)
        return "application/pdf", sha256_hex, text

    if not data[:4] == b"PK\x03\x04":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File header does not match a valid DOCX archive.",
        )
    text = extract_docx_text(data)
    return (
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        sha256_hex,
        text,
    )


def extract_pdf_text(data: bytes) -> str:
    try:
        doc = fitz.open(stream=data, filetype="pdf")
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unable to parse PDF document structure.",
        ) from exc

    pages: list[str] = []
    try:
        for page_index in range(min(len(doc), 25)):
            pages.append(doc[page_index].get_text("text"))
    finally:
        doc.close()

    normalized = normalize_extracted_text("\n".join(pages))
    if not normalized:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No readable text found in PDF. Image-only scans require OCR before upload.",
        )
    return normalized


def extract_docx_text(data: bytes) -> str:
    try:
        with zipfile.ZipFile(io.BytesIO(data)) as archive:
            names = set(archive.namelist())
            if "word/document.xml" not in names:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid DOCX file: missing word/document.xml.",
                )
            # Guard against zip bombs before parsing.
            total_uncompressed = sum(info.file_size for info in archive.infolist())
            if total_uncompressed > 25 * 1024 * 1024:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="DOCX archive uncompressed content exceeds safety limit.",
                )
        document = DocxDocument(io.BytesIO(data))
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unable to parse DOCX document structure.",
        ) from exc

    blocks: list[str] = []
    for paragraph in document.paragraphs:
        if paragraph.text.strip():
            blocks.append(paragraph.text.strip())
    for table in document.tables:
        for row in table.rows:
            row_text = " | ".join(cell.text.strip() for cell in row.cells if cell.text.strip())
            if row_text:
                blocks.append(row_text)

    normalized = normalize_extracted_text("\n".join(blocks))
    if not normalized:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No readable text found in DOCX document.",
        )
    return normalized


def normalize_extracted_text(raw: str) -> str:
    cleaned = raw.replace("\x00", "").replace("\r\n", "\n").replace("\r", "\n")
    lines = [re.sub(r"[ \t]+", " ", line).strip() for line in cleaned.split("\n")]
    collapsed: list[str] = []
    blank_streak = 0
    for line in lines:
        if not line:
            blank_streak += 1
            if blank_streak <= 1:
                collapsed.append("")
        else:
            blank_streak = 0
            collapsed.append(line)
    return "\n".join(collapsed).strip()[:60000]


def save_private_bytes(data: bytes, extension: str, subdir: str = "uploads") -> str:
    settings = get_settings()
    safe_sub = SAFE_FILENAME_RE.sub("", subdir) or "uploads"
    target_dir = (settings.storage_root / safe_sub).resolve()
    # Confirm target stays strictly inside storage_root to prevent traversal.
    if settings.storage_root.resolve() not in target_dir.parents and target_dir != settings.storage_root.resolve():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid storage path.")
    target_dir.mkdir(parents=True, exist_ok=True)

    ext = extension.lower() if extension.lower() in ALLOWED_EXTENSIONS else ".pdf"
    filename = f"{uuid.uuid4().hex}{ext}"
    full_path = target_dir / filename
    full_path.write_bytes(data)
    return f"{safe_sub}/{filename}"


def resolve_stored_file(relative_path: str) -> Path:
    settings = get_settings()
    root = settings.storage_root.resolve()
    candidate = (root / relative_path).resolve()
    if root not in candidate.parents:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid document location.")
    if not candidate.is_file():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document file not found.")
    return candidate


async def read_upload_bytes(upload: UploadFile) -> bytes:
    settings = get_settings()
    chunks: list[bytes] = []
    total = 0
    while True:
        chunk = await upload.read(65536)
        if not chunk:
            break
        total += len(chunk)
        if total > settings.max_resume_size_bytes:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"File exceeds maximum allowed size of {settings.max_resume_size_mb} MB.",
            )
        chunks.append(chunk)
    return b"".join(chunks)


def generate_synthetic_pdf_bytes(title: str, lines: list[str]) -> bytes:
    """Create a real, valid, readable PDF resume using PyMuPDF for synthetic demo data."""
    doc = fitz.open()
    page = doc.new_page(width=612, height=792)
    y = 54
    page.insert_text((50, y), title, fontsize=15, fontname="helv")
    y += 24
    for raw_line in lines:
        if y > 740:
            page = doc.new_page(width=612, height=792)
            y = 54
        text = raw_line[:95]
        fontsize = 11.5 if raw_line.isupper() and len(raw_line) < 40 else 9.8
        page.insert_text((50, y), text, fontsize=fontsize, fontname="helv")
        y += 15 if fontsize < 11 else 19
    pdf_bytes = doc.tobytes()
    doc.close()
    return pdf_bytes
