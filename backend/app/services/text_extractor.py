from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Iterable


@dataclass(frozen=True)
class TextChunk:
    """A structure-aware chunk of text.

    Chunking preserves context for evidence linking: page/section/paragraph where possible.
    """

    chunk_id: str
    text: str
    source_page: int | None = None
    source_section: str | None = None
    paragraph_id: str | None = None


@dataclass(frozen=True)
class ExtractedText:
    text: str
    chunks: list[TextChunk]


def _split_paragraphs(text: str) -> list[str]:
    paragraphs = [p.strip() for p in text.replace("\r\n", "\n").split("\n\n") if p.strip()]
    return paragraphs


def _infer_heading(paragraph: str) -> bool:
    """Heuristic: short, title-like line indicates a section heading."""

    single_line = "\n" not in paragraph
    if not single_line:
        return False
    if len(paragraph) > 80:
        return False
    if paragraph.endswith(":"):
        return True
    # ALL CAPS headings are common in operational docs.
    letters = [c for c in paragraph if c.isalpha()]
    if letters and sum(1 for c in letters if c.isupper()) / len(letters) > 0.85:
        return True
    return False


def _chunk_plain_text(text: str) -> ExtractedText:
    paragraphs = _split_paragraphs(text)

    chunks: list[TextChunk] = []
    current_section: str | None = None

    for idx, para in enumerate(paragraphs, start=1):
        if _infer_heading(para):
            current_section = para.strip().rstrip(":")
            continue

        chunks.append(
            TextChunk(
                chunk_id=f"chunk_{idx}",
                text=para,
                source_section=current_section,
                paragraph_id=f"p_{idx}",
            )
        )

    return ExtractedText(text="\n\n".join(paragraphs), chunks=chunks)


def extract_text(file_path: str) -> ExtractedText:
    """Extract text from txt, pdf, docx, and eml.

    This function is deliberately deterministic: it only extracts *verbatim text*
    and does not generate new content.
    """

    path = Path(file_path)
    ext = path.suffix.lower()

    if ext == ".txt":
        text = path.read_text(encoding="utf-8", errors="replace")
        return _chunk_plain_text(text)

    if ext == ".eml":
        # Parse email container into a readable plain-text representation.
        from email import policy
        from email.parser import BytesParser

        msg = BytesParser(policy=policy.default).parsebytes(path.read_bytes())
        subject = msg.get("subject", "")

        body_parts: list[str] = []
        if msg.is_multipart():
            for part in msg.walk():
                ctype = part.get_content_type()
                if ctype == "text/plain":
                    body_parts.append(part.get_content())
        else:
            if msg.get_content_type() == "text/plain":
                body_parts.append(msg.get_content())

        body = "\n".join([p.strip() for p in body_parts if p and p.strip()])
        text = f"SUBJECT: {subject}\n\n{body}".strip()
        return _chunk_plain_text(text)

    if ext == ".docx":
        from docx import Document

        doc = Document(str(path))
        paragraphs = [p.text.strip() for p in doc.paragraphs if p.text and p.text.strip()]
        text = "\n\n".join(paragraphs)
        return _chunk_plain_text(text)

    if ext == ".pdf":
        import pdfplumber

        chunks: list[TextChunk] = []
        all_text_parts: list[str] = []

        current_section: str | None = None
        chunk_counter = 0

        with pdfplumber.open(str(path)) as pdf:
            for page_index, page in enumerate(pdf.pages, start=1):
                page_text = (page.extract_text() or "").strip()
                if not page_text:
                    continue

                all_text_parts.append(page_text)

                paragraphs = _split_paragraphs(page_text)
                for para_index, para in enumerate(paragraphs, start=1):
                    if _infer_heading(para):
                        current_section = para.strip().rstrip(":")
                        continue

                    chunk_counter += 1
                    chunks.append(
                        TextChunk(
                            chunk_id=f"chunk_{chunk_counter}",
                            text=para,
                            source_page=page_index,
                            source_section=current_section,
                            paragraph_id=f"p{page_index}_{para_index}",
                        )
                    )

        return ExtractedText(text="\n\n".join(all_text_parts).strip(), chunks=chunks)

    raise ValueError(f"Unsupported file type: {ext}")
