import json
from pathlib import Path
from typing import Any

from kozi_analysis.candidate_export import CandidateComparisonReport, FileComparison
from kozi_analysis.candidate_gate import (
    ExpectedChange,
    evaluate_candidate_gate,
    load_expected_changes,
)
from kozi_analysis.reporting import render_candidate_gate_markdown


def comparison_file(**overrides: Any) -> FileComparison:
    values: dict[str, Any] = {
        "name": "institutions.jsonl",
        "current_exists": True,
        "candidate_exists": True,
        "hashes_equal": True,
        "current_hash": "current",
        "candidate_hash": "current",
        "current_record_count": 1,
        "candidate_record_count": 1,
        "field_sets_equal": True,
        "current_fields": ["normalizedInstitutionName"],
        "candidate_fields": ["normalizedInstitutionName"],
        "blank_key_count": 0,
        "needs_review_distribution_equal": True,
        "manual_review_queue_distribution_equal": True,
        "source_datasets_distribution_equal": True,
        "applicant_pathway_distribution_equal": True,
        "parse_status_distribution_equal": True,
        "changed_record_samples": [],
    }
    values.update(overrides)
    return FileComparison(**values)


def test_candidate_gate_passes_clean_comparison() -> None:
    report = CandidateComparisonReport(copied_files=[], files=[comparison_file()])
    gate = evaluate_candidate_gate(report)
    markdown = render_candidate_gate_markdown(gate)

    assert gate.passed
    assert gate.blocker_count == 0
    assert "Candidate Export Gate" in markdown


def test_candidate_gate_blocks_unexpected_differences() -> None:
    report = CandidateComparisonReport(
        copied_files=[],
        files=[
            comparison_file(
                hashes_equal=False,
                changed_record_samples=["ardhi university"],
            )
        ],
    )
    gate = evaluate_candidate_gate(report)

    assert not gate.passed
    assert {
        (check.check, check.status)
        for check in gate.checks
        if check.status == "blocker"
    } == {("hash", "blocker"), ("changed_records", "blocker")}


def test_candidate_gate_allows_explained_differences() -> None:
    report = CandidateComparisonReport(
        copied_files=[],
        files=[
            comparison_file(
                hashes_equal=False,
                changed_record_samples=["ardhi university"],
            )
        ],
    )
    gate = evaluate_candidate_gate(
        report,
        [
            ExpectedChange(
                file="institutions.jsonl",
                check="hash",
                reason="Identity normalization intentionally rewrites records.",
            ),
            ExpectedChange(
                file="institutions.jsonl",
                check="changed_records",
                reason="Identity normalization intentionally rewrites records.",
            ),
        ],
    )

    assert gate.passed
    assert gate.blocker_count == 0
    assert gate.expected_count == 2


def test_load_expected_changes_ignores_incomplete_entries(tmp_path: Path) -> None:
    path = tmp_path / "expected.json"
    path.write_text(
        json.dumps(
            {
                "expected_changes": [
                    {
                        "file": "institutions.jsonl",
                        "check": "hash",
                        "reason": "Intentional rewrite.",
                    },
                    {"file": "programmes.jsonl", "check": "hash"},
                ]
            }
        ),
        encoding="utf-8",
    )

    expected_changes = load_expected_changes(path)

    assert expected_changes == [
        ExpectedChange(
            file="institutions.jsonl",
            check="hash",
            reason="Intentional rewrite.",
        )
    ]
