from __future__ import annotations

import html
import json
import os
from datetime import datetime
from typing import Any

import pandas as pd
import requests
import streamlit as st

from api_client import ApiClient


st.set_page_config(page_title="DocExtract", layout="wide")


_CSS = """
<style>
    .stApp { background: rgba(15, 23, 42, 0.03); }
    section[data-testid="stSidebar"] { background: rgba(255, 255, 255, 0.92); border-right: 1px solid rgba(49, 51, 63, 0.10); }
    .dx-hero { padding: 0.4rem 0 0.9rem 0; }
    .dx-title { font-size: 2.1rem; font-weight: 780; margin: 0; letter-spacing: -0.02em; }
    .dx-subtitle { color: rgba(0,0,0,0.62); margin-top: 0.25rem; font-size: 1rem; }
    .dx-divider { height: 1px; background: rgba(49, 51, 63, 0.10); margin: 0.75rem 0 0.6rem 0; }

    .dx-card { border: 1px solid rgba(49, 51, 63, 0.12); border-radius: 16px; padding: 14px 14px; background: white; box-shadow: 0 10px 30px rgba(15, 23, 42, 0.06); }
    .dx-card h4 { margin: 0 0 0.55rem 0; font-size: 0.92rem; color: rgba(0,0,0,0.68); font-weight: 700; }
    .dx-kpi { font-size: 1.65rem; font-weight: 780; margin: 0; }
    .dx-muted { color: rgba(0,0,0,0.58); font-size: 0.9rem; }

    .dx-grid { display: grid; grid-template-columns: 1fr; gap: 10px; }

    .dx-badge { display: inline-block; padding: 3px 10px; border-radius: 999px; font-size: 0.78rem; font-weight: 700; border: 1px solid rgba(49, 51, 63, 0.12); }
    .dx-badge-ok { background: rgba(16, 185, 129, 0.10); color: rgb(6, 95, 70); }
    .dx-badge-warn { background: rgba(245, 158, 11, 0.10); color: rgb(146, 64, 14); }
    .dx-badge-err { background: rgba(239, 68, 68, 0.10); color: rgb(153, 27, 27); }
    .dx-badge-neutral { background: rgba(59, 130, 246, 0.09); color: rgb(30, 64, 175); }
    .dx-badge-quiet { background: rgba(100, 116, 139, 0.10); color: rgb(51, 65, 85); }

    .dx-pillrow { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
    .dx-step { border: 1px dashed rgba(49, 51, 63, 0.18); border-radius: 16px; padding: 14px 14px; background: rgba(255, 255, 255, 0.72); }
    .dx-step h3 { margin: 0 0 0.35rem 0; font-size: 1.05rem; }

    mark { background: rgba(59, 130, 246, 0.18); padding: 0 2px; border-radius: 4px; }
</style>
"""

st.markdown(_CSS, unsafe_allow_html=True)


def _mask_key(key: str) -> str:
    if len(key) <= 8:
        return "••••••••"
    return f"{key[:4]}••••••••{key[-4:]}"


def _badge(text: str, kind: str) -> str:
    klass = {
        "ok": "dx-badge dx-badge-ok",
        "warn": "dx-badge dx-badge-warn",
        "err": "dx-badge dx-badge-err",
        "neutral": "dx-badge dx-badge-neutral",
        "quiet": "dx-badge dx-badge-quiet",
    }.get(kind, "dx-badge dx-badge-neutral")
    return f"<span class='{klass}'>{html.escape(text)}</span>"


def _confidence_kind(confidence: float | None) -> str:
    if confidence is None:
        return "quiet"
    if confidence >= 0.75:
        return "ok"
    if confidence >= 0.5:
        return "neutral"
    return "warn"


def _review_kind(status: str | None) -> str:
    status = (status or "").strip().lower()
    if status == "approved":
        return "ok"
    if status in {"rejected"}:
        return "err"
    if status in {"needs_clarification"}:
        return "warn"
    if status in {"pending"}:
        return "neutral"
    return "quiet"


def _validation_kind(status: str | None) -> str:
    status = (status or "").strip().lower()
    if status == "ok":
        return "ok"
    if status in {"evidence_weak", "evidence_missing", "validation_failed"}:
        return "warn"
    return "quiet"


