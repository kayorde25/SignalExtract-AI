from __future__ import annotations

import argparse
import json
import math
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Any


def _norm(s: str) -> str:
    s = s or ""
    s = s.strip().lower()
    s = re.sub(r"\s+", " ", s)
    return s


def _token_set(s: str) -> set[str]:
    return {t for t in re.split(r"[^a-z0-9]+", _norm(s)) if t}


def _jaccard(a: str, b: str) -> float:
    ta, tb = _token_set(a), _token_set(b)
    if not ta and not tb:
        return 1.0
    if not ta or not tb:
        return 0.0
    return len(ta & tb) / len(ta | tb)


@dataclass(frozen=True)
class FlatSignal:
    document_id: str
    signal_type: str
    signal_text: str
    evidence_text: str
    needs_review: bool
    validation_status: str


def _flatten_gold(gold: list[dict[str, Any]]) -> list[FlatSignal]:
    out: list[FlatSignal] = []
    for doc in gold:
        doc_id = str(doc.get("document_id"))
        for s in doc.get("signals", []):
            out.append(
                FlatSignal(
                    document_id=doc_id,
                    signal_type=str(s.get("signal_type")),
                    signal_text=str(s.get("signal_text")),
                    evidence_text=str(s.get("evidence_text")),
                    needs_review=False,
                    validation_status="ok",
                )
            )
    return out


def _flatten_pred(pred: Any) -> list[FlatSignal]:
    """Accepts either:
    - API export JSON list (signals)
    - API response {document_id, signals}
    - list of per-document objects {document_id, signals}
    """

    out: list[FlatSignal] = []

    def ingest(document_id: str, signals: list[dict[str, Any]]):
        for s in signals:
            out.append(
                FlatSignal(
                    document_id=document_id,
                    signal_type=str(s.get("signal_type")),
                    signal_text=str(s.get("signal_text")),
                    evidence_text=str(s.get("evidence_text")),
                    needs_review=bool(s.get("needs_review", False)),
                    validation_status=str(s.get("validation_status", "ok")),
                )
            )

    if isinstance(pred, dict) and "document_id" in pred and "signals" in pred:
        ingest(str(pred["document_id"]), list(pred["signals"]))
        return out

    if isinstance(pred, list):
        # Either a raw list of signals, or list of documents with signals.
        if pred and isinstance(pred[0], dict) and "signals" in pred[0] and "document_id" in pred[0]:
            for doc in pred:
                ingest(str(doc["document_id"]), list(doc.get("signals", [])))
            return out

        # Raw signals list: require document_id in each.
        for s in pred:
            if not isinstance(s, dict):
                continue
            doc_id = str(s.get("document_id", ""))
            ingest(doc_id, [s])
        return out

    raise ValueError("Unsupported prediction JSON shape")


def _match_key(s: FlatSignal) -> tuple[str, str, str]:
    return (s.document_id, s.signal_type, _norm(s.signal_text))


def evaluate(gold: list[FlatSignal], pred: list[FlatSignal]) -> dict[str, Any]:
    gold_by_key = {_match_key(s): s for s in gold}
    pred_by_key = {_match_key(s): s for s in pred}

    gold_keys = set(gold_by_key.keys())
    pred_keys = set(pred_by_key.keys())

    tp_keys = gold_keys & pred_keys
    fp_keys = pred_keys - gold_keys
    fn_keys = gold_keys - pred_keys

    tp = len(tp_keys)
    fp = len(fp_keys)
    fn = len(fn_keys)

    precision = tp / (tp + fp) if (tp + fp) else 0.0
    recall = tp / (tp + fn) if (tp + fn) else 0.0
    f1 = (2 * precision * recall / (precision + recall)) if (precision + recall) else 0.0

    # Evidence-support accuracy on matched (TP) items.
    # Operationalization: evidence_text overlap with gold evidence_text.
    evidence_scores: list[float] = []
    for k in tp_keys:
        g = gold_by_key[k]
        p = pred_by_key[k]
        evidence_scores.append(_jaccard(g.evidence_text, p.evidence_text))

    evidence_support_accuracy = (
        sum(1 for s in evidence_scores if s >= 0.5) / len(evidence_scores) if evidence_scores else 0.0
    )

    # Hallucination rate: predicted items whose evidence validation failed.
    hallucinated = [s for s in pred if str(s.validation_status) != "ok" or not _norm(s.evidence_text)]
    hallucination_rate = len(hallucinated) / len(pred) if pred else 0.0

    # Review rate: predicted items flagged for review.
    review_rate = sum(1 for s in pred if s.needs_review) / len(pred) if pred else 0.0

    return {
        "counts": {"gold": len(gold), "pred": len(pred), "tp": tp, "fp": fp, "fn": fn},
        "metrics": {
            "precision": precision,
            "recall": recall,
            "f1": f1,
            "evidence_support_accuracy": evidence_support_accuracy,
            "hallucination_rate": hallucination_rate,
            "review_rate": review_rate,
        },
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Evaluate SignalExtract AI outputs against gold labels")
    parser.add_argument("--gold", required=True, help="Path to gold labels JSON")
    parser.add_argument("--pred", required=True, help="Path to predicted signals JSON")
    args = parser.parse_args()

    gold_path = Path(args.gold)
    pred_path = Path(args.pred)

    gold_raw = json.loads(gold_path.read_text(encoding="utf-8"))
    pred_raw = json.loads(pred_path.read_text(encoding="utf-8"))

    gold = _flatten_gold(list(gold_raw))
    pred = _flatten_pred(pred_raw)

    result = evaluate(gold, pred)
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
