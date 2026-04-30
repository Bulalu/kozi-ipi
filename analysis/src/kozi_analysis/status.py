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

    return StatusSnapshot(
        current_goal=(
            "Build a production Marimo/Python analysis workbench before replacing "
            "the current data export pipeline."
        ),
        current_question=(
            "Which identity aliases look safe enough to inspect before production "
            "cleaning?"
        ),
        short_answer=(
            "We now have review queues for institution and programme alias "
            "candidates. These are evidence for humans, not automatic merge rules."
        ),
        next_question=(
            "Which fields are missing or weak for search, eligibility, location, "
            "contact, and application workflows?"
        ),
        next_notebook="notebooks/04_feature_readiness.py",
        data_counts=data_counts,
        source_counts=source_counts,
        alias_counts=alias_counts,
        key_findings=[
            "Inventory is in place: we can see files, row counts, and columns.",
            "Exact source overlap is now measurable instead of guessed.",
            "Canonical pathway data connects to processed data better than the "
            "TCU extraction and logo enrichment sources do.",
            "Alias candidates show campus suffixes, location suffixes, "
            "abbreviations, and title punctuation need explicit handling.",
            "Programme alias candidates must include institution context; programme "
            "title alone is too noisy.",
        ],
        risks=[
            "Merging before alias analysis can duplicate institutions.",
            "Weak identity matching can attach programmes, requirements, or logos "
            "to the wrong institution.",
            "Coverage numbers can look misleading until source overlap is clear.",
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
