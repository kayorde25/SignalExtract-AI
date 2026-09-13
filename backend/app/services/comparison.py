import re
from difflib import SequenceMatcher
from sqlmodel import Session, select

from ..models.document import Document
from ..models.chunk import DocumentChunk
from ..models.signal import Signal
from ..schemas.comparison import (
    ChunkChange, CompareResponse, ComparisonSummary, DiffToken,
    DocumentRef, SignalChange,
)

ENTITY_TYPES = {"person_name", "organization", "location"}


def _word_diff(text_a: str, text_b: str) -> list[DiffToken]:
    tokens_a = re.findall(r"\S+|\s+", text_a)
    tokens_b = re.findall(r"\S+|\s+", text_b)
    matcher = SequenceMatcher(None, tokens_a, tokens_b, autojunk=False)
    result: list[DiffToken] = []
    for opcode, a0, a1, b0, b1 in matcher.get_opcodes():
        if opcode == "equal":
            for t in tokens_a[a0:a1]:
                result.append(DiffToken(text=t, type="equal"))
        elif opcode == "replace":
            for t in tokens_a[a0:a1]:
                result.append(DiffToken(text=t, type="removed"))
            for t in tokens_b[b0:b1]:
                result.append(DiffToken(text=t, type="added"))
        elif opcode == "delete":
            for t in tokens_a[a0:a1]:
                result.append(DiffToken(text=t, type="removed"))
        elif opcode == "insert":
            for t in tokens_b[b0:b1]:
                result.append(DiffToken(text=t, type="added"))
    return result


def compare_chunks(
    chunks_a: list[DocumentChunk],
    chunks_b: list[DocumentChunk],
) -> list[ChunkChange]:
    texts_a = [c.text for c in chunks_a]
    texts_b = [c.text for c in chunks_b]
    matcher = SequenceMatcher(None, texts_a, texts_b, autojunk=False)
    changes: list[ChunkChange] = []

    for opcode, a0, a1, b0, b1 in matcher.get_opcodes():
        if opcode == "equal":
            for i in range(a1 - a0):
                changes.append(ChunkChange(
                    type="unchanged",
                    chunk_index_a=a0 + i,
                    chunk_index_b=b0 + i,
                    text_a=texts_a[a0 + i],
                    text_b=texts_b[b0 + i],
                ))
        elif opcode == "replace":
            for i in range(max(a1 - a0, b1 - b0)):
                ia, ib = a0 + i, b0 + i
                if ia < a1 and ib < b1:
                    changes.append(ChunkChange(
                        type="modified",
                        chunk_index_a=ia,
                        chunk_index_b=ib,
                        text_a=texts_a[ia],
                        text_b=texts_b[ib],
                        diff_tokens=_word_diff(texts_a[ia], texts_b[ib]),
                    ))
                elif ia < a1:
                    changes.append(ChunkChange(
                        type="removed",
                        chunk_index_a=ia,
                        text_a=texts_a[ia],
                    ))
                else:
                    changes.append(ChunkChange(
                        type="added",
                        chunk_index_b=ib,
                        text_b=texts_b[ib],
                    ))
        elif opcode == "delete":
            for i in range(a1 - a0):
                changes.append(ChunkChange(
                    type="removed",
                    chunk_index_a=a0 + i,
                    text_a=texts_a[a0 + i],
                ))
        elif opcode == "insert":
            for i in range(b1 - b0):
                changes.append(ChunkChange(
                    type="added",
                    chunk_index_b=b0 + i,
                    text_b=texts_b[b0 + i],
                ))

    return changes


