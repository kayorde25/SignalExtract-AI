from __future__ import annotations
import email
import io
from pathlib import Path
from ..core.logging import get_logger

logger = get_logger(__name__)


def extract_text(content: bytes, filename: str) -> tuple[str, int | None]:
    """Return (text, page_count). page_count is None for non-paginated formats."""
    ext = Path(filename).suffix.lower()
    if ext == ".pdf":
        return _pdf(content)
    if ext == ".docx":
        return _docx(content), None
    if ext == ".eml":
        return _eml(content), None
    return content.decode("utf-8", errors="replace"), None


def _pdf(content: bytes) -> tuple[str, int]:
    try:
        import pdfplumber
        with pdfplumber.open(io.BytesIO(content)) as pdf:
            pages = [p.extract_text() or "" for p in pdf.pages]
            return "\n\n".join(pages), len(pdf.pages)
    except Exception as e:
        logger.warning(f"pdfplumber failed ({e}), falling back to pypdf")
    try:
        from pypdf import PdfReader
        r = PdfReader(io.BytesIO(content))
        pages = [p.extract_text() or "" for p in r.pages]
        return "\n\n".join(pages), len(r.pages)
    except Exception as e:
        raise ValueError(f"PDF text extraction failed: {e}") from e


def _docx(content: bytes) -> str:
    try:
        from docx import Document
        doc = Document(io.BytesIO(content))
        return "\n\n".join(p.text for p in doc.paragraphs if p.text.strip())
    except Exception as e:
        raise ValueError(f"DOCX extraction failed: {e}") from e


def _eml(content: bytes) -> str:
    msg = email.message_from_bytes(content)
    parts: list[str] = []
    for h in ("From", "To", "Subject", "Date"):
        v = msg.get(h, "")
        if v:
            parts.append(f"{h}: {v}")
    parts.append("")
    if msg.is_multipart():
        for part in msg.walk():
            if part.get_content_type() == "text/plain":
                payload = part.get_payload(decode=True)
                if payload:
                    parts.append(payload.decode("utf-8", errors="replace"))
    else:
        payload = msg.get_payload(decode=True)
        if payload:
            parts.append(payload.decode("utf-8", errors="replace"))
    return "\n".join(parts)
