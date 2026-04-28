from typing import List, Dict


def extract_candidate_signals(chunks: List[Dict]) -> List[Dict]:
    signals = []

    keywords = {
        "finding": ["evidence of", "shows", "indicates", "suggests"],
        "recommendation": ["consider", "recommend", "would benefit", "it would be useful"],
        "action": ["should", "must", "follow-up", "review"],
        "risk": ["risk", "concern", "deterioration"]
    }

    for chunk in chunks:
        text_lower = chunk["text"].lower()

        for signal_type, terms in keywords.items():
            if any(term in text_lower for term in terms):
                signals.append({
                    "signal_type": signal_type,
                    "signal_text": chunk["text"],
                    "evidence_text": chunk["text"],
                    "source_document": chunk["source_document"],
                    "paragraph_id": chunk["paragraph_id"],
                    "explicitness": "explicit",
                    "confidence": 0.65
                })

    return signals
