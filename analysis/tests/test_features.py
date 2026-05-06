from pathlib import Path

from kozi_analysis.features import build_feature_readiness_report, value_present
from kozi_analysis.reporting import render_feature_readiness_markdown


def test_value_present_treats_unknown_strings_as_missing() -> None:
    assert value_present("Dar es Salaam")
    assert not value_present("")
    assert not value_present("unknown")
    assert value_present(["degree"])
    assert not value_present([])


def test_build_feature_readiness_report_on_minimal_processed_data(
    tmp_path: Path,
) -> None:
    processed = tmp_path / "data/processed"
    processed.mkdir(parents=True)
    (processed / "institutions.jsonl").write_text(
        '{"institutionName":"Example University","region":"Dar es Salaam",'
        '"website":"https://example.test","ownershipType":"public",'
        '"institutionType":"university","programmeCount":1,'
        '"awardLevels":["degree"]}\n',
        encoding="utf-8",
    )
    (processed / "programmes.jsonl").write_text(
        '{"programmeName":"Medicine","institutionName":"Example University",'
        '"searchText":"medicine health","fieldCategory":"health",'
        '"acceptsFormSix":"yes","acceptsDiploma":"yes",'
        '"acceptsCertificate":"no","acceptsEquivalent":"unknown",'
        '"acceptsFormFourDirect":"no"}\n',
        encoding="utf-8",
    )
    (processed / "entry-requirements.jsonl").write_text(
        '{"programmeName":"Medicine","institutionName":"Example University",'
        '"rawRequirementText":"Two principal passes"}\n',
        encoding="utf-8",
    )
    (processed / "requirement-rules.jsonl").write_text(
        '{"programmeName":"Medicine","institutionName":"Example University",'
        '"variants":[{"type":"structured"}]}\n',
        encoding="utf-8",
    )

    report = build_feature_readiness_report(tmp_path)
    markdown = render_feature_readiness_markdown(report)

    assert report.field_coverages
    assert any(coverage.status == "weak" for coverage in report.field_coverages)
    assert "Feature Readiness" in markdown
    assert "Field Coverage" in markdown
