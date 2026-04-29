from __future__ import annotations

import json
import os
from datetime import datetime
from typing import Any

import pandas as pd
import requests
import streamlit as st
from dotenv import load_dotenv


load_dotenv()

BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:8000/api/v1")
DEFAULT_REVIEWER = os.getenv("REVIEWER", "")

st.set_page_config(page_title="SignalExtract AI", layout="wide")

st.title("SignalExtract AI")
st.caption(
    "Enterprise-ready document intelligence: evidence-linked signal extraction with confidence scoring and human review."
)


def _headers() -> dict[str, str]:
    key = st.session_state.get("api_key")
    return {"X-API-Key": key} if key else {}


def api_get(path: str) -> Any:
    r = requests.get(f"{BACKEND_URL}{path}", timeout=60, headers=_headers())
    r.raise_for_status()
    return r.json()


def api_post(path: str, **kwargs) -> Any:
    headers = {**_headers(), **(kwargs.pop("headers", {}) or {})}
    r = requests.post(f"{BACKEND_URL}{path}", timeout=120, headers=headers, **kwargs)
    r.raise_for_status()
    return r.json()


def api_patch(path: str, **kwargs) -> Any:
    headers = {**_headers(), **(kwargs.pop("headers", {}) or {})}
    r = requests.patch(f"{BACKEND_URL}{path}", timeout=120, headers=headers, **kwargs)
    r.raise_for_status()
    return r.json()


def _sidebar() -> str:
    st.sidebar.subheader("Console")

    st.sidebar.text_input("Backend URL", value=BACKEND_URL, key="backend_url", disabled=True)
    st.sidebar.text_input("API key (optional)", value=st.session_state.get("api_key", ""), key="api_key", type="password")

    # Health + readiness indicator
    status_col1, status_col2 = st.sidebar.columns(2)
    try:
        health = api_get("/health")
        status_col1.success("Health")
        status_col2.success("API")
        _ = health
    except Exception:
        status_col1.error("Health")
        status_col2.error("API")

    try:
        ready = api_get("/ready")
        st.sidebar.success("Ready")
        with st.sidebar.expander("System", expanded=False):
            st.json(ready)
    except Exception:
        st.sidebar.warning("Not ready")

    st.sidebar.divider()
    return st.sidebar.radio(
        "Navigate",
        [
            "Dashboard",
            "Upload",
            "Extract & Review",
            "History",
            "Exports",
        ],
    )


def dashboard_view() -> None:
    st.subheader("Dashboard")

    try:
        meta = api_get("/metadata")
        hist = api_get("/history")
    except Exception:
        st.error("Backend not reachable. Start the backend first.")
        st.code("cd backend && uvicorn app.main:app --reload --port 8000", language="bash")
        return

    docs = hist.get("documents", [])
    runs = hist.get("extraction_runs", [])

    c1, c2, c3, c4 = st.columns(4)
    c1.metric("Documents", len(docs))
    c2.metric("Runs", len(runs))
    c3.metric("Mode", meta.get("extraction_mode"))
    c4.metric("Version", meta.get("app_version"))

    st.markdown("Recent documents")
    st.dataframe(pd.DataFrame(docs), use_container_width=True, hide_index=True)


def upload_view() -> None:
    st.subheader("Upload document")

    try:
        meta = api_get("/metadata")
        allowed = meta.get("allowed_extensions", [".txt", ".pdf", ".docx", ".eml"])
    except Exception:
        allowed = [".txt", ".pdf", ".docx", ".eml"]

    st.write(f"Allowed: {', '.join(allowed)}")

    file = st.file_uploader("Choose a file", type=["txt", "pdf", "docx", "eml"])

    if not file:
        return

    if st.button("Upload", type="primary"):
        try:
            resp = api_post("/documents/upload", files={"file": (file.name, file.getvalue(), file.type)})
            doc = resp.get("document", {})
            st.success(f"Uploaded: {doc.get('filename')} (id={doc.get('document_id')})")
            with st.expander("Upload response", expanded=False):
                st.json(resp)
        except requests.HTTPError as e:
            st.error(f"Upload failed: {e.response.text}")