def _client() -> ApiClient:
    base = (st.session_state.get("backend_base_url") or "").strip() or None
    key = (st.session_state.get("api_key_override") or "").strip() or None
    return ApiClient.from_env(override_base_url=base, override_api_key=key)


def _sidebar() -> str:
    st.sidebar.markdown("### DocExtract")
    st.sidebar.caption("Evidence-linked, governed extraction")

    # BACKEND_BASE_URL is authoritative; localhost is only the final fallback.
    env_base = (os.getenv("BACKEND_BASE_URL") or "http://localhost:8000").strip()
    if (
        "backend_base_url" not in st.session_state
        or (
            env_base
            and st.session_state.get("backend_base_url", "").strip() == "http://localhost:8000"
            and env_base != "http://localhost:8000"
        )
    ):
        st.session_state["backend_base_url"] = env_base

    st.sidebar.text_input("Backend URL", key="backend_base_url")
    active_base = (st.session_state.get("backend_base_url") or "").strip() or env_base
    st.sidebar.caption(f"Active backend URL: `{active_base}`")

    env_key = (os.getenv("API_KEY") or "").strip()
    override_key = (st.session_state.get("api_key_override") or "").strip()
    if env_key:
        st.sidebar.caption(f"API key status: configured (`{_mask_key(env_key)}` from environment)")
    else:
        st.sidebar.caption("API key status: not configured in environment.")

    st.sidebar.text_input(
        "API key override (optional)",
        key="api_key_override",
        type="password",
        help="If set, this value is used instead of the environment API_KEY.",
    )
    if override_key:
        st.sidebar.caption(f"API key override active: `{_mask_key(override_key)}`")

    st.sidebar.divider()

    c = _client()
    health_ok = False
    ready_ok = False
    meta: dict[str, Any] | None = None

    try:
        _ = c.health()
        health_ok = True
    except Exception:
        health_ok = False

    try:
        _ = c.ready()
        ready_ok = True
    except Exception:
        ready_ok = False

    try:
        meta = c.metadata()
    except Exception:
        meta = None

    hcol1, hcol2 = st.sidebar.columns(2)
    hcol1.markdown(_badge("Health", "ok" if health_ok else "err"), unsafe_allow_html=True)
    hcol2.markdown(_badge("Ready", "ok" if ready_ok else "warn"), unsafe_allow_html=True)

    if meta:
        st.sidebar.markdown("**Runtime**")
        st.sidebar.write(f"Extraction mode: `{meta.get('extraction_mode')}`")
        local_llm = meta.get("local_llm") or {}
        if local_llm.get("enabled"):
            st.sidebar.write(f"Local LLM: `{local_llm.get('provider')}`")
            st.sidebar.write(f"Model: `{local_llm.get('model')}`")
        else:
            st.sidebar.write("Local LLM: disabled")

    st.sidebar.divider()
    return st.sidebar.radio(
        "Navigation",
        [
            "Dashboard",
            "Upload & Extract",
            "Review Signals",
            "Evidence Viewer",
            "Export",
            "History",
            "Settings",
        ],
    )


def _header() -> None:
    st.markdown(
        """
                <div class='dx-hero'>
                    <div class='dx-title'>DocExtract</div>
                    <div class='dx-subtitle'>Evidence-linked document intelligence for structured signal extraction.</div>
        </div>
        """,
        unsafe_allow_html=True,
    )


def _select_document(c: ApiClient) -> dict | None:
    hist = c.history()
    docs = list(hist.get("documents", []))
    if not docs:
        st.info("No documents available yet. Upload a document to begin.")
        return None

    options = {f"{d['filename']} | {d['document_id']}": d for d in docs}
    selected = st.selectbox("Document", list(options.keys()))
    return options[selected]


