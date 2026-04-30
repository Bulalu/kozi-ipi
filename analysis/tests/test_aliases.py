from pathlib import Path

from kozi_analysis.aliases import (
    IdentityRecord,
    acronym_for_tokens,
    build_alias_report,
    candidate_matches,
    tokenize_name,
)
from kozi_analysis.reporting import render_alias_markdown


def test_tokenize_name_normalizes_common_punctuation() -> None:
    assert tokenize_name("Ardhi University (ARU), Dar es Salaam") == (
        "ardhi",
        "university",
        "aru",
        "dar",
        "es",
        "salaam",
    )


def test_acronym_ignores_common_structure_words() -> None:
    assert acronym_for_tokens(("institute", "of", "finance", "management")) == "fm"


def test_candidate_matches_find_name_containment() -> None:
    left = IdentityRecord(
        source="left",
        record_type="institution",
        name="Ardhi University",
        context="",
        normalized_name="ardhi university",
        tokens=("ardhi", "university"),
        acronym="a",
    )
    right = IdentityRecord(
        source="right",
        record_type="institution",
        name="Ardhi University ARU Dar es Salaam",
        context="",
        normalized_name="ardhi university aru dar es salaam",
        tokens=("ardhi", "university", "aru", "dar", "es", "salaam"),
        acronym="aas",
    )

    candidates = candidate_matches([left], [right], min_score=0.72, max_examples=5)

    assert len(candidates) == 1
    assert candidates[0].score >= 0.9
    assert candidates[0].reason == "one name mostly contains the other"


def test_build_alias_report_on_realistic_minimal_repo(tmp_path: Path) -> None:
    data_root = tmp_path / "data"
    _write_minimal_sources(data_root)

    report = build_alias_report(tmp_path, min_score=0.72, max_examples=5)
    markdown = render_alias_markdown(report)

    assert report.institution_pairs
    assert report.programme_pairs
    assert "Identity Aliases" in markdown
    assert any(pair.candidate_count > 0 for pair in report.institution_pairs)


def _write_minimal_sources(data_root: Path) -> None:
    rows = {
        "raw/tanzania-education-pathways-dataset/institutions.csv": (
            "institution_name,normalized_institution_name,registration_number,regulator\n"
            "Ardhi University,ardhi university,REG1,TCU\n"
        ),
        "raw/tanzania-education-pathways-dataset/institution_enrichment.csv": (
            "institution_name,normalized_institution_name,website,logo_status\n"
            "Ardhi University,ardhi university,https://aru.test,verified\n"
        ),
        "raw/tanzania-post-form-four-dataset/institutions.csv": (
            "institution_name,normalized_institution_name,registration_number,regulator\n"
            "Fallback College,fallback college,,NACTVET\n"
        ),
        "raw/tanzania-education-dataset/institutions.csv": (
            "institution_name,registration_number,region\n"
            "Ardhi University,REG1,Dar es Salaam\n"
        ),
        "enrichment/institution-logos.seed.csv": (
            "institution_name,normalized_institution_name,logo_status,website\n"
            "Ardhi University ARU,ardhi university aru,verified,https://aru.test\n"
        ),
        "extracted/tcu-secondary-guidebook-2025-2026-programmes.csv": (
            "institutionName,normalizedInstitutionName,programmeName,"
            "normalizedProgrammeName,programmeCode,page,sourcePdf\n"
            "Ardhi University ARU Dar es Salaam,ardhi university aru dar es salaam,"
            "Bachelor of Architecture,bachelor of architecture,AR001,1,file.pdf\n"
        ),
        "raw/tanzania-education-pathways-dataset/programmes.csv": (
            "programme_name,normalized_programme_name,institution_name,"
            "normalized_institution_name,programme_code\n"
            "Bachelor of Architecture,bachelor of architecture,Ardhi University,"
            "ardhi university,AR001\n"
        ),
        "raw/tanzania-education-pathways-dataset/entry_requirements.csv": (
            "programme_name,normalized_programme_name,institution_name,"
            "normalized_institution_name,raw_requirement_text\n"
            "Bachelor of Architecture,bachelor of architecture,Ardhi University,"
            "ardhi university,Two principals\n"
        ),
        "raw/tanzania-post-form-four-dataset/programmes.csv": (
            "programme_name,normalized_programme_name,institution_name,award_level\n"
            "Nursing,nursing,Fallback College,diploma\n"
        ),
        "raw/tanzania-education-dataset/programmes.csv": (
            "programme_name,normalized_programme_name,institution_name,award_level\n"
            "Basic Nursing,basic nursing,Fallback College,diploma\n"
        ),
        "processed/institutions.jsonl": (
            '{"institutionName":"Ardhi University",'
            '"normalizedInstitutionName":"ardhi university",'
            '"regulator":"TCU","sourceDatasets":["education_pathways"]}\n'
        ),
        "processed/programmes.jsonl": (
            '{"programmeName":"Bachelor of Architecture",'
            '"normalizedProgrammeName":"bachelor of architecture",'
            '"institutionName":"Ardhi University",'
            '"normalizedInstitutionName":"ardhi university"}\n'
        ),
        "processed/entry-requirements.jsonl": (
            '{"programmeName":"Bachelor of Architecture",'
            '"normalizedProgrammeName":"bachelor of architecture",'
            '"institutionName":"Ardhi University",'
            '"normalizedInstitutionName":"ardhi university",'
            '"rawRequirementText":"Two principals"}\n'
        ),
        "processed/requirement-rules.jsonl": (
            '{"programmeName":"Bachelor of Architecture",'
            '"normalizedProgrammeName":"bachelor of architecture",'
            '"institutionName":"Ardhi University",'
            '"normalizedInstitutionName":"ardhi university",'
            '"programmeKey":"architecture"}\n'
        ),
    }

    for relative_path, contents in rows.items():
        path = data_root / relative_path
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(contents, encoding="utf-8")
