from src.chunking import chunk_document
from src.extraction import extract_candidate_signals


def run_pipeline(text: str, source_document: str):
    chunks = chunk_document(text, source_document)
    signals = extract_candidate_signals(chunks)
    return signals
