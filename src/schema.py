from pydantic import BaseModel
from typing import Optional, Literal


class ExtractedSignal(BaseModel):
    signal_type: Literal[
        "finding",
        "recommendation",
        "action",
        "clinical_statement",
        "operational_statement",
        "risk"
    ]

    signal_text: str
    evidence_text: str
    source_document: str
    source_section: Optional[str] = None
    paragraph_id: Optional[str] = None

    subject: Optional[str] = None
    action: Optional[str] = None
    urgency: Optional[str] = None
    certainty: Optional[str] = None
    explicitness: Literal["explicit", "implied"]

    confidence: float
