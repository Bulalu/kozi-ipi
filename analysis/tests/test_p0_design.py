import json
from pathlib import Path

from kozi_analysis.p0_design import (
    build_p0_cleanup_design,
    is_safe_deterministic_example,
)
from kozi_analysis.reporting import render_p0_cleanup_design_markdown


def test_safe_deterministic_example_accepts_exact_normalized_name() -> None:
    assert is_safe_deterministic_example(
        {
            "left_name": "Ardhi University (ARU)",
            "right_name": "Ardhi University (ARU)",
            "left_context": "TCU",
            "right_context": "TCU",
            "reason": "exact normalized name",
        }
    )


def test_safe_deterministic_example_rejects_campus_marker() -> None:
    assert not is_safe_deterministic_example(
        {
            "left_name": "Institute of Accountancy Arusha (IAA)",
            "right_name": "Institute of Accountancy Arusha (IAA), Dar es Salaam Campus",
            "left_context": "TCU",
            "right_context": "TCU",
            "reason": "one name mostly contains the other",
        }
    )


def test_build_p0_cleanup_design_splits_queues(tmp_path: Path) -> None:
    report_dir = tmp_path / "reports"
    report_dir.mkdir()
    (report_dir / "identity-aliases.json").write_text(
        json.dumps(
            {
                "institution_pairs": [
                    {
                        "examples": [
                            {
                                "left_name": "Ardhi University (ARU)",
                                "right_name": "Ardhi University (ARU)",
                                "left_context": "TCU",
                                "right_context": "TCU",
                                "reason": "exact normalized name",
                            },
                            {
                                "left_name": "Institute of Accountancy Arusha (IAA)",
                                "right_name": (
                                    "Institute of Accountancy Arusha (IAA), "
                                    "Dar es Salaam Campus"
                                ),
                                "left_context": "TCU",
                                "right_context": "TCU",
                                "reason": "one name mostly contains the other",
                            },
                        ]
                    }
                ]
            }
        ),
        encoding="utf-8",
    )
    (report_dir / "cleanup-plan.json").write_text(
        json.dumps(
            {
                "tasks": [
                    {
                        "title": "Improve programmes.acceptsEquivalent",
                        "evidence": "programmes.acceptsEquivalent has weak coverage",
                    }
                ]
            }
        ),
        encoding="utf-8",
    )

    report = build_p0_cleanup_design(report_dir)
    markdown = render_p0_cleanup_design_markdown(report)

    assert len(report.deterministic_identity_rules) == 1
    assert len(report.manual_alias_review_candidates) == 1
    assert len(report.equivalent_pathway_tasks) == 2
    assert "P0 Cleanup Design" in markdown
