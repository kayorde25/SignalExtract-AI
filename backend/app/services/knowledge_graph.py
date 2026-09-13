import re
from datetime import datetime
from itertools import combinations
from sqlmodel import Session, select

from ..models.signal import Signal
from ..models.entity_node import EntityNode
from ..models.entity_edge import EntityEdge
from ..models.document_entity import DocumentEntity

ENTITY_TYPES = {"person_name", "organization", "location"}

_SUFFIX_MAP = {
    r"\blimited\b":      "ltd",
    r"\bincorporated\b": "inc",
    r"\bcorporation\b":  "corp",
    r"\bcompany\b":      "co",
}

_REL_MAP: dict[frozenset, str] = {
    frozenset({"person_name", "organization"}): "person_organization",
    frozenset({"person_name", "location"}):     "person_location",
    frozenset({"organization", "location"}):    "organization_location",
    # Placeholder for future compliance graph work — do not use yet:
    # frozenset({"signal_relationship"}): "signal_relationship",
}


def normalize_entity(value: str) -> str:
    v = value.lower().strip()
    for pattern, replacement in _SUFFIX_MAP.items():
        v = re.sub(pattern, replacement, v)
    return re.sub(r"\s+", " ", v).strip()


def _rel_type(type_a: str, type_b: str) -> str | None:
    return _REL_MAP.get(frozenset({type_a, type_b}))


def merge_entities(signals: list[Signal], session: Session) -> dict[str, EntityNode]:
    nodes_map: dict[str, EntityNode] = {}
    new_nodes: list[EntityNode] = []

    for signal in signals:
        norm = normalize_entity(signal.value)
        key = f"{signal.signal_type}::{norm}"

        if key in nodes_map:
            continue

        existing = session.exec(
            select(EntityNode).where(
                EntityNode.entity_type == signal.signal_type,
                EntityNode.normalized_value == norm,
            )
        ).first()

        if existing:
            nodes_map[key] = existing
        else:
            node = EntityNode(
                entity_type=signal.signal_type,
                entity_value=signal.value,
                normalized_value=norm,
            )
            session.add(node)
            new_nodes.append(node)
            nodes_map[key] = node

    if new_nodes:
        session.flush()

    return nodes_map


def create_relationships(node_list: list[EntityNode], session: Session) -> None:
    for node_a, node_b in combinations(node_list, 2):
        rel = _rel_type(node_a.entity_type, node_b.entity_type)
        if rel is None:
            continue

        src_id, tgt_id = sorted([node_a.id, node_b.id])

        existing = session.exec(
            select(EntityEdge).where(
                EntityEdge.source_node_id == src_id,
                EntityEdge.target_node_id == tgt_id,
            )
        ).first()

        if existing:
            existing.strength += 1
            existing.document_count += 1
            existing.last_seen_at = datetime.utcnow()
            session.add(existing)
        else:
            session.add(EntityEdge(
                source_node_id=src_id,
                target_node_id=tgt_id,
                relationship_type=rel,
            ))


def build_document_graph(document_id: str, session: Session) -> None:
    already_built = session.exec(
        select(DocumentEntity)
        .where(DocumentEntity.document_id == document_id)
        .limit(1)
    ).first()
    if already_built:
        return

    entity_signals = list(session.exec(
        select(Signal).where(
            Signal.document_id == document_id,
            Signal.signal_type.in_(list(ENTITY_TYPES)),
        )
    ).all())

    if not entity_signals:
        return

    nodes_map = merge_entities(entity_signals, session)
    node_list = list(nodes_map.values())

    for node in node_list:
        session.add(DocumentEntity(
            document_id=document_id,
            entity_node_id=node.id,
        ))

    create_relationships(node_list, session)
    session.commit()
