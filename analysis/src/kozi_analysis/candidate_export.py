from __future__ import annotations

import hashlib
import json
import shutil
from collections import Counter
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any, Literal

from kozi_analysis.io import json_records, jsonl_records

ProcessedFileKind = Literal["json", "jsonl"]


@dataclass(frozen=True)
class ProcessedFileSpec:
    name: str
    kind: ProcessedFileKind
    key_fields: tuple[str, ...]


@dataclass(frozen=True)
class FileComparison:
    name: str
    current_exists: bool
    candidate_exists: bool
    hashes_equal: bool
    current_hash: str | None
    candidate_hash: str | None
    current_record_count: int | None
    candidate_record_count: int | None
    field_sets_equal: bool
    current_fields: list[str]
    candidate_fields: list[str]
    blank_key_count: int | None
    needs_review_distribution_equal: bool | None
    source_datasets_distribution_equal: bool | None
    applicant_pathway_distribution_equal: bool | None
    parse_status_distribution_equal: bool | None
    changed_record_samples: list[str]


@dataclass(frozen=True)
class CandidateComparisonReport:
    copied_files: list[str]
    files: list[FileComparison]

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)

    @property
    def all_hashes_equal(self) -> bool:
        return all(
            file.current_exists and file.candidate_exists and file.hashes_equal
            for file in self.files
        )


PROCESSED_FILE_SPECS = [
    ProcessedFileSpec(
        name="institutions.jsonl",
        kind="jsonl",
        key_fields=("normalizedInstitutionName",),
    ),
    ProcessedFileSpec(
        name="programmes.jsonl",
        kind="jsonl",
        key_fields=("normalizedInstitutionName", "normalizedProgrammeName"),
    ),
    ProcessedFileSpec(
        name="entry-requirements.jsonl",
        kind="jsonl",
        key_fields=("normalizedInstitutionName", "normalizedProgrammeName"),
    ),
    ProcessedFileSpec(
        name="requirement-rules.jsonl",
        kind="jsonl",
        key_fields=("institutionKey", "programmeKey"),
    ),
    ProcessedFileSpec(
        name="data-quality-report.json",
        kind="json",
        key_fields=(),
    ),
]

APPLICANT_PATHWAY_FIELDS = (
    "acceptsFormFourDirect",
    "acceptsFormSix",
    "acceptsCertificate",
    "acceptsDiploma",
    "acceptsEquivalent",
)


