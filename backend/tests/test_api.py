import io


def test_health(client):
    r = client.get("/api/v1/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


def test_ready(client):
    r = client.get("/api/v1/ready")
    assert r.status_code == 200
    assert "ready" in r.json()


def test_stats_empty(client):
    r = client.get("/api/v1/stats/")
    assert r.status_code == 200
    d = r.json()
    assert d["total_documents"] == 0
    assert d["total_signals"] == 0


def test_documents_empty(client):
    r = client.get("/api/v1/documents/")
    assert r.status_code == 200
    assert r.json() == {"items": [], "total": 0}


def _upload(client, content: bytes = b"Hello world. Date: 2024-01-15. Amount: $1,500.00. Email: hi@example.com"):
    r = client.post(
        "/api/v1/documents/upload",
        files={"file": ("sample.txt", io.BytesIO(content), "text/plain")},
    )
    assert r.status_code == 201
    return r.json()


def test_upload(client):
    doc = _upload(client)
    assert doc["status"] == "uploaded"
    assert doc["original_filename"] == "sample.txt"


def test_full_pipeline(client):
    content = b"Patient: Jane Doe\nDate: 2024-03-10\nInvoice: INV-2024-001\nAmount: $3,200.00\nEmail: jane@clinic.com\nPhone: 555-867-5309"
    doc = _upload(client, content)
    doc_id = doc["id"]

    # extract text
    r = client.post(f"/api/v1/documents/{doc_id}/extract-text")
    assert r.status_code == 200
    assert r.json()["status"] == "text_ready"

    # extract signals
    r = client.post(f"/api/v1/documents/{doc_id}/extract-signals")
    assert r.status_code == 200
    assert r.json()["status"] == "done"
    assert r.json()["signal_count"] > 0

    # list signals
    r = client.get(f"/api/v1/documents/{doc_id}/signals")
    assert r.status_code == 200
    signals = r.json()["items"]
    assert len(signals) > 0
    types = {s["signal_type"] for s in signals}
    assert types & {"date", "amount", "email", "identifier", "phone"}

    # review one signal
    sig_id = signals[0]["id"]
    r = client.patch(
        f"/api/v1/signals/{sig_id}/review",
        json={"review_status": "approved", "reviewed_by": "tester"},
    )
    assert r.status_code == 200
    assert r.json()["review_status"] == "approved"

    # export JSON
    r = client.get(f"/api/v1/documents/{doc_id}/export.json")
    assert r.status_code == 200
    data = r.json()
    assert "signals" in data

    # export CSV
    r = client.get(f"/api/v1/documents/{doc_id}/export.csv")
    assert r.status_code == 200
    assert "signal_type" in r.text


def test_history(client):
    _upload(client)
    r = client.get("/api/v1/history/")
    assert r.status_code == 200
    assert r.json()["total"] >= 1


def test_delete_document(client):
    doc = _upload(client)
    r = client.delete(f"/api/v1/documents/{doc['id']}")
    assert r.status_code == 204
    r = client.get(f"/api/v1/documents/{doc['id']}")
    assert r.status_code == 404