def _select_document() -> dict | None:
    hist = api_get("/history")
    docs = hist.get("documents", [])
    if not docs:
        st.info("No documents yet. Upload one first.")
        return None

    options = {f"{d['filename']} | {d['document_id']}": d for d in docs}
    selected = st.selectbox("Select document", list(options.keys()))
    return options[selected]


def _load_signals(document_id: str) -> list[dict[str, Any]]:
    resp = api_get(f"/documents/{document_id}/signals")
    return list(resp.get("signals", []))


def _load_chunks(document_id: str) -> list[dict[str, Any]]:
    # Uses extract-text endpoint to retrieve chunk structure for evidence preview.
    # Cache per document to keep the UI responsive.
    cache_key = f"chunks::{document_id}"
    if cache_key in st.session_state:
        return st.session_state[cache_key]

    resp = api_post(f"/documents/{document_id}/extract-text")
    chunks = list(resp.get("chunks", []))
    st.session_state[cache_key] = chunks
    return chunks


def _evidence_preview(chunks: list[dict[str, Any]], paragraph_id: str | None) -> str | None:
    if not paragraph_id:
        return None
    for c in chunks:
        if c.get("paragraph_id") == paragraph_id:
            return str(c.get("text") or "")
    return None


def extract_review_view() -> None:
    st.subheader("Extract & Review")

    doc = _select_document()
    if not doc:
        return

    document_id = doc["document_id"]

    col_run, col_refresh = st.columns([1, 1])
    with col_run:
        run = st.button("Run extraction", type="primary")
    with col_refresh:
        refresh = st.button("Refresh signals")

    if run:
        try:
            resp = api_post(f"/documents/{document_id}/extract-signals")
            st.success(f"Extracted {len(resp.get('signals', []))} signals")
        except requests.HTTPError as e:
            st.error(f"Extraction failed: {e.response.text}")

    if refresh or run or "signals" not in st.session_state or st.session_state.get("signals_doc") != document_id:
        try:
            st.session_state["signals"] = _load_signals(document_id)
            st.session_state["signals_doc"] = document_id
        except requests.HTTPError as e:
            st.error(f"Failed to load signals: {e.response.text}")
            return

    signals = list(st.session_state.get("signals", []))

    if not signals:
        st.info("No signals yet. Run extraction first.")
        return

    df = pd.DataFrame(signals)

    # Filters
    c1, c2, c3, c4 = st.columns(4)
    conf_min, conf_max = c1.slider("Confidence", 0.0, 1.0, (0.0, 1.0), 0.05)
    needs_review_only = c2.checkbox("Needs review only", value=False)
    statuses = sorted(df.get("review_status", pd.Series(["pending"])).dropna().unique().tolist())
    status_filter = c3.multiselect("Review status", options=statuses, default=statuses)
    type_filter = c4.multiselect(
        "Signal type",
        options=sorted(df["signal_type"].dropna().unique().tolist()),
        default=sorted(df["signal_type"].dropna().unique().tolist()),
    )

    filtered = df[(df["confidence"].between(conf_min, conf_max)) & (df["signal_type"].isin(type_filter))]
    if needs_review_only:
        filtered = filtered[filtered["needs_review"] == True]  # noqa: E712
    if status_filter:
        filtered = filtered[filtered["review_status"].isin(status_filter)]

    st.markdown("### Signals")
    st.dataframe(
        filtered.sort_values(by=["needs_review", "confidence"], ascending=[False, True]),
        use_container_width=True,
        hide_index=True,
    )

    # Reviewer panel
    st.markdown("### Review")
    reviewer = st.text_input("Reviewer", value=st.session_state.get("reviewer", DEFAULT_REVIEWER), key="reviewer")

    options = {f"{row['signal_type']} | {row['confidence']:.2f} | {row['signal_id']}": row for _, row in filtered.iterrows()}
    selected_key = st.selectbox("Select signal", list(options.keys()))
    selected = options[selected_key]

    left, right = st.columns([2, 1])
    with left:
        st.write("Signal")
        st.code(selected.get("signal_text", ""))
        st.write("Evidence")
        st.code(selected.get("evidence_text", ""))

        try:
            chunks = _load_chunks(document_id)
            chunk_text = _evidence_preview(chunks, selected.get("paragraph_id"))
            if chunk_text:
                with st.expander("Source chunk", expanded=False):
                    st.write(chunk_text)
        except Exception:
            pass

    with right:
        st.write("Metadata")
        st.json(
            {
                "signal_id": selected.get("signal_id"),
                "review_status": selected.get("review_status"),
                "validation_status": selected.get("validation_status"),
                "needs_review": selected.get("needs_review"),
                "confidence": selected.get("confidence"),
                "source_page": selected.get("source_page"),
                "source_section": selected.get("source_section"),
                "paragraph_id": selected.get("paragraph_id"),
            }
        )

        new_status = st.selectbox(
            "Set review status",
            ["approved", "rejected", "needs_clarification", "pending"],
            index=["approved", "rejected", "needs_clarification", "pending"].index(selected.get("review_status", "pending")),
        )
        note = st.text_area("Review note", value=selected.get("review_note") or "", height=120)

        if st.button("Apply review", type="primary"):
            try:
                _ = api_patch(
                    f"/signals/{selected['signal_id']}/review",
                    json={"review_status": new_status, "reviewed_by": reviewer or None, "review_note": note or None},
                )
                st.success("Review saved")
                st.session_state["signals"] = _load_signals(document_id)
            except requests.HTTPError as e:
                st.error(f"Review failed: {e.response.text}")


