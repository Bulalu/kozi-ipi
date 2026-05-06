from pathlib import Path

from kozi_analysis.overlap import (
    SourceDefinition,
    build_source_overlap,
    compare_key_sets,
    normalize_identity,
    source_key,
)
from kozi_analysis.reporting import render_source_overlap_markdown


def test_normalize_identity_removes_case_and_punctuation() -> None:
    assert normalize_identity("ABDULRAHMAN AL- SUMAIT UNIVERSITY") == (
        "abdulrahman al sumait university"
    )
    assert normalize_identity("A & B College") == "a and b college"


def test_source_key_uses_institution_and_programme_for_programmes() -> None:
    source = SourceDefinition(
        name="test_programmes",
        path="programmes.csv",
        file_kind="csv",
        record_type="programme",
        key_fields=("programme_name", "institution_name"),
        display_fields=("programme_name", "institution_name"),
    )

    key = source_key(
        source,
        {
            "programme_name": "Bachelor of Medicine",
            "institution_name": "Example University",
        },
    )

    assert key == "example university :: bachelor of medicine"


def test_compare_key_sets_counts_overlap() -> None:
    overlap = compare_key_sets("left", {"a", "b"}, "right", {"b", "c"})

    assert overlap.shared_count == 1
    assert overlap.left_only_count == 1
    assert overlap.right_only_count == 1
    assert overlap.jaccard == 0.3333


def test_build_source_overlap_on_minimal_repo(tmp_path: Path) -> None:
    data_root = tmp_path / "data"
    (data_root / "raw/tanzania-education-pathways-dataset").mkdir(parents=True)
    (data_root / "raw/tanzania-post-form-four-dataset").mkdir(parents=True)
    (data_root / "raw/tanzania-education-dataset").mkdir(parents=True)
    (data_root / "enrichment").mkdir(parents=True)
    (data_root / "extracted").mkdir(parents=True)
    (data_root / "processed").mkdir(parents=True)

    write = _writer(data_root)
    write(
        "raw/tanzania-education-pathways-dataset/institutions.csv",
        "institution_name,normalized_institution_name,registration_number,regulator\n"
        "Example University,example university,REG1,TCU\n",
    )
    write(
        "raw/tanzania-education-pathways-dataset/institution_enrichment.csv",
        "institution_name,normalized_institution_name,website,logo_status\n"
        "Example University,example university,https://example.test,verified\n",
    )
    write(
        "raw/tanzania-post-form-four-dataset/institutions.csv",
        "institution_name,normalized_institution_name,registration_number,regulator\n"
        "Fallback College,fallback college,,NACTVET\n",
    )
    write(
        "raw/tanzania-education-dataset/institutions.csv",
        "institution_name,registration_number,region\n"
        "Example University,REG1,Dar es Salaam\n",
    )
    write(
        "enrichment/institution-logos.seed.csv",
        "institution_name,normalized_institution_name,logo_status,website\n"
        "Example University,example university,verified,https://example.test\n",
    )
    write(
        "extracted/tcu-secondary-guidebook-2025-2026-programmes.csv",
        "institutionName,normalizedInstitutionName,programmeName,"
        "normalizedProgrammeName,programmeCode,page,sourcePdf\n"
        "Example University,example university,Medicine,medicine,EX001,1,file.pdf\n",
    )
    write(
        "raw/tanzania-education-pathways-dataset/programmes.csv",
        "programme_name,normalized_programme_name,institution_name,"
        "normalized_institution_name,programme_code\n"
        "Medicine,medicine,Example University,example university,EX001\n",
    )
    write(
        "raw/tanzania-education-pathways-dataset/entry_requirements.csv",
        "programme_name,normalized_programme_name,institution_name,"
        "normalized_institution_name,raw_requirement_text\n"
        "Medicine,medicine,Example University,example university,Two principals\n",
    )
    write(
        "raw/tanzania-post-form-four-dataset/programmes.csv",
        "programme_name,normalized_programme_name,institution_name,award_level\n"
        "Nursing,nursing,Fallback College,diploma\n",
    )
    write(
        "raw/tanzania-education-dataset/programmes.csv",
        "programme_name,normalized_programme_name,institution_name,award_level\n"
        "Medicine,medicine,Example University,degree\n",
    )
    write(
        "processed/institutions.jsonl",
        '{"institutionName":"Example University",'
        '"normalizedInstitutionName":"example university",'
        '"regulator":"TCU","sourceDatasets":["education_pathways"]}\n',
    )
    write(
        "processed/programmes.jsonl",
        '{"programmeName":"Medicine","normalizedProgrammeName":"medicine",'
        '"institutionName":"Example University",'
        '"normalizedInstitutionName":"example university"}\n',
    )
    write(
        "processed/entry-requirements.jsonl",
        '{"programmeName":"Medicine","normalizedProgrammeName":"medicine",'
        '"institutionName":"Example University",'
        '"normalizedInstitutionName":"example university",'
        '"rawRequirementText":"Two principals"}\n',
    )
    write(
        "processed/requirement-rules.jsonl",
        '{"programmeName":"Medicine","normalizedProgrammeName":"medicine",'
        '"institutionName":"Example University",'
        '"normalizedInstitutionName":"example university","programmeKey":"medicine"}\n',
    )

    report = build_source_overlap(tmp_path)
    markdown = render_source_overlap_markdown(report)

    assert len(report.institution_sources) == 7
    assert len(report.programme_sources) == 8
    assert "raw_pathways_institutions" in markdown
    assert "Programme Pair Overlap" in markdown


def _writer(data_root: Path):
    def write(relative_path: str, contents: str) -> None:
        path = data_root / relative_path
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(contents, encoding="utf-8")

    return write
