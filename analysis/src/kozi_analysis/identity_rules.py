from __future__ import annotations

import re

CAMPUS_MARKERS = frozenset({"campus", "centre", "center", "branch", "college"})


def normalize_identity_text(value: object) -> str:
    text = str(value or "").lower()
    text = text.replace("&", " and ")
    text = re.sub(r"[^a-z0-9]+", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def token_set(value: object) -> set[str]:
    return set(normalize_identity_text(value).split())


def has_campus_marker(value: object) -> bool:
    return bool(token_set(value) & CAMPUS_MARKERS)