def compare_signals(
    signals_a: list[Signal],
    signals_b: list[Signal],
    entity_types: bool = False,
) -> list[SignalChange]:
    if entity_types:
        signals_a = [s for s in signals_a if s.signal_type in ENTITY_TYPES]
        signals_b = [s for s in signals_b if s.signal_type in ENTITY_TYPES]
    else:
        signals_a = [s for s in signals_a if s.signal_type not in ENTITY_TYPES]
        signals_b = [s for s in signals_b if s.signal_type not in ENTITY_TYPES]

    types_a: dict[str, list[Signal]] = {}
    types_b: dict[str, list[Signal]] = {}
    for s in signals_a:
        types_a.setdefault(s.signal_type, []).append(s)
    for s in signals_b:
        types_b.setdefault(s.signal_type, []).append(s)

    all_types = sorted(set(types_a) | set(types_b))
    changes: list[SignalChange] = []

    for sig_type in all_types:
        sigs_a = sorted(types_a.get(sig_type, []), key=lambda s: s.value)
        sigs_b = sorted(types_b.get(sig_type, []), key=lambda s: s.value)
        values_a = [s.value for s in sigs_a]
        values_b = [s.value for s in sigs_b]

        matcher = SequenceMatcher(None, values_a, values_b, autojunk=False)

        for opcode, a0, a1, b0, b1 in matcher.get_opcodes():
            if opcode == "equal":
                continue
            elif opcode == "replace":
                for i in range(max(a1 - a0, b1 - b0)):
                    ia, ib = a0 + i, b0 + i
                    if ia < a1 and ib < b1:
                        sa, sb = sigs_a[ia], sigs_b[ib]
                        changes.append(SignalChange(
                            signal_type=sig_type,
                            change_type="changed",
                            value_a=sa.value,
                            value_b=sb.value,
                            evidence=sa.evidence,
                            evidence_b=sb.evidence,
                            page_number=sa.page_number,
                        ))
                    elif ia < a1:
                        sa = sigs_a[ia]
                        changes.append(SignalChange(
                            signal_type=sig_type,
                            change_type="removed",
                            value=sa.value,
                            document="a",
                            evidence=sa.evidence,
                            page_number=sa.page_number,
                        ))
                    else:
                        sb = sigs_b[ib]
                        changes.append(SignalChange(
                            signal_type=sig_type,
                            change_type="added",
                            value=sb.value,
                            document="b",
                            evidence=sb.evidence,
                            page_number=sb.page_number,
                        ))
            elif opcode == "delete":
                for i in range(a1 - a0):
                    sa = sigs_a[a0 + i]
                    changes.append(SignalChange(
                        signal_type=sig_type,
                        change_type="removed",
                        value=sa.value,
                        document="a",
                        evidence=sa.evidence,
                        page_number=sa.page_number,
                    ))
            elif opcode == "insert":
                for i in range(b1 - b0):
                    sb = sigs_b[b0 + i]
                    changes.append(SignalChange(
                        signal_type=sig_type,
                        change_type="added",
                        value=sb.value,
                        document="b",
                        evidence=sb.evidence,
                        page_number=sb.page_number,
                    ))

    return changes


def compare_entities(
    signals_a: list[Signal],
    signals_b: list[Signal],
) -> list[SignalChange]:
    return compare_signals(signals_a, signals_b, entity_types=True)


def compare_documents(
    doc_a_id: str,
    doc_b_id: str,
    session: Session,
) -> CompareResponse:
    if doc_a_id == doc_b_id:
        raise ValueError("Select two different documents to compare")

    doc_a = session.get(Document, doc_a_id)
    doc_b = session.get(Document, doc_b_id)

    if not doc_a:
        raise ValueError(f"Document not found: {doc_a_id}")
    if not doc_b:
        raise ValueError(f"Document not found: {doc_b_id}")

    chunks_a = session.exec(
        select(DocumentChunk)
        .where(DocumentChunk.document_id == doc_a_id)
        .order_by(DocumentChunk.chunk_index)
    ).all()
    chunks_b = session.exec(
        select(DocumentChunk)
        .where(DocumentChunk.document_id == doc_b_id)
        .order_by(DocumentChunk.chunk_index)
    ).all()

    if not chunks_a:
        raise ValueError(f"'{doc_a.original_filename}' has no text chunks — extract text first")
    if not chunks_b:
        raise ValueError(f"'{doc_b.original_filename}' has no text chunks — extract text first")

    signals_a = session.exec(
        select(Signal).where(Signal.document_id == doc_a_id)
    ).all()
    signals_b = session.exec(
        select(Signal).where(Signal.document_id == doc_b_id)
    ).all()

    all_chunk_changes = compare_chunks(list(chunks_a), list(chunks_b))
    signal_changes = compare_signals(list(signals_a), list(signals_b), entity_types=False)
    entity_changes = compare_entities(list(signals_a), list(signals_b))

    visible_chunk_changes = [c for c in all_chunk_changes if c.type != "unchanged"]

    summary = ComparisonSummary(
        added_chunks=sum(1 for c in all_chunk_changes if c.type == "added"),
        removed_chunks=sum(1 for c in all_chunk_changes if c.type == "removed"),
        modified_chunks=sum(1 for c in all_chunk_changes if c.type == "modified"),
        unchanged_chunks=sum(1 for c in all_chunk_changes if c.type == "unchanged"),
        added_signals=sum(1 for s in signal_changes if s.change_type == "added"),
        removed_signals=sum(1 for s in signal_changes if s.change_type == "removed"),
        changed_signals=sum(1 for s in signal_changes if s.change_type == "changed"),
        added_entities=sum(1 for e in entity_changes if e.change_type == "added"),
        removed_entities=sum(1 for e in entity_changes if e.change_type == "removed"),
        changed_entities=sum(1 for e in entity_changes if e.change_type == "changed"),
    )

    return CompareResponse(
        document_a=DocumentRef(
            id=doc_a.id,
            filename=doc_a.original_filename,
            page_count=doc_a.page_count,
            signal_count=doc_a.signal_count,
        ),
        document_b=DocumentRef(
            id=doc_b.id,
            filename=doc_b.original_filename,
            page_count=doc_b.page_count,
            signal_count=doc_b.signal_count,
        ),
        summary=summary,
        chunk_changes=visible_chunk_changes,
        signal_changes=signal_changes,
        entity_changes=entity_changes,
    )
