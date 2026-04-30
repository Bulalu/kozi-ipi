import json
from pathlib import Path

from kozi_analysis.cleanup import build_cleanup_plan
from kozi_analysis.reporting import render_cleanup_plan_markdown


def test_build_cleanup_plan_from_existing_reports(tmp_path: Path) -> None:
    report_dir = tmp_path / "reports"
    report_dir.mkdir()
    (report_dir / "identity-aliases.json").write_text(
        json.dumps(
            {
                "institution_pairs": [
                    {"candidate_count": 3, "high_confidence_count": 2}
                ],
                "programme_pairs": [{"candidate_count": 2, "high_confidence_count": 1}],
            }
        ),
        encoding="utf-8",
    )
    (report_dir / "feature-readiness.json").write_text(
        json.dumps(
            {
                "field_coverages": [
                    {
                        "dataset": "programmes",
                        "area": "eligibility",
                        "field": "acceptsEquivalent",
                        "coverage_percent": 40.0,
                        "status": "weak",
                        "required_for": "pathway-aware labels",
                    },
                    {
                        "dataset": "programmes",
                        "area": "search",
                        "field": "searchText",
                        "coverage_percent": 100.0,
                        "status": "strong",
                        "required_for": "lexical search",
                    },
                ]
            }
        ),
        encoding="utf-8",
    )
    (report_dir / "source-overlap.json").write_text(
        json.dumps(
            {
                "institution_overlaps": [
                    {"jaccard": 0.01, "shared_count": 2},
                    {"jaccard": 0.5, "shared_count": 5},
                ]
            }
        ),
        encoding="utf-8",
    )

    report = build_cleanup_plan(report_dir)
    markdown = render_cleanup_plan_markdown(report)

    assert report.tasks
    assert report.tasks[0].priority == "P0"
    assert "Cleanup Plan" in markdown
    assert "acceptsEquivalent" in markdown
