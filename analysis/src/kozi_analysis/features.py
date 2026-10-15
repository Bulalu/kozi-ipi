from __future__ import annotations

import json
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any, Literal

from kozi_analysis.io import jsonl_records

DatasetName = Literal[
    "institutions",
    "programmes",
    "entry_requirements",
    "requirement_rules",
]


@dataclass(frozen=True)
class FieldCheck:
    dataset: DatasetName
    area: str
    field: str
    label: str
    required_for: str


@dataclass(frozen=True)
class FieldCoverage:
    dataset: DatasetName
    area: str
    field: str
    label: str
    required_for: str
    total_records: int
    present_records: int
    coverage_percent: float
    status: str
    missing_examples: list[str]


@dataclass(frozen=True)
class FeatureAreaSummary:
    area: str
    field_count: int
    average_coverage_percent: float
    weak_field_count: int


@dataclass(frozen=True)
class FeatureReadinessReport:
    field_coverages: list[FieldCoverage]
    area_summaries: list[FeatureAreaSummary]

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


FIELD_CHECKS = [
    FieldCheck(
        "programmes",
        "search",
        "searchText",
        "Programme search text",
        "lexical search",
    ),
    FieldCheck(
        "programmes",
        "search",
        "fieldCategory",
        "Field category",
        "structured filters",
    ),
    FieldCheck(
        "programmes",
        "search",
        "courseFamily",
        "Course family",
        "synonyms and browse groups",
    ),
    FieldCheck(
        "programmes",
        "search",
        "careerKeywords",
        "Career keywords",
        "career-goal search",
    ),
    FieldCheck(
        "programmes",
        "search",
        "swahiliKeywords",
        "Swahili keywords",
        "Swahili query support",
    ),
    FieldCheck(
        "programmes",
        "eligibility",
        "minimumEntryRequirements",
        "Minimum entry requirements",
        "eligibility explanations",
    ),
    FieldCheck(
        "programmes",
        "eligibility",
        "acceptsFormFourDirect",
        "Form Four route",
        "pathway-aware labels",
    ),
    FieldCheck(
        "programmes",
        "eligibility",
        "acceptsFormSix",
        "Form Six route",
        "pathway-aware labels",
    ),
    FieldCheck(
        "programmes",
        "eligibility",
        "acceptsCertificate",
        "Certificate route",
        "pathway-aware labels",
    ),
    FieldCheck(
        "programmes",
        "eligibility",
        "acceptsDiploma",
        "Diploma route",
        "pathway-aware labels",
    ),
    FieldCheck(
        "programmes",
        "eligibility",
        "acceptsEquivalent",
        "Equivalent route",
        "pathway-aware labels",
    ),
    FieldCheck(
        "entry_requirements",
        "eligibility",
        "rawRequirementText",
        "Raw requirement text",
        "auditable eligibility source",
    ),
    FieldCheck(
        "requirement_rules",
        "eligibility",
        "variants",
        "Parsed rule variants",
        "rule-based eligibility",
    ),
    FieldCheck(
        "institutions",
        "location",
        "region",
        "Institution region",
        "location filters",
    ),
    FieldCheck(
        "institutions",
        "location",
        "districtOrCouncil",
        "Institution district/council",
        "local browse and disambiguation",
    ),
    FieldCheck(
        "institutions",
        "location",
        "physicalLocation",
        "Physical location",
        "institution details",
    ),
    FieldCheck(
        "programmes",
        "location",
        "campusLocation",
        "Programme campus",
        "programme-level location",
    ),
    FieldCheck(
        "institutions",
        "contact_application",
        "website",
        "Website",
        "institution cards",
    ),
    FieldCheck(
        "institutions",
        "contact_application",
        "email",
        "Email",
        "contact actions",
    ),
    FieldCheck(
        "institutions",
        "contact_application",
        "phoneNumbers",
        "Phone numbers",
        "contact actions",
    ),
    FieldCheck(
        "institutions",
        "contact_application",
        "applicationUrl",
        "Application URL",
        "application actions",
    ),
    FieldCheck(
        "programmes",
        "contact_application",
        "applicationLink",
        "Programme application link",
        "programme application actions",
    ),
    FieldCheck(
        "institutions",
        "institution_cards",
        "logoUrl",
        "Logo URL",
        "institution cards",
    ),
    FieldCheck(
        "institutions",
        "institution_cards",
        "ownershipType",
        "Ownership type",
        "institution cards and filters",
    ),
    FieldCheck(
        "institutions",
        "institution_cards",
        "institutionType",
        "Institution type",
        "institution cards and filters",
    ),
    FieldCheck(
        "institutions",
        "institution_cards",
        "programmeCount",
        "Programme count",
        "institution cards",
    ),
    FieldCheck(
        "institutions",
        "institution_cards",
        "awardLevels",
        "Award levels",
        "institution cards and browse",
    ),
]


