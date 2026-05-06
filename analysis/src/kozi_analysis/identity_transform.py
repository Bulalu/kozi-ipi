from __future__ import annotations

import json
from collections import Counter
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any

from kozi_analysis.candidate_export import copy_processed_outputs
from kozi_analysis.io import jsonl_records
from kozi_analysis.overlap import normalize_identity
from kozi_analysis.p0_design import has_campus_marker


@dataclass(frozen=True)
class IdentityTransformSliceReport:
    input_count: int
    output_count: int
    blank_identity_count: int
    duplicate_identity_count: int
    campus_marker_count: int
    rewritten_files: list[str]
    duplicate_identity_examples: list[str]

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


def write_jsonl_records(path: Path, records: list[dict[str, Any]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    content = "\n".join(
        json.dumps(record, ensure_ascii=False, separators=(",", ":"))
        for record in records
    )
    path.write_text(f"{content}\n", encoding="utf-8")


def institution_identity_key(record: dict[str, Any]) -> str:
    normalized = str(record.get("normalizedInstitutionName") or "").strip()
    if normalized:
        return normalized
    return normalize_identity(record.get("institutionName"))


def duplicate_identity_examples(records: list[dict[str, Any]]) -> list[str]:
    counts = Counter(institution_identity_key(record) for record in records)
    return [
        key
        for key, count in sorted(counts.items(), key=lambda item: (-item[1], item[0]))
        if key and count > 1
    ][:25]


def build_identity_transform_slice(
    repo_root: Path,
    candidate_dir: Path,
    copy_current: bool = True,
) -> IdentityTransformSliceReport:
    if copy_current:
        copy_processed_outputs(repo_root, candidate_dir)

    source_path = repo_root / "data/processed/institutions.jsonl"
    candidate_path = candidate_dir / "institutions.jsonl"
    records = list(jsonl_records(source_path))
    write_jsonl_records(candidate_path, records)

    identity_keys = [institution_identity_key(record) for record in records]
    identity_counts = Counter(identity_keys)
    blank_identity_count = sum(1 for key in identity_keys if not key)
    duplicate_identity_count = sum(
        count for key, count in identity_counts.items() if key and count > 1
    )
    campus_marker_count = sum(
        1 for record in records if has_campus_marker(str(record.get("institutionName")))
    )

    return IdentityTransformSliceReport(
        input_count=len(records),
        output_count=len(records),
        blank_identity_count=blank_identity_count,
        duplicate_identity_count=duplicate_identity_count,
        campus_marker_count=campus_marker_count,
        rewritten_files=["institutions.jsonl"],
        duplicate_identity_examples=duplicate_identity_examples(records),
    )
