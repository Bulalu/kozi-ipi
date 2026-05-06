from __future__ import annotations

from collections import Counter
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any, Literal

from kozi_analysis.identity_rules import normalize_identity_text
from kozi_analysis.io import csv_records, json_records, jsonl_records

RecordType = Literal["institution", "programme"]
FileKind = Literal["csv", "json", "jsonl"]


@dataclass(frozen=True)
class SourceDefinition:
    name: str
    path: str
    file_kind: FileKind
    record_type: RecordType
    key_fields: tuple[str, ...]
    display_fields: tuple[str, ...]


@dataclass(frozen=True)
class SourceSummary:
    source: str
    path: str
    record_type: RecordType
    row_count: int
    unique_key_count: int
    blank_key_count: int
    duplicate_key_count: int
    duplicate_examples: list[str]


@dataclass(frozen=True)
class PairOverlap:
    left_source: str
    right_source: str
    left_unique_count: int
    right_unique_count: int
    shared_count: int
    left_only_count: int
    right_only_count: int
    jaccard: float
    left_only_examples: list[str]
    right_only_examples: list[str]


@dataclass(frozen=True)
class SourceOverlapReport:
    institution_sources: list[SourceSummary]
    programme_sources: list[SourceSummary]
    institution_overlaps: list[PairOverlap]
    programme_overlaps: list[PairOverlap]

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


INSTITUTION_SOURCES = [
    SourceDefinition(
        name="raw_pathways_institutions",
        path="data/raw/tanzania-education-pathways-dataset/institutions.csv",
        file_kind="csv",
        record_type="institution",
        key_fields=("normalized_institution_name", "institution_name"),
        display_fields=("institution_name", "registration_number", "regulator"),
    ),
    SourceDefinition(
        name="raw_pathways_institution_enrichment",
        path="data/raw/tanzania-education-pathways-dataset/institution_enrichment.csv",
        file_kind="csv",
        record_type="institution",
        key_fields=("normalized_institution_name", "institution_name"),
        display_fields=("institution_name", "website", "logo_status"),
    ),
    SourceDefinition(
        name="raw_fallback_institutions",
        path="data/raw/tanzania-post-form-four-dataset/institutions.csv",
        file_kind="csv",
        record_type="institution",
        key_fields=("normalized_institution_name", "institution_name"),
        display_fields=("institution_name", "registration_number", "regulator"),
    ),
    SourceDefinition(
        name="raw_nactvet_institutions",
        path="data/raw/tanzania-education-dataset/institutions.csv",
        file_kind="csv",
        record_type="institution",
        key_fields=("institution_name",),
        display_fields=("institution_name", "registration_number", "region"),
    ),
    SourceDefinition(
        name="enrichment_logos",
        path="data/enrichment/institution-logos.seed.csv",
        file_kind="csv",
        record_type="institution",
        key_fields=("normalized_institution_name", "institution_name"),
        display_fields=("institution_name", "logo_status", "website"),
    ),
    SourceDefinition(
        name="extracted_tcu_institutions",
        path="data/extracted/tcu-secondary-guidebook-2025-2026-programmes.csv",
        file_kind="csv",
        record_type="institution",
        key_fields=("normalizedInstitutionName", "institutionName"),
        display_fields=("institutionName", "page", "sourcePdf"),
    ),
    SourceDefinition(
        name="processed_institutions",
        path="data/processed/institutions.jsonl",
        file_kind="jsonl",
        record_type="institution",
        key_fields=("normalizedInstitutionName", "institutionName"),
        display_fields=("institutionName", "regulator", "sourceDatasets"),
    ),
]