def dashboard_page() -> None:
    _header()
    st.subheader("Dashboard")

    c = _client()
    try:
        stats = c.stats()
        meta = c.metadata()
        ready = c.ready()
    except Exception as e:
        st.error("Backend is not reachable with the current configuration.")
        st.code(
            "cd backend\n.\\.venv\\Scripts\\Activate.ps1\npython -m uvicorn app.main:app --reload --port 8000",
            language="powershell",
        )
        st.caption(str(e))
        return

    by_status = stats.get("signals_by_review_status", {})

    m1, m2, m3, m4, m5 = st.columns(5)
    m1.markdown(
        f"<div class='dx-card'><h4>Documents processed</h4><div class='dx-kpi'>{int(stats.get('documents_total', 0))}</div><div class='dx-muted'>Ingested and persisted</div></div>",
        unsafe_allow_html=True,
    )
    m2.markdown(
        f"<div class='dx-card'><h4>Total signals extracted</h4><div class='dx-kpi'>{int(stats.get('signals_total', 0))}</div><div class='dx-muted'>Evidence-linked signals</div></div>",
        unsafe_allow_html=True,
    )
    m3.markdown(
        f"<div class='dx-card'><h4>Needs review</h4><div class='dx-kpi'>{int(stats.get('signals_needing_review', 0))}</div><div class='dx-muted'>Governed review workflow</div></div>",
        unsafe_allow_html=True,
    )
    m4.markdown(
        f"<div class='dx-card'><h4>Approved</h4><div class='dx-kpi'>{int(by_status.get('approved', 0))}</div><div class='dx-muted'>Eligible for approved-only export</div></div>",
        unsafe_allow_html=True,
    )
    m5.markdown(
        f"<div class='dx-card'><h4>Rejected</h4><div class='dx-kpi'>{int(by_status.get('rejected', 0))}</div><div class='dx-muted'>Excluded from approved-only export</div></div>",
        unsafe_allow_html=True,
    )

    st.markdown("<div class='dx-divider'></div>", unsafe_allow_html=True)
    st.markdown("#### SaaS system overview")

    s1, s2, s3 = st.columns(3)
    s1.markdown(
        f"<div class='dx-card'><h4>System status</h4><div class='dx-pillrow'>{_badge('Backend healthy', 'ok')}{_badge('Ready', 'ok')}</div><div class='dx-muted'>Health + readiness endpoints</div></div>",
        unsafe_allow_html=True,
    )
    s2.markdown(
        f"<div class='dx-card'><h4>Extraction mode</h4><div class='dx-pillrow'>{_badge(str(meta.get('extraction_mode', 'unknown')), 'neutral')}</div><div class='dx-muted'>Production extraction pipeline</div></div>",
        unsafe_allow_html=True,
    )
    local_llm = meta.get("local_llm") or {}
    llm_text = f"{local_llm.get('provider')} · {local_llm.get('model')}" if local_llm.get("enabled") else "Disabled"
    s3.markdown(
        f"<div class='dx-card'><h4>LLM / Ollama</h4><div class='dx-pillrow'>{_badge(llm_text, 'neutral' if local_llm.get('enabled') else 'warn')}</div><div class='dx-muted'>Local LLM configuration</div></div>",
        unsafe_allow_html=True,
    )

    st.markdown("<div class='dx-divider'></div>", unsafe_allow_html=True)
    st.markdown("#### Recent activity")
    try:
        hist = c.history()
        docs = list(hist.get("documents", []))
        runs = list(hist.get("extraction_runs", []))
        a1, a2 = st.columns(2)
        with a1:
            st.markdown("**Recent documents**")
            st.dataframe(pd.DataFrame(docs).head(10), use_container_width=True, hide_index=True)
        with a2:
            st.markdown("**Recent extraction runs**")
            st.dataframe(pd.DataFrame(runs).head(10), use_container_width=True, hide_index=True)
    except Exception:
        st.caption("Recent activity is not available.")

    with st.expander("Readiness details", expanded=False):
        st.json(ready)