def file_hash(path: Path) -> str | None:
    if not path.exists():
        return None
    digest = hashlib.sha256()
    with path.open("rb") as file:
        for chunk in iter(lambda: file.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def copy_processed_outputs(
    repo_root: Path,
    candidate_dir: Path,
) -> list[str]:
    source_dir = repo_root / "data/processed"
    candidate_dir.mkdir(parents=True, exist_ok=True)
    copied: list[str] = []

    for spec in PROCESSED_FILE_SPECS:
        source = source_dir / spec.name
        destination = candidate_dir / spec.name
        if source.exists():
            shutil.copy2(source, destination)
            copied.append(spec.name)

    return copied


def read_records(path: Path, kind: ProcessedFileKind) -> list[dict[str, Any]]:
    if not path.exists():
        return []
    if kind == "jsonl":
        return list(jsonl_records(path))
    return json_records(path)


def field_set(records: list[dict[str, Any]]) -> list[str]:
    return sorted({key for record in records for key in record})


def blank_key_count(
    records: list[dict[str, Any]],
    key_fields: tuple[str, ...],
) -> int | None:
    if not key_fields:
        return None
    return sum(
        1
        for record in records
        if any(not str(record.get(field) or "").strip() for field in key_fields)
    )


def needs_review_distribution(records: list[dict[str, Any]]) -> Counter[str]:
    counter: Counter[str] = Counter()
    for record in records:
        if record.get("needsReview") is True:
            counter["needsReview:true"] += 1
        reasons = record.get("reviewReasons")
        if isinstance(reasons, list):
            counter.update(str(reason) for reason in reasons)
    return counter


def source_datasets_distribution(records: list[dict[str, Any]]) -> Counter[str]:
    counter: Counter[str] = Counter()
    for record in records:
        source_datasets = record.get("sourceDatasets")
        if isinstance(source_datasets, list):
            counter.update(str(source) for source in source_datasets)
    return counter


def applicant_pathway_distribution(records: list[dict[str, Any]]) -> Counter[str]:
    counter: Counter[str] = Counter()
    for record in records:
        for field in APPLICANT_PATHWAY_FIELDS:
            if field in record:
                counter[f"{field}:{record.get(field)}"] += 1
    return counter


def parse_status_distribution(records: list[dict[str, Any]]) -> Counter[str]:
    counter: Counter[str] = Counter()
    for record in records:
        variants = record.get("variants")
        if not isinstance(variants, list):
            continue
        for variant in variants:
            if isinstance(variant, dict):
                counter[str(variant.get("parseStatus", "missing"))] += 1
    return counter


def record_identity(record: dict[str, Any], key_fields: tuple[str, ...]) -> str:
    if not key_fields:
        return json.dumps(record, sort_keys=True)
    return " :: ".join(str(record.get(field) or "") for field in key_fields)


def changed_record_samples(
    current_records: list[dict[str, Any]],
    candidate_records: list[dict[str, Any]],
    key_fields: tuple[str, ...],
    max_samples: int = 10,
) -> list[str]:
    if current_records == candidate_records:
        return []

    current_by_key = {
        record_identity(record, key_fields): record for record in current_records
    }
    candidate_by_key = {
        record_identity(record, key_fields): record for record in candidate_records
    }

    samples: list[str] = []
    for key in sorted(set(current_by_key) | set(candidate_by_key)):
        if current_by_key.get(key) != candidate_by_key.get(key):
            samples.append(key)
        if len(samples) >= max_samples:
            break
    return samples


def compare_file(
    current_dir: Path,
    candidate_dir: Path,
    spec: ProcessedFileSpec,
) -> FileComparison:
    current_path = current_dir / spec.name
    candidate_path = candidate_dir / spec.name
    current_records = read_records(current_path, spec.kind)
    candidate_records = read_records(candidate_path, spec.kind)
    current_fields = field_set(current_records)
    candidate_fields = field_set(candidate_records)
    current_hash = file_hash(current_path)
    candidate_hash = file_hash(candidate_path)

    return FileComparison(
        name=spec.name,
        current_exists=current_path.exists(),
        candidate_exists=candidate_path.exists(),
        hashes_equal=(
            current_hash is not None
            and candidate_hash is not None
            and current_hash == candidate_hash
        ),
        current_hash=current_hash,
        candidate_hash=candidate_hash,
        current_record_count=len(current_records) if current_path.exists() else None,
        candidate_record_count=(
            len(candidate_records) if candidate_path.exists() else None
        ),
        field_sets_equal=current_fields == candidate_fields,
        current_fields=current_fields,
        candidate_fields=candidate_fields,
        blank_key_count=blank_key_count(candidate_records, spec.key_fields),
        needs_review_distribution_equal=(
            needs_review_distribution(current_records)
            == needs_review_distribution(candidate_records)
        ),
        source_datasets_distribution_equal=(
            source_datasets_distribution(current_records)
            == source_datasets_distribution(candidate_records)
        ),
        applicant_pathway_distribution_equal=(
            applicant_pathway_distribution(current_records)
            == applicant_pathway_distribution(candidate_records)
        ),
        parse_status_distribution_equal=(
            parse_status_distribution(current_records)
            == parse_status_distribution(candidate_records)
        ),
        changed_record_samples=changed_record_samples(
            current_records,
            candidate_records,
            spec.key_fields,
        ),
    )


def build_candidate_comparison(
    repo_root: Path,
    candidate_dir: Path,
    copy_current: bool = False,
) -> CandidateComparisonReport:
    copied_files = (
        copy_processed_outputs(repo_root, candidate_dir) if copy_current else []
    )
    current_dir = repo_root / "data/processed"
    files = [
        compare_file(current_dir, candidate_dir, spec) for spec in PROCESSED_FILE_SPECS
    ]
    return CandidateComparisonReport(copied_files=copied_files, files=files)
