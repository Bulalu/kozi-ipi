from __future__ import annotations

import json
import re
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any

from kozi_analysis.aliases import normalize_identity


@dataclass(frozen=True)
class DeterministicIdentityRuleCandidate:
    rule_id: str
    rule_name: str
    example_left: str
    example_right: str
    evidence: str
    test_assertion: str


@dataclass(frozen=True)
class ManualAliasReviewCandidate:
    left_name: str
    right_name: str
    left_context: str
    right_context: str
    reason: str
    review_question: str


@dataclass(frozen=True)
class EquivalentPathwayDesignTask:
    task: str
    evidence: str
    design_boundary: str
    test_assertion: str


@dataclass(frozen=True)
class P0CleanupDesignReport:
    deterministic_identity_rules: list[DeterministicIdentityRuleCandidate]
    manual_alias_review_candidates: list[ManualAliasReviewCandidate]
    equivalent_pathway_tasks: list[EquivalentPathwayDesignTask]

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


CAMPUS_MARKERS = {
    "campus",
    "centre",
    "center",
    "branch",
    "college",
}


def _read_json(path: Path) -> dict[str, Any]:
    if not path.exists():
        return {}
    value = json.loads(path.read_text(encoding="utf-8"))
    return value if isinstance(value, dict) else {}


def token_set(value: str) -> set[str]:
    return set(normalize_identity(value).split())


def has_campus_marker(value: str) -> bool:
    return bool(token_set(value) & CAMPUS_MARKERS)


def context_conflicts(left_context: str, right_context: str) -> bool:
    left = normalize_identity(left_context)
    right = normalize_identity(right_context)
    if not left or not right:
        return False
    if left == right:
        return False
    return not (left in right or right in left)


def punctuation_fold(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "", normalize_identity(value))


def is_punctuation_variant(left: str, right: str) -> bool:
    return punctuation_fold(left) == punctuation_fold(right)


def is_safe_deterministic_example(example: dict[str, Any]) -> bool:
    left_name = str(example.get("left_name", ""))
    right_name = str(example.get("right_name", ""))
    reason = str(example.get("reason", ""))

    if context_conflicts(
        str(example.get("left_context", "")),
        str(example.get("right_context", "")),
    ):
        return False

    if has_campus_marker(left_name) or has_campus_marker(right_name):
        return False

    if reason == "exact normalized name":
        return True

    return is_punctuation_variant(left_name, right_name)


def deterministic_candidate(
    example: dict[str, Any],
    index: int,
) -> DeterministicIdentityRuleCandidate:
    left_name = str(example.get("left_name", ""))
    right_name = str(example.get("right_name", ""))
    return DeterministicIdentityRuleCandidate(
        rule_id=f"identity_rule_{index:03d}",
        rule_name="normalize punctuation, case, and spacing",
        example_left=left_name,
        example_right=right_name,
        evidence=str(example.get("reason", "candidate match")),
        test_assertion=(
            "The normalized Institution Names resolve to the same Institution "
            "Identity without changing campus, regulator, or programme context."
        ),
    )


def manual_candidate(example: dict[str, Any]) -> ManualAliasReviewCandidate:
    left_name = str(example.get("left_name", ""))
    right_name = str(example.get("right_name", ""))
    left_context = str(example.get("left_context", ""))
    right_context = str(example.get("right_context", ""))

    if context_conflicts(left_context, right_context):
        reason = "source context differs"
    elif has_campus_marker(left_name) or has_campus_marker(right_name):
        reason = "campus or centre marker may affect student choice"
    else:
        reason = "non-exact identity candidate needs human confirmation"

    return ManualAliasReviewCandidate(
        left_name=left_name,
        right_name=right_name,
        left_context=left_context,
        right_context=right_context,
        reason=reason,
        review_question=(
            "Do these names represent the same Institution Identity for display, "
            "filtering, programme attachment, and application guidance?"
        ),
    )


def institution_examples(aliases: dict[str, Any]) -> list[dict[str, Any]]:
    examples: list[dict[str, Any]] = []
    for pair in aliases.get("institution_pairs", []):
        examples.extend(pair.get("examples", []))
    return examples


def equivalent_pathway_tasks(
    cleanup: dict[str, Any],
) -> list[EquivalentPathwayDesignTask]:
    has_equivalent_task = any(
        "acceptsEquivalent" in str(task.get("title", ""))
        or "acceptsEquivalent" in str(task.get("evidence", ""))
        for task in cleanup.get("tasks", [])
    )
    if not has_equivalent_task:
        return []

    return [
        EquivalentPathwayDesignTask(
            task="Separate vague equivalent text from structured equivalent rules",
            evidence=(
                "Feature readiness identified programmes.acceptsEquivalent as a "
                "P0 weak field."
            ),
            design_boundary=(
                "Equivalent Applicant Pathway is supported for discovery, but "
                "eligibility must remain cannot_determine or "
                "likely_eligible_but_verify unless source text is structured."
            ),
            test_assertion=(
                "A vague 'or equivalent' source phrase never produces an "
                "eligible verdict by itself."
            ),
        ),
        EquivalentPathwayDesignTask(
            task="Add review reasons for equivalent-pathway uncertainty",
            evidence=(
                "Equivalent sources may mean foreign qualification, mature-age "
                "entry, foundation, recognized prior learning, or professional "
                "qualification."
            ),
            design_boundary=(
                "The pipeline should preserve source text and mark unclear "
                "equivalent cases for review instead of dropping the pathway."
            ),
            test_assertion=(
                "Unclear equivalent cases keep raw source text and emit a review "
                "reason that the UI can explain conservatively."
            ),
        ),
    ]


def build_p0_cleanup_design(report_dir: Path) -> P0CleanupDesignReport:
    aliases = _read_json(report_dir / "identity-aliases.json")
    cleanup = _read_json(report_dir / "cleanup-plan.json")

    deterministic: list[DeterministicIdentityRuleCandidate] = []
    manual: list[ManualAliasReviewCandidate] = []

    for example in institution_examples(aliases):
        if is_safe_deterministic_example(example):
            deterministic.append(
                deterministic_candidate(example, len(deterministic) + 1)
            )
        else:
            manual.append(manual_candidate(example))

    return P0CleanupDesignReport(
        deterministic_identity_rules=dedupe_deterministic(deterministic)[:25],
        manual_alias_review_candidates=dedupe_manual(manual)[:25],
        equivalent_pathway_tasks=equivalent_pathway_tasks(cleanup),
    )


def dedupe_deterministic(
    candidates: list[DeterministicIdentityRuleCandidate],
) -> list[DeterministicIdentityRuleCandidate]:
    seen: set[tuple[str, str]] = set()
    deduped: list[DeterministicIdentityRuleCandidate] = []
    for candidate in candidates:
        key = (
            normalize_identity(candidate.example_left),
            normalize_identity(candidate.example_right),
        )
        if key in seen:
            continue
        seen.add(key)
        deduped.append(candidate)
    return deduped


def dedupe_manual(
    candidates: list[ManualAliasReviewCandidate],
) -> list[ManualAliasReviewCandidate]:
    seen: set[tuple[str, str]] = set()
    deduped: list[ManualAliasReviewCandidate] = []
    for candidate in candidates:
        key = (
            normalize_identity(candidate.left_name),
            normalize_identity(candidate.right_name),
        )
        if key in seen:
            continue
        seen.add(key)
        deduped.append(candidate)
    return deduped
