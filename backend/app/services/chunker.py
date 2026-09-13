from __future__ import annotations
from dataclasses import dataclass

CHUNK_SIZE = 750
CHUNK_OVERLAP = 100


@dataclass
class ChunkSpan:
    text: str
    char_offset_start: int
    char_offset_end: int


def chunk_text(
    text: str,
    chunk_size: int = CHUNK_SIZE,
    overlap: int = CHUNK_OVERLAP,
) -> list[ChunkSpan]:
    """Split text into overlapping character spans, respecting paragraph breaks."""
    if not text.strip():
        return []

    # Split into paragraphs on double newlines
    raw_paragraphs: list[tuple[str, int]] = []  # (text, start_offset)
    pos = 0
    for para in text.split("\n\n"):
        raw_paragraphs.append((para, pos))
        pos += len(para) + 2  # +2 for the "\n\n" separator

    spans: list[ChunkSpan] = []
    current_parts: list[str] = []
    current_start: int = raw_paragraphs[0][1] if raw_paragraphs else 0
    current_len: int = 0

    def emit(parts: list[str], start: int) -> None:
        joined = "\n\n".join(parts).strip()
        if joined:
            spans.append(ChunkSpan(
                text=joined,
                char_offset_start=start,
                char_offset_end=start + len(joined),
            ))

    for para_text, para_start in raw_paragraphs:
        para_stripped = para_text.strip()
        if not para_stripped:
            continue

        if current_len + len(para_stripped) > chunk_size and current_parts:
            emit(current_parts, current_start)

            # Build overlap: take trailing text up to `overlap` chars from the emitted chunk
            overlap_text = "\n\n".join(current_parts)
            overlap_tail = overlap_text[-overlap:] if len(overlap_text) > overlap else overlap_text
            # Find the offset of the overlap tail in the original text
            tail_pos = text.find(overlap_tail, current_start)
            current_start = tail_pos if tail_pos != -1 else para_start
            current_parts = [overlap_tail] if overlap_tail.strip() else []
            current_len = len(overlap_tail)

        if not current_parts:
            current_start = para_start

        current_parts.append(para_stripped)
        current_len += len(para_stripped)

    if current_parts:
        emit(current_parts, current_start)

    # Edge case: entire text is shorter than chunk_size
    if not spans and text.strip():
        spans.append(ChunkSpan(
            text=text.strip(),
            char_offset_start=0,
            char_offset_end=len(text.strip()),
        ))

    return spans