def upload_extract_page() -> None:
    _header()
    st.subheader("Upload & Extract")

    c = _client()

    try:
        meta = c.metadata()
        allowed = meta.get("allowed_extensions") or [".txt", ".pdf", ".docx", ".eml"]
    except Exception:
        allowed = [".txt", ".pdf", ".docx", ".eml"]

    st.caption("Production ingestion and evidence-linked extraction")
    st.markdown(f"Allowed file types: `{', '.join(allowed)}`")

    st.markdown("<div class='dx-divider'></div>", unsafe_allow_html=True)
    st.markdown("#### Guided workflow")

    file = st.file_uploader("Step 1 — Upload document", type=["txt", "pdf", "docx", "eml"])
    uploaded_ok = bool(st.session_state.get("active_document_id"))
    extracted_text_ok = bool(st.session_state.get(f"chunks::{st.session_state.get('active_document_id', '')}") or "")
    extracted_signals_ok = bool(st.session_state.get(f"signals::{st.session_state.get('active_document_id', '')}") or "")

    if not file:
        st.markdown(
            f"""
            <div class='dx-step'>
              <h3>Step 1 — Upload document</h3>
              <div class='dx-muted'>Upload a document to start evidence-linked extraction.</div>
            </div>
            """,
            unsafe_allow_html=True,
        )
        return

    filename = file.name
    content = file.getvalue()
    ext = ("." + filename.split(".")[-1].lower()) if "." in filename else ""

    st.markdown(
        f"""
        <div class='dx-step'>
          <h3>Step 1 — Upload document {_badge('Completed', 'ok') if uploaded_ok else _badge('Required', 'warn')}</h3>
          <div class='dx-muted'>Ingests the file, computes content hash, and creates a governed document record.</div>
        </div>
        """,
        unsafe_allow_html=True,
    )

    p1, p2 = st.columns([2, 1])
    with p1:
        st.markdown("**Preview**")
        if ext in {".txt", ".eml"}:
            preview = content.decode("utf-8", errors="replace")[:5000]
            st.text_area("Document preview", value=preview, height=220, label_visibility="collapsed")
        else:
            st.write({"filename": filename, "size_bytes": len(content), "content_type": file.type})
            st.caption("Preview is available after Step 2 text extraction for non-text formats.")

    with p2:
        if st.button("Upload", type="primary"):
            with st.spinner("Uploading document..."):
                try:
                    resp = c.upload(filename=filename, content=content, content_type=file.type)
                    doc = resp.get("document", {})
                    st.session_state["active_document_id"] = doc.get("document_id")
                    st.success("Upload completed.")
                    st.json(doc)
                except requests.HTTPError as e:
                    st.error(e.response.text)

    doc_id = st.session_state.get("active_document_id")
    if not doc_id:
        st.info("Continue once upload completes.")
        return

    st.markdown(
        f"""
        <div class='dx-step'>
          <h3>Step 2 — Extract text {_badge('Completed', 'ok') if extracted_text_ok else _badge('Pending', 'neutral')}</h3>
          <div class='dx-muted'>Produces verbatim text and structure-aware chunks for evidence provenance.</div>
        </div>
        """,
        unsafe_allow_html=True,
    )

    if st.button("Extract Text", key="extract_text", disabled=not uploaded_ok):
        with st.spinner("Extracting verbatim text and structure-aware chunks..."):
            try:
                resp = c.extract_text(document_id=doc_id)
                st.session_state[f"text::{doc_id}"] = resp.get("text")
                st.session_state[f"chunks::{doc_id}"] = resp.get("chunks")
                st.success(f"Text extracted. Chunks: {len(resp.get('chunks', []))}")
            except requests.HTTPError as e:
                st.error(e.response.text)

    st.markdown(
        f"""
        <div class='dx-step'>
          <h3>Step 3 — Extract signals {_badge('Completed', 'ok') if extracted_signals_ok else _badge('Pending', 'neutral')}</h3>
          <div class='dx-muted'>Generates structured signals with verbatim evidence, confidence, and review routing.</div>
        </div>
        """,
        unsafe_allow_html=True,
    )

    if st.button("Extract Signals", key="extract_signals", disabled=not uploaded_ok):
        with st.spinner("Extracting evidence-linked signals..."):
            try:
                resp = c.extract_signals(document_id=doc_id)
                st.session_state[f"signals::{doc_id}"] = resp.get("signals")
                st.success(f"Signals extracted: {len(resp.get('signals', []))}")
            except requests.HTTPError as e:
                st.error(e.response.text)

    st.markdown(
        """
        <div class='dx-step'>
          <h3>Step 4 — Review / export results</h3>
          <div class='dx-muted'>Approve/reject signals to enable governed, approved-only exports.</div>
        </div>
        """,
        unsafe_allow_html=True,
    )

    signals = st.session_state.get(f"signals::{doc_id}") or []
    if signals:
        st.markdown("<div class='dx-divider'></div>", unsafe_allow_html=True)
        st.markdown("#### Extracted signals (table)")
        df = pd.DataFrame(signals)
        cols = [
            "signal_type",
            "signal_text",
            "evidence_text",
            "confidence",
            "explicitness",
            "validation_status",
            "review_status",
            "needs_review",
        ]
        shown = [c for c in cols if c in df.columns]
        st.dataframe(df[shown], use_container_width=True, hide_index=True)


