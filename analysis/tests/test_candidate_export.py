import json
from collections.abc import Mapping
from pathlib import Path
from typing import Any

from kozi_analysis.candidate_export import build_candidate_comparison
from kozi_analysis.reporting import render_candidate_comparison_markdown


def write_jsonl(path: Path, records: list[Mapping[str, Any]]) -> None:
    path.write_text(
        "\n".join(json.dumps(record, sort_keys=True) for record in records) + "\n",
        encoding="utf-8",
    )


def test_copy_through_candidate_export_matches_current_processed_files(
    tmp_path: Path,
) -> None:
    processed_dir = tmp_path / "data/processed"
    processed_dir.mkdir(parents=True)

    institution = {
        "normalizedInstitutionName": "ardhi university",
        "needsReview": False,
        "sourceDatasets": ["canonical"],
    }
    programme = {
        "normalizedInstitutionName": "ardhi university",
        "normalizedProgrammeName": "architecture",
        "acceptsFormFourDirect": True,
        "acceptsEquivalent": False,
        "sourceDatasets": ["canonical"],
    }
    requirement = {
        "normalizedInstitutionName": "ardhi university",
        "normalizedProgrammeName": "architecture",
        "sourceDatasets": ["canonical"],
    }
    rule = {
        "institutionKey": "ardhi university",
        "programmeKey": "architecture",
        "variants": [{"parseStatus": "parsed"}],
    }

    write_jsonl(processed_dir / "institutions.jsonl", [institution])
    write_jsonl(processed_dir / "programmes.jsonl", [programme])
    write_jsonl(processed_dir / "entry-requirements.jsonl", [requirement])
    write_jsonl(processed_dir / "requirement-rules.jsonl", [rule])
    (processed_dir / "data-quality-report.json").write_text(
        json.dumps({"summary": {"warnings": 0}}, sort_keys=True),
        encoding="utf-8",
    )

    report = build_candidate_comparison(
        tmp_path,
        tmp_path / "analysis/build/candidate-processed",
        copy_current=True,
    )
    markdown = render_candidate_comparison_markdown(report)

    assert report.copied_files == [
        "institutions.jsonl",
        "programmes.jsonl",
        "entry-requirements.jsonl",
        "requirement-rules.jsonl",
        "data-quality-report.json",
    ]
    assert report.all_hashes_equal
    assert all(file.current_exists and file.candidate_exists for file in report.files)
    assert all(file.changed_record_samples == [] for file in report.files)
    assert all(file.manual_review_queue_distribution_equal for file in report.files)
    assert "Candidate Export Comparison" in markdown


def test_candidate_comparison_reports_changed_samples(tmp_path: Path) -> None:
    processed_dir = tmp_path / "data/processed"
    candidate_dir = tmp_path / "analysis/build/candidate-processed"
    processed_dir.mkdir(parents=True)
    candidate_dir.mkdir(parents=True)

    write_jsonl(
        processed_dir / "institutions.jsonl",
        [{"normalizedInstitutionName": "ardhi university"}],
    )
    write_jsonl(
        candidate_dir / "institutions.jsonl",
        [{"normalizedInstitutionName": "ardhi university", "needsReview": True}],
    )

    report = build_candidate_comparison(
        tmp_path,
        candidate_dir,
        copy_current=False,
    )

    institution_report = next(
        file for file in report.files if file.name == "institutions.jsonl"
    )
    assert not report.all_hashes_equal
    assert institution_report.changed_record_samples == ["ardhi university"]


def test_candidate_comparison_does_not_pass_when_files_are_missing(
    tmp_path: Path,
) -> None:
    report = build_candidate_comparison(
        tmp_path,
        tmp_path / "analysis/build/candidate-processed",
        copy_current=False,
    )

    assert not report.all_hashes_equal
    assert all(not file.hashes_equal for file in report.files)