PROGRAMME_SOURCES = [
    SourceDefinition(
        name="raw_pathways_programmes",
        path="data/raw/tanzania-education-pathways-dataset/programmes.csv",
        file_kind="csv",
        record_type="programme",
        key_fields=(
            "normalized_programme_name",
            "programme_name",
            "normalized_institution_name",
            "institution_name",
        ),
        display_fields=("programme_name", "institution_name", "programme_code"),
    ),
    SourceDefinition(
        name="raw_pathways_entry_requirements",
        path="data/raw/tanzania-education-pathways-dataset/entry_requirements.csv",
        file_kind="csv",
        record_type="programme",
        key_fields=(
            "normalized_programme_name",
            "programme_name",
            "normalized_institution_name",
            "institution_name",
        ),
        display_fields=("programme_name", "institution_name", "raw_requirement_text"),
    ),
    SourceDefinition(
        name="raw_fallback_programmes",
        path="data/raw/tanzania-post-form-four-dataset/programmes.csv",
        file_kind="csv",
        record_type="programme",
        key_fields=(
            "normalized_programme_name",
            "programme_name",
            "institution_name",
        ),
        display_fields=("programme_name", "institution_name", "award_level"),
    ),
    SourceDefinition(
        name="raw_nactvet_programmes",
        path="data/raw/tanzania-education-dataset/programmes.csv",
        file_kind="csv",
        record_type="programme",
        key_fields=(
            "normalized_programme_name",
            "programme_name",
            "institution_name",
        ),
        display_fields=("programme_name", "institution_name", "award_level"),
    ),
    SourceDefinition(
        name="extracted_tcu_programmes",
        path="data/extracted/tcu-secondary-guidebook-2025-2026-programmes.csv",
        file_kind="csv",
        record_type="programme",
        key_fields=(
            "normalizedProgrammeName",
            "programmeName",
            "normalizedInstitutionName",
            "institutionName",
        ),
        display_fields=("programmeName", "institutionName", "programmeCode"),
    ),
    SourceDefinition(
        name="processed_programmes",
        path="data/processed/programmes.jsonl",
        file_kind="jsonl",
        record_type="programme",
        key_fields=(
            "normalizedProgrammeName",
            "programmeName",
            "normalizedInstitutionName",
            "institutionName",
        ),
        display_fields=("programmeName", "institutionName", "sourceDatasets"),
    ),
    SourceDefinition(
        name="processed_entry_requirements",
        path="data/processed/entry-requirements.jsonl",
        file_kind="jsonl",
        record_type="programme",
        key_fields=(
            "normalizedProgrammeName",
            "programmeName",
            "normalizedInstitutionName",
            "institutionName",
        ),
        display_fields=("programmeName", "institutionName", "rawRequirementText"),
    ),
    SourceDefinition(
        name="processed_requirement_rules",
        path="data/processed/requirement-rules.jsonl",
        file_kind="jsonl",
        record_type="programme",
        key_fields=(
            "normalizedProgrammeName",
            "programmeName",
            "normalizedInstitutionName",
            "institutionName",
        ),
        display_fields=("programmeName", "institutionName", "programmeKey"),
    ),
]


def normalize_identity(value: object) -> str:
    return normalize_identity_text(value)


def read_source_records(
    repo_root: Path, source: SourceDefinition
) -> list[dict[str, Any]]:
    path = repo_root / source.path
    if source.file_kind == "csv":
        return csv_records(path)
    if source.file_kind == "jsonl":
        return list(jsonl_records(path))
    return json_records(path)


def source_key(source: SourceDefinition, record: dict[str, Any]) -> str:
    values = [normalize_identity(record.get(field)) for field in source.key_fields]
    normalized_values = [value for value in values if value]

    if source.record_type == "institution":
        return normalized_values[0] if normalized_values else ""

    if len(normalized_values) < 2:
        return ""
    programme = normalized_values[0]
    institution = normalized_values[-1]
    return f"{institution} :: {programme}"


def summarize_source(
    repo_root: Path, source: SourceDefinition
) -> tuple[SourceSummary, set[str]]:
    records = read_source_records(repo_root, source)
    keys = [source_key(source, record) for record in records]
    nonblank_keys = [key for key in keys if key]
    counts = Counter(nonblank_keys)
    duplicate_keys = sorted(key for key, count in counts.items() if count > 1)

    summary = SourceSummary(
        source=source.name,
        path=source.path,
        record_type=source.record_type,
        row_count=len(records),
        unique_key_count=len(counts),
        blank_key_count=sum(1 for key in keys if not key),
        duplicate_key_count=len(duplicate_keys),
        duplicate_examples=duplicate_keys[:10],
    )

    return summary, set(counts)


def compare_key_sets(
    left_source: str,
    left_keys: set[str],
    right_source: str,
    right_keys: set[str],
) -> PairOverlap:
    shared = left_keys & right_keys
    left_only = sorted(left_keys - right_keys)
    right_only = sorted(right_keys - left_keys)
    union_count = len(left_keys | right_keys)

    return PairOverlap(
        left_source=left_source,
        right_source=right_source,
        left_unique_count=len(left_keys),
        right_unique_count=len(right_keys),
        shared_count=len(shared),
        left_only_count=len(left_only),
        right_only_count=len(right_only),
        jaccard=round(len(shared) / union_count, 4) if union_count else 0,
        left_only_examples=left_only[:10],
        right_only_examples=right_only[:10],
    )


def compare_sources(
    summaries_and_keys: list[tuple[SourceSummary, set[str]]],
) -> list[PairOverlap]:
    overlaps: list[PairOverlap] = []
    for left_index, (left_summary, left_keys) in enumerate(summaries_and_keys):
        for right_summary, right_keys in summaries_and_keys[left_index + 1 :]:
            overlaps.append(
                compare_key_sets(
                    left_summary.source,
                    left_keys,
                    right_summary.source,
                    right_keys,
                )
            )
    return overlaps


def build_source_overlap(repo_root: Path) -> SourceOverlapReport:
    institution_results = [
        summarize_source(repo_root, source) for source in INSTITUTION_SOURCES
    ]
    programme_results = [
        summarize_source(repo_root, source) for source in PROGRAMME_SOURCES
    ]

    return SourceOverlapReport(
        institution_sources=[summary for summary, _keys in institution_results],
        programme_sources=[summary for summary, _keys in programme_results],
        institution_overlaps=compare_sources(institution_results),
        programme_overlaps=compare_sources(programme_results),
    )