DATASET_PATHS: dict[DatasetName, str] = {
    "institutions": "data/processed/institutions.jsonl",
    "programmes": "data/processed/programmes.jsonl",
    "entry_requirements": "data/processed/entry-requirements.jsonl",
    "requirement_rules": "data/processed/requirement-rules.jsonl",
}


def value_present(value: object) -> bool:
    if value is None:
        return False
    if isinstance(value, str):
        return bool(value.strip()) and value.strip().lower() not in {"unknown", "n/a"}
    if isinstance(value, list | tuple | set):
        return len(value) > 0
    if isinstance(value, dict):
        return len(value) > 0
    return True


def record_label(record: dict[str, Any]) -> str:
    programme = record.get("programmeName") or record.get("programme_name")
    institution = record.get("institutionName") or record.get("institution_name")
    if programme and institution:
        return f"{institution} :: {programme}"
    if institution:
        return str(institution)
    if programme:
        return str(programme)
    return json.dumps(record, sort_keys=True)[:120]


def status_for_coverage(percent: float) -> str:
    if percent >= 80:
        return "strong"
    if percent >= 50:
        return "partial"
    return "weak"


def load_processed_datasets(repo_root: Path) -> dict[DatasetName, list[dict[str, Any]]]:
    return {
        dataset: list(jsonl_records(repo_root / path))
        for dataset, path in DATASET_PATHS.items()
    }


def coverage_for_check(
    check: FieldCheck,
    records: list[dict[str, Any]],
    max_examples: int,
) -> FieldCoverage:
    total_records = len(records)
    missing_examples: list[str] = []
    present_records = 0

    for record in records:
        if value_present(record.get(check.field)):
            present_records += 1
        elif len(missing_examples) < max_examples:
            missing_examples.append(record_label(record))

    percent = round((present_records / total_records) * 100, 2) if total_records else 0
    return FieldCoverage(
        dataset=check.dataset,
        area=check.area,
        field=check.field,
        label=check.label,
        required_for=check.required_for,
        total_records=total_records,
        present_records=present_records,
        coverage_percent=percent,
        status=status_for_coverage(percent),
        missing_examples=missing_examples,
    )


def summarize_areas(field_coverages: list[FieldCoverage]) -> list[FeatureAreaSummary]:
    areas = sorted({coverage.area for coverage in field_coverages})
    summaries: list[FeatureAreaSummary] = []

    for area in areas:
        area_fields = [
            coverage for coverage in field_coverages if coverage.area == area
        ]
        average = round(
            sum(coverage.coverage_percent for coverage in area_fields)
            / len(area_fields),
            2,
        )
        summaries.append(
            FeatureAreaSummary(
                area=area,
                field_count=len(area_fields),
                average_coverage_percent=average,
                weak_field_count=sum(
                    1 for coverage in area_fields if coverage.status == "weak"
                ),
            )
        )

    return summaries


def build_feature_readiness_report(
    repo_root: Path,
    max_examples: int = 8,
) -> FeatureReadinessReport:
    datasets = load_processed_datasets(repo_root)
    field_coverages = [
        coverage_for_check(check, datasets[check.dataset], max_examples)
        for check in FIELD_CHECKS
    ]

    return FeatureReadinessReport(
        field_coverages=field_coverages,
        area_summaries=summarize_areas(field_coverages),
    )