def review_signals_page() -> None:
    _header()
    st.subheader("Review Signals")

    c = _client()
    doc = _select_document(c)
    if not doc:
        return

    document_id = doc["document_id"]

    reviewer = st.text_input("Reviewer", value=os.getenv("REVIEWER", "").strip(), help="Stored with review decisions for auditability.")

    try:
        signals_resp = c.get_signals(document_id=document_id)
        signals = list(signals_resp.get("signals", []))
    except requests.HTTPError as e:
        st.error(e.response.text)
        return

    if not signals:
        st.info("No signals stored for this document yet. Run extraction first.")
        return

    df = pd.DataFrame(signals)

    st.markdown("<div class='dx-divider'></div>", unsafe_allow_html=True)
    st.markdown("#### Filters")
    f1, f2, f3, f4 = st.columns(4)
    type_options = sorted(df["signal_type"].dropna().unique().tolist())
    status_options = sorted(df["review_status"].dropna().unique().tolist())

    selected_types = f1.multiselect("Signal type", options=type_options, default=type_options)
    needs_review_only = f2.checkbox("Needs review only", value=False)
    conf_min = f3.slider("Confidence threshold", 0.0, 1.0, 0.0, 0.05)
    selected_statuses = f4.multiselect("Review status", options=status_options, default=status_options)

    filtered = df[df["signal_type"].isin(selected_types) & (df["confidence"] >= conf_min)]
    if needs_review_only:
        filtered = filtered[filtered["needs_review"] == True]  # noqa: E712
    if selected_statuses:
        filtered = filtered[filtered["review_status"].isin(selected_statuses)]

    st.markdown("<div class='dx-divider'></div>", unsafe_allow_html=True)
    st.markdown("#### Review table")
    table_cols = [
        "signal_type",
        "signal_text",
        "evidence_text",
        "confidence",
        "explicitness",
        "validation_status",
        "review_status",
        "needs_review",
    ]
    shown = [c for c in table_cols if c in filtered.columns]
    st.dataframe(filtered[shown].sort_values(by=["needs_review", "confidence"], ascending=[False, True]), use_container_width=True)

    st.markdown("<div class='dx-divider'></div>", unsafe_allow_html=True)
    st.markdown("#### Review actions")
    st.caption("Approve / reject / request clarification as part of a governed review workflow.")

    action_rows = filtered.sort_values(by=["needs_review", "confidence"], ascending=[False, True]).head(25).to_dict("records")
    for row in action_rows:
        sid = row.get("signal_id")
        if not sid:
            continue

        with st.container():
            top = st.columns([1, 1, 2, 2])
            top[0].markdown(_badge(str(row.get("signal_type", "")) or "signal", "neutral"), unsafe_allow_html=True)
            top[1].markdown(
                _badge(
                    f"confidence {float(row.get('confidence', 0.0)):.2f}",
                    _confidence_kind(float(row.get("confidence", 0.0))),
                ),
                unsafe_allow_html=True,
            )
            top[2].markdown(_badge(str(row.get("validation_status", "")) or "validation", _validation_kind(row.get("validation_status"))), unsafe_allow_html=True)
            top[3].markdown(_badge(str(row.get("review_status", "")) or "pending", _review_kind(row.get("review_status"))), unsafe_allow_html=True)

            pillrow = [
                _badge("needs review" if bool(row.get("needs_review")) else "review optional", "warn" if bool(row.get("needs_review")) else "quiet"),
                _badge(str(row.get("explicitness") or ""), "quiet"),
            ]
            st.markdown(f"<div class='dx-pillrow'>{''.join(pillrow)}</div>", unsafe_allow_html=True)

            st.write("**Signal**")
            st.code(str(row.get("signal_text", ""))[:2000])
            st.write("**Evidence**")
            st.code(str(row.get("evidence_text", ""))[:2000])

            with st.expander("Evidence preview (source chunk)", expanded=False):
                para_id = row.get("paragraph_id")
                if not para_id:
                    st.caption("No paragraph_id available for this signal.")
                else:
                    try:
                        chunks = st.session_state.get(f"chunks::{document_id}")
                        if not chunks:
                            text_resp = c.extract_text(document_id=document_id)
                            chunks = list(text_resp.get("chunks", []))
                            st.session_state[f"chunks::{document_id}"] = chunks

                        chunks = list(chunks)
                        chunk_text = None
                        for ch in chunks:
                            if ch.get("paragraph_id") == para_id:
                                chunk_text = str(ch.get("text") or "")
                                break

                        if not chunk_text:
                            st.caption("Chunk not found for the stored paragraph_id.")
                        else:
                            ev = str(row.get("evidence_text") or "").strip()
                            safe = html.escape(chunk_text)
                            if ev and ev in chunk_text:
                                safe = safe.replace(html.escape(ev), f"<mark>{html.escape(ev)}</mark>")
                            st.markdown(f"<div class='dx-card'>{safe}</div>", unsafe_allow_html=True)
                    except requests.HTTPError as e:
                        st.error(e.response.text)

            note_key = f"review_note::{sid}"
            st.text_area("Review note", key=note_key, placeholder="Add an audit note for this review decision (optional)")

            b1, b2, b3 = st.columns(3)
            if b1.button("Approve", key=f"approve::{sid}"):
                with st.spinner("Saving review..."):
                    try:
                        c.review_signal(
                            signal_id=sid,
                            review_status="approved",
                            reviewed_by=reviewer or None,
                            review_note=(st.session_state.get(note_key) or "").strip() or None,
                        )
                        st.success("Approved")
                    except requests.HTTPError as e:
                        st.error(e.response.text)

            if b2.button("Reject", key=f"reject::{sid}"):
                with st.spinner("Saving review..."):
                    try:
                        c.review_signal(
                            signal_id=sid,
                            review_status="rejected",
                            reviewed_by=reviewer or None,
                            review_note=(st.session_state.get(note_key) or "").strip() or None,
                        )
                        st.success("Rejected")
                    except requests.HTTPError as e:
                        st.error(e.response.text)

            if b3.button("Needs clarification", key=f"clarify::{sid}"):
                with st.spinner("Saving review..."):
                    try:
                        c.review_signal(
                            signal_id=sid,
                            review_status="needs_clarification",
                            reviewed_by=reviewer or None,
                            review_note=(st.session_state.get(note_key) or "").strip() or None,
                        )
                        st.success("Marked for clarification")
                    except requests.HTTPError as e:
                        st.error(e.response.text)


