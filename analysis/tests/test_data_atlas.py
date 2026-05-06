import json
from pathlib import Path

from kozi_analysis.data_atlas import (
    build_data_atlas_report,
    institution_category,
    is_campus_like,
    requirement_intensity,
)
from kozi_analysis.reporting import render_data_atlas_markdown


def write_jsonl(path: Path, records: list[dict[str, object]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        "\n".join(json.dumps(record) for record in records) + "\n",
        encoding="utf-8",
    )


def test_institution_category_uses_regulator_and_type() -> None:
    assert (
        institution_category(
            {"regulator": "TCU", "institutionType": "Higher Education Institution"}
        )
        == "university / higher education"
    )
    assert (
        institution_category(
            {"regulator": "VETA", "institutionType": "Vocational centre"}
        )
        == "vocational centre"
    )


def test_campus_like_detects_branch_and_hyphen_location() -> None:
    assert is_campus_like({"institutionName": "Institute - Dodoma Campus"})
    assert is_campus_like({"institutionName": "Institute - Arusha"})
    assert not is_campus_like({"institutionName": "Aga Khan University"})


def test_requirement_intensity_scores_programme_signals() -> None:
    row = requirement_intensity(
        {
            "institutionName": "Example University",
            "programmeName": "Doctor of Medicine",
            "fieldCategory": "health",
            "awardLevel": "degree",
            "requiredSubjects": "Biology; Chemistry; Physics",
            "minimumEntryRequirements": (
                "Three principal passes with minimum of 6 points and C grade."
            ),
        }
    )

    assert row.score >= 10
    assert "degree-level award" in row.reasons
    assert "principal pass requirement" in row.reasons


def test_build_data_atlas_report_answers_core_questions(tmp_path: Path) -> None:
    write_jsonl(
        tmp_path / "data/processed/institutions.jsonl",
        [
            {
                "institutionName": "Aga Khan University",
                "regulator": "TCU",
                "institutionType": "Higher Education Institution",
                "region": "Dar es Salaam",
                "needsReview": False,
                "reviewReasons": [],
            },
            {
                "institutionName": "Institute of Finance - Dodoma Campus",
                "regulator": "NACTVET",
                "institutionType": "Technical Institution",
                "region": "Dodoma",
                "needsReview": True,
                "reviewReasons": ["missing_registration_number"],
            },
        ],
    )
    write_jsonl(
        tmp_path / "data/processed/programmes.jsonl",
        [
            {
                "institutionName": "Aga Khan University",
                "programmeName": "Bachelor of Medicine",
                "awardLevel": "degree",
                "fieldCategory": "health",
                "courseFamily": "health",
                "region": "Dar es Salaam",
                "minimumEntryRequirements": (
                    "Three principal passes with minimum of 6 points."
                ),
                "requiredSubjects": "Biology; Chemistry; Physics",
                "acceptsFormFourDirect": "no",
                "acceptsFormSix": "yes",
                "acceptsCertificate": "no",
                "acceptsDiploma": "yes",
                "acceptsEquivalent": "yes",
                "needsReview": False,
                "reviewReasons": [],
            },
            {
                "institutionName": "Institute of Finance - Dodoma Campus",
                "programmeName": "Ordinary Diploma in Accounting",
                "awardLevel": "ordinary diploma",
                "fieldCategory": "business finance management",
                "courseFamily": "business",
                "campusLocation": "Dodoma",
                "acceptsFormFourDirect": "yes",
                "acceptsFormSix": "yes",
                "acceptsCertificate": "yes",
                "acceptsDiploma": "no",
                "acceptsEquivalent": "no",
                "needsReview": True,
                "reviewReasons": ["missing_requirements"],
            },
        ],
    )

    report = build_data_atlas_report(tmp_path, top_n=5)
    markdown = render_data_atlas_markdown(report)

    assert report.headline["listed_institutions"] == 2
    assert report.headline["campus_like_institutions"] == 1
    assert report.headline["programmes"] == 2
    assert report.field_categories[0].label in {
        "business finance management",
        "health",
    }
    assert any(
        row.label == "Form Six" and row.count == 2 for row in report.applicant_pathways
    )
    assert "Data Atlas" in markdown
