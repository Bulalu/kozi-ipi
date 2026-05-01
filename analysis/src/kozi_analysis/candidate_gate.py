from __future__ import annotations

import json
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any, Literal

from kozi_analysis.candidate_export import CandidateComparisonReport, FileComparison

GateStatus = Literal["pass", "expected", "blocker"]


@dataclass(frozen=True)
class ExpectedChange:
    file: str
    check: str
    reason: str


@dataclass(frozen=True)
class GateCheck:
    file: str
    check: str
    status: GateStatus
    message: str
    expected_reason: str | None = None


@dataclass(frozen=True)
class CandidateGateReport:
    passed: bool
    checks: list[GateCheck]
    expected_changes: list[ExpectedChange]
    comparison: CandidateComparisonReport

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)

    @property
    def blocker_count(self) -> int:
        return sum(1 for check in self.checks if check.status == "blocker")

    @property
    def expected_count(self) -> int:
        return sum(1 for check in self.checks if check.status == "expected")


def load_expected_changes(path: Path) -> list[ExpectedChange]:
    if not path.exists():
        return []

    value = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        return []

    expected_changes = value.get("expected_changes", [])
    if not isinstance(expected_changes, list):
        return []

    parsed: list[ExpectedChange] = []
    for item in expected_changes:
        if not isinstance(item, dict):
            continue
        file = str(item.get("file") or "").strip()
        check = str(item.get("check") or "").strip()
        reason = str(item.get("reason") or "").strip()
        if file and check and reason:
            parsed.append(ExpectedChange(file=file, check=check, reason=reason))
    return parsed


def expected_reason(
    expected_changes: list[ExpectedChange],
    file: str,
    check: str,
) -> str | None:
    for change in expected_changes:
        if change.file == file and change.check == check:
            return change.reason
    return None


def gate_status(reason: str | None) -> GateStatus:
    return "expected" if reason else "blocker"


def gate_check(
    file: str,
    check: str,
    passed: bool,
    message: str,
    expected_changes: list[ExpectedChange],
) -> GateCheck:
    if passed:
        return GateCheck(file=file, check=check, status="pass", message=message)

    reason = expected_reason(expected_changes, file, check)
    return GateCheck(
        file=file,
        check=check,
        status=gate_status(reason),
        message=message,
        expected_reason=reason,
    )


def file_checks(
    file: FileComparison,
    expected_changes: list[ExpectedChange],
) -> list[GateCheck]:
    present = file.current_exists and file.candidate_exists
    rows_match = file.current_record_count == file.candidate_record_count
    blank_keys_clean = file.blank_key_count in (None, 0)
    changed_records_clean = len(file.changed_record_samples) == 0

    return [
        gate_check(
            file.name,
            "file_presence",
            present,
            "Current and candidate files must both exist.",
            expected_changes,
        ),
        gate_check(
            file.name,
            "row_count",
            rows_match,
            (
                "Current and candidate row counts must match unless the change "
                "is explicitly expected."
            ),
            expected_changes,
        ),
        gate_check(
            file.name,
            "field_set",
            file.field_sets_equal,
            "Candidate fields must preserve the processed-data contract.",
            expected_changes,
        ),
        gate_check(
            file.name,
            "blank_keys",
            blank_keys_clean,
            "Candidate identity keys must not be blank.",
            expected_changes,
        ),
        gate_check(
            file.name,
            "review_distribution",
            file.needs_review_distribution_equal is True,
            "Review flag and review reason distributions must be explained.",
            expected_changes,
        ),
        gate_check(
            file.name,
            "source_datasets",
            file.source_datasets_distribution_equal is True,
            "Source dataset distributions must be explained.",
            expected_changes,
        ),
        gate_check(
            file.name,
            "applicant_pathways",
            file.applicant_pathway_distribution_equal is True,
            "Applicant Pathway flag distributions must be explained.",
            expected_changes,
        ),
        gate_check(
            file.name,
            "parse_status",
            file.parse_status_distribution_equal is True,
            "Requirement-rule parse status distributions must be explained.",
            expected_changes,
        ),
        gate_check(
            file.name,
            "changed_records",
            changed_records_clean,
            "Changed record samples must be explained.",
            expected_changes,
        ),
        gate_check(
            file.name,
            "hash",
            file.hashes_equal,
            "Byte hash differences must be explained.",
            expected_changes,
        ),
    ]


def evaluate_candidate_gate(
    comparison: CandidateComparisonReport,
    expected_changes: list[ExpectedChange] | None = None,
) -> CandidateGateReport:
    expected = expected_changes or []
    checks = [
        check for file in comparison.files for check in file_checks(file, expected)
    ]
    passed = all(check.status != "blocker" for check in checks)
    return CandidateGateReport(
        passed=passed,
        checks=checks,
        expected_changes=expected,
        comparison=comparison,
    )
