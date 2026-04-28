import streamlit as st
import json
from src.pipeline import run_pipeline

st.set_page_config(page_title="Document Signal Extraction AI", layout="wide")

st.title("Document Signal Extraction AI")
st.write("Extract findings, recommendations, actions, risks, and operational signals from messy documents.")

uploaded_file = st.file_uploader("Upload a text document", type=["txt"])

if uploaded_file:
    text = uploaded_file.read().decode("utf-8")

    st.subheader("Document Preview")
    st.text_area("Input text", text, height=250)

    if st.button("Extract Signals"):
        results = run_pipeline(text, uploaded_file.name)

        st.subheader("Extracted Signals")
        st.json(results)

        st.download_button(
            label="Download JSON",
            data=json.dumps(results, indent=2),
            file_name="extracted_signals.json",
            mime="application/json"
        )
