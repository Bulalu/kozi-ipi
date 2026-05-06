from __future__ import annotations

import re
from collections import Counter
from typing import Any, Literal

ManualReviewQueueKind = Literal[
    "institution_identity",
    "programme_offering_identity",
    "applicant_pathway",
    "source_extraction",
    "data_completeness",
    "general",
]


def classify_manual_review_queue(reason: str) -> ManualReviewQueueKind:
    if re.search(r"alias|identity|campus|institution", reason, re.I):
        return "institution_identity"
    if re.search(
        r"programme.*(name|title)|title_leak|requirement_fragment", reason, re.I
    ):
        return "programme_offering_identity"
    if re.search(r"equivalent|pathway|route|accepts", reason, re.I):
        return "applicant_pathway"
    if re.search(r"pdf|extraction|dotted_filler|parsed", reason, re.I):
        return "source_extraction"
    if re.search(r"missing|unknown|confidence", reason, re.I):
        return "data_completeness"
    return "general"


def manual_review_queue_distribution(records: list[dict[str, Any]]) -> Counter[str]:
    counter: Counter[str] = Counter()
    for record in records:
        reasons = record.get("reviewReasons")
        if isinstance(reasons, list):
            counter.update(
                classify_manual_review_queue(str(reason)) for reason in reasons
            )
    return counter
