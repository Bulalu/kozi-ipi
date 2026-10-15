from __future__ import annotations

import json
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any


@dataclass(frozen=True)
class CleanupTask:
    priority: str
    area: str
    title: str
    evidence: str
    next_action: str


@dataclass(frozen=True)
class CleanupPlanReport:
    tasks: list[CleanupTask]

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


def _read_json(path: Path) -> dict[str, Any]:
    if not path.exists():
        return {}
    value = json.loads(path.read_text(encoding="utf-8"))
    return value if isinstance(value, dict) else {}


def weak_feature_tasks(features: dict[str, Any]) -> list[CleanupTask]:
    tasks: list[CleanupTask] = []
    weak_fields = [
        coverage
        for coverage in features.get("field_coverages", [])
        if coverage.get("status") == "weak"
    ]

    for coverage in weak_fields:
        field_name = f"{coverage['dataset']}.{coverage['field']}"
        percent = coverage["coverage_percent"]
        priority = "P0" if coverage["area"] in {"eligibility"} else "P1"
        if coverage["area"] == "contact_application":
            priority = "P1"
        if coverage["area"] == "institution_cards":
            priority = "P2"

        tasks.append(
            CleanupTask(
                priority=priority,
                area=coverage["area"],
                title=f"Improve or design fallback for `{field_name}`",
                evidence=(
                    f"{field_name} has {percent:.2f}% coverage and is required "
                    f"for {coverage['required_for']}."
                ),
                next_action=(
                    "Decide whether this field needs enrichment, deterministic "
                    "fallbacks, or reduced MVP expectations."
                ),
            )
        )

    return tasks


def alias_tasks(aliases: dict[str, Any]) -> list[CleanupTask]:
    if not aliases:
        return []

    institution_pairs = aliases.get("institution_pairs", [])
    programme_pairs = aliases.get("programme_pairs", [])
    institution_candidates = sum(
        pair.get("candidate_count", 0) for pair in institution_pairs
    )
    programme_candidates = sum(
        pair.get("candidate_count", 0) for pair in programme_pairs
    )

    return [
        CleanupTask(
            priority="P0",
            area="identity",
            title="Define institution alias rules before merge/export replacement",
            evidence=(
                f"Alias analysis produced {institution_candidates} institution "
                "candidate examples across campus, location, and abbreviation drift."
            ),
            next_action=(
                "Review candidates and decide which rules become deterministic "
                "normalization versus a manual alias table."
            ),
        ),
        CleanupTask(
            priority="P1",
            area="identity",
            title="Keep programme alias matching tied to institution context",
            evidence=(
                f"Alias analysis produced {programme_candidates} programme "
                "candidate examples after requiring institution-context overlap."
            ),
            next_action=(
                "Do not use programme title alone for merge decisions; include "
                "institution identity and programme code when available."
            ),
        ),
    ]


def overlap_tasks(overlap: dict[str, Any]) -> list[CleanupTask]:
    if not overlap:
        return []

    low_institution_pairs = [
        pair
        for pair in overlap.get("institution_overlaps", [])
        if pair.get("jaccard", 1) < 0.05 and pair.get("shared_count", 0) > 0
    ]

    if not low_institution_pairs:
        return []

    return [
        CleanupTask(
            priority="P1",
            area="source_overlap",
            title="Explain low-overlap source pairs before treating records as new",
            evidence=(
                f"{len(low_institution_pairs)} institution source pairs have low "
                "exact overlap despite at least one shared record."
            ),
            next_action=(
                "Use alias review before deciding fallback-only or extraction-only "
                "records are genuinely distinct institutions."
            ),
        )
    ]


def build_cleanup_plan(report_dir: Path) -> CleanupPlanReport:
    overlap = _read_json(report_dir / "source-overlap.json")
    aliases = _read_json(report_dir / "identity-aliases.json")
    features = _read_json(report_dir / "feature-readiness.json")

    tasks = [
        *alias_tasks(aliases),
        *weak_feature_tasks(features),
        *overlap_tasks(overlap),
    ]

    priority_order = {"P0": 0, "P1": 1, "P2": 2}
    return CleanupPlanReport(
        tasks=sorted(
            tasks,
            key=lambda task: (
                priority_order.get(task.priority, 9),
                task.area,
                task.title,
            ),
        )
    )