def export_view() -> None:
    st.subheader("Exports")

    doc = _select_document()
    if not doc:
        return

    document_id = doc["document_id"]

    col1, col2 = st.columns(2)

    with col1:
        if st.button("Fetch JSON (all)"):
            data = api_get(f"/documents/{document_id}/export.json")
            st.download_button(
                "Download JSON",
                data=json.dumps(data, indent=2),
                file_name=f"signals_{document_id}.json",
                mime="application/json",
            )
            st.json(data)

    with col2:
        if st.button("Fetch CSV (all)"):
            r = requests.get(f"{BACKEND_URL}/documents/{document_id}/export.csv", timeout=60, headers=_headers())
            if r.status_code != 200:
                st.error(r.text)
            else:
                st.download_button(
                    "Download CSV",
                    data=r.text,
                    file_name=f"signals_{document_id}.csv",
                    mime="text/csv",
                )

    st.divider()
    st.markdown("### Approved-only exports")
    col3, col4 = st.columns(2)

    with col3:
        if st.button("Fetch JSON (approved)"):
            data = api_get(f"/documents/{document_id}/export-approved.json")
            st.download_button(
                "Download JSON (approved)",
                data=json.dumps(data, indent=2),
                file_name=f"signals_approved_{document_id}.json",
                mime="application/json",
            )

    with col4:
        if st.button("Fetch CSV (approved)"):
            r = requests.get(f"{BACKEND_URL}/documents/{document_id}/export-approved.csv", timeout=60, headers=_headers())
            if r.status_code != 200:
                st.error(r.text)
            else:
                st.download_button(
                    "Download CSV (approved)",
                    data=r.text,
                    file_name=f"signals_approved_{document_id}.csv",
                    mime="text/csv",
                )


def history_view() -> None:
    st.subheader("History")
    try:
        hist = api_get("/history")
    except Exception:
        st.error("Unable to load history")
        return

    docs = hist.get("documents", [])
    runs = hist.get("extraction_runs", [])

    st.markdown("### Documents")
    st.dataframe(pd.DataFrame(docs), use_container_width=True, hide_index=True)

    st.markdown("### Extraction runs")
    st.dataframe(pd.DataFrame(runs), use_container_width=True, hide_index=True)


view = _sidebar()

if view == "Dashboard":
    dashboard_view()
elif view == "Upload":
    upload_view()
elif view == "Extract & Review":
    extract_review_view()
elif view == "History":
    history_view()
elif view == "Exports":
    export_view()
