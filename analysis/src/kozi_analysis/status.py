from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any


@dataclass(frozen=True)
class StatusSnapshot:
    current_goal: str
    current_question: str
    short_answer: str
    next_question: str
    next_notebook: str
    data_counts: list[dict[str, int | str]]
    source_counts: list[dict[str, int | str]]
    alias_counts: list[dict[str, int | str]]
    feature_counts: list[dict[str, int | float | str]]
    cleanup_counts: list[dict[str, int | str]]
    p0_design_counts: list[dict[str, int | str]]
    candidate_counts: list[dict[str, int | str | bool | None]]
    gate_counts: list[dict[str, int | str | bool]]
    key_findings: list[str]
    risks: list[str]
    completed_notebooks: list[dict[str, str]]


def _read_json(path: Path) -> dict[str, Any]:
    if not path.exists():
        return {}
    value = json.loads(path.read_text(encoding="utf-8"))
    return value if isinstance(value, dict) else {}


def build_status_snapshot(report_dir: Path) -> StatusSnapshot:
    inventory = _read_json(report_dir / "inventory.json")
    overlap = _read_json(report_dir / "source-overlap.json")
    aliases = _read_json(report_dir / "identity-aliases.json")
    features = _read_json(report_dir / "feature-readiness.json")
    cleanup = _read_json(report_dir / "cleanup-plan.json")
    p0_design = _read_json(report_dir / "p0-cleanup-design.json")
    candidate = _read_json(report_dir / "candidate-vs-current.json")
    gate = _read_json(report_dir / "candidate-gate.json")

    rows_by_group = inventory.get("rows_by_group", {})
    data_counts = [
        {"group": group, "rows": int(rows_by_group.get(group, 0))}
        for group in ["raw", "extracted", "enrichment", "processed"]
    ]

    source_counts = [
        {
            "source_type": "institution",
            "sources": len(overlap.get("institution_sources", [])),
            "pair_comparisons": len(overlap.get("institution_overlaps", [])),
        },
        {
            "source_type": "programme",
            "sources": len(overlap.get("programme_sources", [])),
            "pair_comparisons": len(overlap.get("programme_overlaps", [])),
        },
    ]

    alias_counts = [
        {
            "source_pair": f"{pair['left_source']} -> {pair['right_source']}",
            "type": pair["record_type"],
            "examples": int(pair["candidate_count"]),
            "high_confidence": int(pair["high_confidence_count"]),
        }
        for pair in aliases.get("institution_pairs", [])
        + aliases.get("programme_pairs", [])
    ]

    feature_counts = [
        {
            "area": summary["area"],
            "fields": int(summary["field_count"]),
            "avg_coverage": float(summary["average_coverage_percent"]),
            "weak_fields": int(summary["weak_field_count"]),
        }
        for summary in features.get("area_summaries", [])
    ]

    cleanup_counts = []
    for priority in ["P0", "P1", "P2"]:
        tasks = [
            task
            for task in cleanup.get("tasks", [])
            if task.get("priority") == priority
        ]
        cleanup_counts.append(
            {
                "priority": priority,
                "tasks": len(tasks),
                "areas": ", ".join(sorted({task["area"] for task in tasks})),
            }
        )

    p0_design_counts = [
        {
            "queue": "deterministic_identity_rules",
            "items": len(p0_design.get("deterministic_identity_rules", [])),
        },
        {
            "queue": "manual_alias_review_candidates",
            "items": len(p0_design.get("manual_alias_review_candidates", [])),
        },
        {
            "queue": "equivalent_pathway_tasks",
            "items": len(p0_design.get("equivalent_pathway_tasks", [])),
        },
    ]

    candidate_counts = [
        {
            "file": file["name"],
            "current_rows": file.get("current_record_count"),
            "candidate_rows": file.get("candidate_record_count"),
            "hashes_equal": bool(file.get("hashes_equal")),
            "fields_equal": bool(file.get("field_sets_equal")),
            "changed_samples": len(file.get("changed_record_samples", [])),
        }
        for file in candidate.get("files", [])
    ]

    gate_checks = gate.get("checks", [])
    gate_counts: list[dict[str, int | str | bool]]
    gate_counts = (
        [
            {
                "gate_passed": bool(gate.get("passed")),
                "blockers": sum(
                    1 for check in gate_checks if check.get("status") == "blocker"
                ),
                "expected": sum(
                    1 for check in gate_checks if check.get("status") == "expected"
                ),
                "checks": len(gate_checks),
            }
        ]
        if gate
        else []
    )

    completed_notebooks = [
        {
            "notebook": "01_inventory.py",
            "question": "What data files, rows, and columns do we have?",
            "report": "reports/latest/inventory.md",
        },
        {
            "notebook": "02_source_overlap.py",
            "question": "Which sources share institution/programme identities?",
            "report": "reports/latest/source-overlap.md",
        },
    ]
    if aliases:
        completed_notebooks.append(
            {
                "notebook": "03_identity_aliases.py",
                "question": (
                    "Which names are candidate aliases when exact matching fails?"
                ),
                "report": "reports/latest/identity-aliases.md",
            }
        )
    if features:
        completed_notebooks.append(
            {
                "notebook": "04_feature_readiness.py",
                "question": "Which product fields are strong, partial, or weak?",
                "report": "reports/latest/feature-readiness.md",
            }
        )
    if cleanup:
        completed_notebooks.append(
            {
                "notebook": "05_cleanup_plan.py",
                "question": "Which cleanup tasks should happen before replacement?",
                "report": "reports/latest/cleanup-plan.md",
            }
        )
    if p0_design:
        completed_notebooks.append(
            {
                "notebook": "06_p0_cleanup_design.py",
                "question": "Which P0 work becomes code, review files, and tests?",
                "report": "reports/latest/p0-cleanup-design.md",
            }
        )
    if candidate:
        completed_notebooks.append(
            {
                "notebook": "07_candidate_export.py",
                "question": "Can Python produce candidate outputs under the contract?",
                "report": "reports/latest/candidate-vs-current.md",
            }
        )
    if gate:
        completed_notebooks.append(
            {
                "notebook": "08_candidate_gate.py",
                "question": "Are candidate outputs safe to treat as compatible?",
                "report": "reports/latest/candidate-gate.md",
            }
        )

    return StatusSnapshot(
        current_goal=(
            "Build a production Marimo/Python analysis workbench before replacing "
            "the current data export pipeline."
        ),
        current_question=(
            "Are candidate processed outputs safe to treat as production-compatible?"
        ),
        short_answer=(
            "The candidate gate now blocks unexplained differences and requires "
            "intentional changes to be listed with reasons."
        ),
        next_question=(
            "Which transformation slice should replace copy-through first while "
            "keeping the processed-data contract stable?"
        ),
        next_notebook="notebooks/09_transform_slice_identity.py",
        data_counts=data_counts,
        source_counts=source_counts,
        alias_counts=alias_counts,
        feature_counts=feature_counts,
        cleanup_counts=cleanup_counts,
        p0_design_counts=p0_design_counts,
        candidate_counts=candidate_counts,
        gate_counts=gate_counts,
        key_findings=[
            "Inventory is in place: we can see files, row counts, and columns.",
            "Exact source overlap is now measurable instead of guessed.",
            "Canonical pathway data connects to processed data better than the "
            "TCU extraction and logo enrichment sources do.",
            "Alias candidates show campus suffixes, location suffixes, "
            "abbreviations, and title punctuation need explicit handling.",
            "Programme alias candidates must include institution context; programme "
            "title alone is too noisy.",
            "Feature readiness shows search coverage is strongest while contact, "
            "application, and logo coverage are weak.",
            "Cleanup planning now separates P0 blockers from enrichment backlog.",
            "P0 design separates safe deterministic identity work from manual "
            "alias review and equivalent-pathway parser/test work.",
            "Candidate export comparison gives us a regression gate before "
            "changing production processed outputs.",
            "Candidate gate separates unexpected blockers from explained "
            "expected differences before any transformation slice changes.",
        ],
        risks=[
            "Merging before alias analysis can duplicate institutions.",
            "Weak identity matching can attach programmes, requirements, or logos "
            "to the wrong institution.",
            "Coverage numbers can look misleading until source overlap is clear.",
            "Contact/application features need fallbacks because many institutions "
            "lack website, email, phone, and application URLs.",
        ],
        completed_notebooks=completed_notebooks,
    )


def progress_bar_html(rows: list[dict[str, int | str]]) -> str:
    max_rows = max((int(row["rows"]) for row in rows), default=1)
    blocks = []
    for row in rows:
        count = int(row["rows"])
        width = 0 if max_rows == 0 else round((count / max_rows) * 100, 1)
        blocks.append(
            f"""
            <div class="bar-row">
              <div class="bar-label">{row["group"]}</div>
              <div class="bar-track">
                <div class="bar-fill" style="width: {width}%"></div>
              </div>
              <div class="bar-value">{count:,}</div>
            </div>
            """
        )

    return (
        """
        <style>
          .bars { display: grid; gap: 8px; max-width: 720px; }
          .bar-row {
            display: grid;
            grid-template-columns: 96px minmax(140px, 1fr) 88px;
            align-items: center;
            gap: 10px;
            font-size: 14px;
          }
          .bar-label { font-weight: 600; }
          .bar-track {
            height: 10px;
            background: #e5e7eb;
            border-radius: 999px;
            overflow: hidden;
          }
          .bar-fill { height: 100%; background: #2563eb; }
          .bar-value { text-align: right; color: #374151; }
        </style>
        <div class="bars">
        """
        + "\n".join(blocks)
        + "</div>"
    )
