from __future__ import annotations

import io


def test_health_and_ready(client):
    r = client.get("/api/v1/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"

    r = client.get("/api/v1/ready")
    assert r.status_code == 200
    assert r.json()["ready"] is True


def test_upload_extract_review_and_export_approved(client):
    # Upload
    content = b"PLAN:\nRecommendation: We recommend follow up within 24 hours.\n"
    files = {"file": ("note.txt", io.BytesIO(content), "text/plain")}

    r = client.post("/api/v1/documents/upload", files=files)
    assert r.status_code == 200
    document_id = r.json()["document"]["document_id"]

    # Extract signals
    r = client.post(f"/api/v1/documents/{document_id}/extract-signals")
    assert r.status_code == 200
    signals = r.json()["signals"]
    assert isinstance(signals, list)
    assert len(signals) >= 1

    s0 = signals[0]
    assert "signal_id" in s0
    assert "validation_status" in s0
    assert "review_status" in s0

    # Approve one
    signal_id = s0["signal_id"]
    r = client.patch(
        f"/api/v1/signals/{signal_id}/review",
        json={"review_status": "approved", "reviewed_by": "tester", "review_note": "ok"},
    )
    assert r.status_code == 200
    assert r.json()["review_status"] == "approved"

    # Export approved only should include the approved signal
    r = client.get(f"/api/v1/documents/{document_id}/export-approved.json")
    assert r.status_code == 200
    approved = r.json()
    assert isinstance(approved, list)
    assert any(s["signal_id"] == signal_id for s in approved)