def evidence_viewer_page() -> None:
    _header()
    st.subheader("Evidence Viewer")

    c = _client()
    doc = _select_document(c)
    if not doc:
        return

    document_id = doc["document_id"]

    try:
        signals_resp = c.get_signals(document_id=document_id)
        signals = list(signals_resp.get("signals", []))
    except requests.HTTPError as e:
        st.error(e.response.text)
        return

    if not signals:
        st.info("No signals available yet for this document.")
        return

    options = {f"{s.get('signal_type')} | {s.get('confidence', 0):.2f} | {s.get('signal_id')}": s for s in signals}
    selected_key = st.selectbox("Signal", list(options.keys()))
    s = options[selected_key]

    st.markdown("#### Selected signal")
    left, right = st.columns([2, 1])
    with left:
        confidence = float(s.get("confidence", 0.0) or 0.0)
        st.markdown(
            f"<div class='dx-pillrow'>{_badge(str(s.get('signal_type') or 'signal'), 'neutral')}{_badge(f'confidence {confidence:.2f}', _confidence_kind(confidence))}{_badge(str(s.get('explicitness') or ''), 'quiet')}{_badge(str(s.get('validation_status') or ''), _validation_kind(s.get('validation_status')))}</div>",
            unsafe_allow_html=True,
        )
        st.write("**Signal text**")
        st.code(str(s.get("signal_text", "")))
        st.write("**Evidence (verbatim)**")
        st.code(str(s.get("evidence_text", "")))
    with right:
        st.write("**Provenance**")
        st.json(
            {
                "source_document": s.get("source_document"),
                "source_page": s.get("source_page"),
                "source_section": s.get("source_section"),
                "paragraph_id": s.get("paragraph_id"),
                "explicitness": s.get("explicitness"),
                "confidence": s.get("confidence"),
                "validation_status": s.get("validation_status"),
                "review_status": s.get("review_status"),
            }
        )

    st.markdown("#### Evidence-linked auditing")
    st.info("Every signal is linked to verbatim evidence to support auditability and a governed review workflow.")

    para_id = s.get("paragraph_id")
    if para_id:
        with st.spinner("Loading source chunk for evidence context..."):
            try:
                text_resp = c.extract_text(document_id=document_id)
                chunks = list(text_resp.get("chunks", []))
                chunk_text = None
                for ch in chunks:
                    if ch.get("paragraph_id") == para_id:
                        chunk_text = str(ch.get("text") or "")
                        break

                if chunk_text:
                    ev = str(s.get("evidence_text") or "").strip()
                    safe = html.escape(chunk_text)
                    if ev and ev in chunk_text:
                        safe = safe.replace(html.escape(ev), f"<mark>{html.escape(ev)}</mark>")
                    st.markdown("**Source chunk**")
                    st.markdown(f"<div class='dx-card'>{safe}</div>", unsafe_allow_html=True)
            except requests.HTTPError as e:
                st.error(e.response.text)


