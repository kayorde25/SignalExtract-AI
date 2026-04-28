from typing import List, Dict


def chunk_document(text: str, source_document: str) -> List[Dict]:
    paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]

    chunks = []

    for i, paragraph in enumerate(paragraphs, start=1):
        chunks.append({
            "source_document": source_document,
            "paragraph_id": f"p_{i}",
            "text": paragraph
        })

    return chunks
