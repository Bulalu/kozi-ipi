import json
from pathlib import Path

from kozi_analysis.identity_transform import (
    build_identity_transform_slice,
    institution_identity_key,
    write_jsonl_records,
)
from kozi_analysis.reporting import render_identity_transform_markdown


def test_write_jsonl_records_matches_current_compact_contract(tmp_path: Path) -> None:
    records = [
        {
            "institutionName": "St. John’s University of Tanzania (SJUT)",
            "normalizedInstitutionName": "st john s tanzania",
            "sourceDatasets": ["education_pathways", "post_form_four"],
        }
    ]
    path = tmp_path / "institutions.jsonl"

    write_jsonl_records(path, records)

    assert path.read_text(encoding="utf-8") == (
        json.dumps(records[0], ensure_ascii=False, separators=(",", ":")) + "\n"
    )


def test_institution_identity_key_falls_back_to_name() -> None:
    assert (
        institution_identity_key(
            {
                "institutionName": "Aga Khan University (AKU)",
                "normalizedInstitutionName": "",
            }
        )
        == "aga khan university aku"
    )


def test_build_identity_transform_slice_rewrites_institutions(tmp_path: Path) -> None:
    processed_dir = tmp_path / "data/processed"
    processed_dir.mkdir(parents=True)
    records = [
        {
            "institutionName": "Institute of Finance Management - Zanzibar",
            "normalizedInstitutionName": "finance management zanzibar",
        },
        {
            "institutionName": "Institute of Finance Management - Zanzibar",
            "normalizedInstitutionName": "finance management zanzibar",
        },
    ]
    write_jsonl_records(processed_dir / "institutions.jsonl", records)

    report = build_identity_transform_slice(
        tmp_path,
        tmp_path / "analysis/build/candidate-processed",
        copy_current=False,
    )
    markdown = render_identity_transform_markdown(report)

    assert report.input_count == 2
    assert report.output_count == 2
    assert report.blank_identity_count == 0
    assert report.duplicate_identity_count == 2
    assert report.duplicate_identity_examples == ["finance management zanzibar"]
    assert "Identity Transform Slice" in markdown