def export_page() -> None:
    _header()
    st.subheader("Export")

    c = _client()
    doc = _select_document(c)
    if not doc:
        return

    document_id = doc["document_id"]

    st.caption("Exports are designed for production integration. Use approved-only exports to enforce governance.")
    st.markdown("<div class='dx-divider'></div>", unsafe_allow_html=True)
    st.markdown("#### Export packages")

    c1, c2 = st.columns(2)
    with c1:
        st.markdown(f"<div class='dx-card'><h4>All signals JSON</h4><div class='dx-muted'>Full extraction output (JSON)</div></div>", unsafe_allow_html=True)
        if st.button("Download", key="export_all_json", type="primary"):
            try:
                data = c.export_all_json(document_id=document_id)
                st.download_button(
                    "Save JSON",
                    data=json.dumps(data, indent=2),
                    file_name=f"signals_{document_id}.json",
                    mime="application/json",
                )
                st.json(data)
            except requests.HTTPError as e:
                st.error(e.response.text)

    with c2:
        st.markdown(f"<div class='dx-card'><h4>All signals CSV</h4><div class='dx-muted'>Full extraction output (CSV)</div></div>", unsafe_allow_html=True)
        if st.button("Download", key="export_all_csv", type="primary"):
            try:
                csv_text = c.export_all_csv(document_id=document_id)
                st.download_button(
                    "Save CSV",
                    data=csv_text,
                    file_name=f"signals_{document_id}.csv",
                    mime="text/csv",
                )
            except requests.HTTPError as e:
                st.error(e.response.text)

    st.markdown("<div class='dx-divider'></div>", unsafe_allow_html=True)
    c3, c4 = st.columns(2)
    with c3:
        st.markdown(f"<div class='dx-card'><h4>Approved signals JSON</h4><div class='dx-muted'>Governed export (JSON)</div></div>", unsafe_allow_html=True)
        if st.button("Download", key="export_approved_json"):
            try:
                data = c.export_approved_json(document_id=document_id)
                st.download_button(
                    "Save JSON",
                    data=json.dumps(data, indent=2),
                    file_name=f"signals_approved_{document_id}.json",
                    mime="application/json",
                )
                st.json(data)
            except requests.HTTPError as e:
                st.error(e.response.text)

    with c4:
        st.markdown(f"<div class='dx-card'><h4>Approved signals CSV</h4><div class='dx-muted'>Governed export (CSV)</div></div>", unsafe_allow_html=True)
        if st.button("Download", key="export_approved_csv"):
            try:
                csv_text = c.export_approved_csv(document_id=document_id)
                st.download_button(
                    "Save CSV",
                    data=csv_text,
                    file_name=f"signals_approved_{document_id}.csv",
                    mime="text/csv",
                )
            except requests.HTTPError as e:
                st.error(e.response.text)


def settings_page() -> None:
    _header()
    st.subheader("Settings / System")

    c = _client()
    meta: dict[str, Any] | None = None
    try:
        meta = c.metadata()
    except Exception:
        meta = None

    env_key = (os.getenv("API_KEY") or "").strip()
    client_key_present = bool((st.session_state.get("api_key_override") or "").strip() or env_key)

    env_name = (
        os.getenv("APP_ENV")
        or os.getenv("ENVIRONMENT")
        or os.getenv("ENV")
        or "local"
    ).strip()

    st.markdown("<div class='dx-divider'></div>", unsafe_allow_html=True)
    st.markdown("#### Runtime configuration")

    left, right = st.columns(2)
    with left:
        st.markdown(
            f"<div class='dx-card'><h4>Backend URL</h4><div class='dx-kpi' style='font-size:1.05rem'>{html.escape(st.session_state.get('backend_base_url') or '')}</div><div class='dx-muted'>BACKEND_BASE_URL</div></div>",
            unsafe_allow_html=True,
        )
    with right:
        backend_key_configured = bool(meta and meta.get("api_key_configured"))
        st.markdown(
            f"<div class='dx-card'><h4>API key</h4><div class='dx-pillrow'>{_badge('Configured in backend' if backend_key_configured else 'Not configured in backend', 'ok' if backend_key_configured else 'warn')}{_badge('Client key present' if client_key_present else 'Client key missing', 'ok' if client_key_present else 'err')}</div><div class='dx-muted'>Header: x-api-key</div></div>",
            unsafe_allow_html=True,
        )

    if meta:
        local_llm = meta.get("local_llm") or {}
        a, b = st.columns(2)
        with a:
            st.markdown(
                f"<div class='dx-card'><h4>Extraction mode</h4><div class='dx-pillrow'>{_badge(str(meta.get('extraction_mode', 'unknown')), 'neutral')}</div><div class='dx-muted'>Backend runtime mode</div></div>",
                unsafe_allow_html=True,
            )
        with b:
            llm_enabled = bool(local_llm.get("enabled"))
            st.markdown(
                f"<div class='dx-card'><h4>Local LLM</h4><div class='dx-pillrow'>{_badge('Enabled' if llm_enabled else 'Disabled', 'neutral' if llm_enabled else 'warn')}</div><div class='dx-muted'>Ollama-compatible configuration</div></div>",
                unsafe_allow_html=True,
            )

        c1, c2 = st.columns(2)
        with c1:
            st.markdown(
                f"<div class='dx-card'><h4>Ollama endpoint</h4><div class='dx-kpi' style='font-size:1.05rem'>{html.escape(str(local_llm.get('endpoint') or ''))}</div><div class='dx-muted'>LOCAL_LLM_ENDPOINT</div></div>",
                unsafe_allow_html=True,
            )
        with c2:
            st.markdown(
                f"<div class='dx-card'><h4>Ollama model</h4><div class='dx-kpi' style='font-size:1.05rem'>{html.escape(str(local_llm.get('model') or ''))}</div><div class='dx-muted'>LOCAL_LLM_MODEL</div></div>",
                unsafe_allow_html=True,
            )

    st.markdown("<div class='dx-divider'></div>", unsafe_allow_html=True)
    st.markdown("#### Environment")
    st.write({"environment": env_name, "app_version": (meta or {}).get("app_version", "not provided"), "frontend_version": "not provided"})


def history_page() -> None:
    _header()
    st.subheader("History")

    c = _client()
    try:
        hist = c.history()
    except requests.HTTPError as e:
        st.error(e.response.text)
        return

    docs = list(hist.get("documents", []))
    runs = list(hist.get("extraction_runs", []))

    left, right = st.columns(2)
    with left:
        st.markdown("#### Documents")
        st.dataframe(pd.DataFrame(docs), use_container_width=True, hide_index=True)
    with right:
        st.markdown("#### Extraction runs")
        st.dataframe(pd.DataFrame(runs), use_container_width=True, hide_index=True)


view = _sidebar()

if view == "Dashboard":
    dashboard_page()
elif view == "Upload & Extract":
    upload_extract_page()
elif view == "Review Signals":
    review_signals_page()
elif view == "Evidence Viewer":
    evidence_viewer_page()
elif view == "Export":
    export_page()
elif view == "History":
    history_page()
elif view == "Settings":
    settings_page()
