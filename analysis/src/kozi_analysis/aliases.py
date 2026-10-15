from __future__ import annotations

import json
from collections import defaultdict
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any, Literal

from kozi_analysis.overlap import (
    INSTITUTION_SOURCES,
    PROGRAMME_SOURCES,
    SourceDefinition,
    normalize_identity,
    read_source_records,
)

RecordType = Literal["institution", "programme"]

INSTITUTION_ALIAS_PAIRS = [
    ("raw_pathways_institutions", "enrichment_logos"),
    ("raw_pathways_institutions", "extracted_tcu_institutions"),
    ("processed_institutions", "extracted_tcu_institutions"),
]

PROGRAMME_ALIAS_PAIRS = [
    ("raw_pathways_programmes", "extracted_tcu_programmes"),
    ("processed_programmes", "extracted_tcu_programmes"),
    ("raw_fallback_programmes", "raw_nactvet_programmes"),
]

STOP_TOKENS = {
    "and",
    "at",
    "campus",
    "centre",
    "center",
    "college",
    "dar",
    "es",
    "in",
    "institute",
    "of",
    "school",
    "the",
    "training",
    "university",
}


@dataclass(frozen=True)
class IdentityRecord:
    source: str
    record_type: RecordType
    name: str
    context: str
    normalized_name: str
    tokens: tuple[str, ...]
    acronym: str


@dataclass(frozen=True)
class AliasCandidate:
    left_source: str
    right_source: str
    left_name: str
    right_name: str
    left_context: str
    right_context: str
    score: float
    reason: str


@dataclass(frozen=True)
class AliasPairSummary:
    left_source: str
    right_source: str
    record_type: RecordType
    left_count: int
    right_count: int
    candidate_count: int
    high_confidence_count: int
    examples: list[AliasCandidate]


@dataclass(frozen=True)
class AliasReport:
    institution_pairs: list[AliasPairSummary]
    programme_pairs: list[AliasPairSummary]

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


def write_alias_report(report: AliasReport, output_dir: Path) -> None:
    output_dir.mkdir(parents=True, exist_ok=True)
    (output_dir / "identity-aliases.json").write_text(
        json.dumps(report.to_dict(), indent=2, sort_keys=True),
        encoding="utf-8",
    )


def tokenize_name(value: str) -> tuple[str, ...]:
    normalized = normalize_identity(value)
    return tuple(token for token in normalized.split() if token)


def acronym_for_tokens(tokens: tuple[str, ...]) -> str:
    meaningful = [token for token in tokens if token not in STOP_TOKENS]
    return "".join(token[0] for token in meaningful if token)


def display_field(source: SourceDefinition, record: dict[str, Any]) -> str:
    preferred = (
        ("institutionName", "institution_name")
        if source.record_type == "institution"
        else ("programmeName", "programme_name")
    )
    for field in preferred:
        value = str(record.get(field) or "").strip()
        if value:
            return value
    for field in source.display_fields:
        value = str(record.get(field) or "").strip()
        if value:
            return value
    return ""


def context_field(source: SourceDefinition, record: dict[str, Any]) -> str:
    if source.record_type == "institution":
        for field in ("regulator", "region", "sourcePdf", "website"):
            value = str(record.get(field) or "").strip()
            if value:
                return value
        return ""

    for field in ("institutionName", "institution_name"):
        value = str(record.get(field) or "").strip()
        if value:
            return value
    return ""


def identity_records(repo_root: Path, source: SourceDefinition) -> list[IdentityRecord]:
    records: list[IdentityRecord] = []
    seen: set[tuple[str, str]] = set()

    for raw_record in read_source_records(repo_root, source):
        name = display_field(source, raw_record)
        tokens = tokenize_name(name)
        if not name or not tokens:
            continue

        context = context_field(source, raw_record)
        identity = (normalize_identity(name), normalize_identity(context))
        if identity in seen:
            continue
        seen.add(identity)

        records.append(
            IdentityRecord(
                source=source.name,
                record_type=source.record_type,
                name=name,
                context=context,
                normalized_name=normalize_identity(name),
                tokens=tokens,
                acronym=acronym_for_tokens(tokens),
            )
        )

    return records


def token_score(left: IdentityRecord, right: IdentityRecord) -> tuple[float, str]:
    if left.normalized_name == right.normalized_name:
        return 1.0, "exact normalized name"

    left_tokens = set(left.tokens)
    right_tokens = set(right.tokens)
    shared = left_tokens & right_tokens
    if not shared:
        return 0, "no shared tokens"

    jaccard = len(shared) / len(left_tokens | right_tokens)
    containment = len(shared) / min(len(left_tokens), len(right_tokens))
    score = jaccard
    reason = "token overlap"

    if containment >= 0.8:
        score = max(score, containment * 0.95)
        reason = "one name mostly contains the other"

    if left.acronym and left.acronym in right_tokens and containment >= 0.5:
        score = max(score, 0.9)
        reason = "acronym appears in other name"
    if right.acronym and right.acronym in left_tokens and containment >= 0.5:
        score = max(score, 0.9)
        reason = "acronym appears in other name"

    return round(score, 4), reason


def text_similarity(left: str, right: str) -> float:
    left_tokens = set(tokenize_name(left))
    right_tokens = set(tokenize_name(right))
    if not left_tokens or not right_tokens:
        return 0
    if left_tokens == right_tokens:
        return 1

    shared = left_tokens & right_tokens
    if not shared:
        return 0

    jaccard = len(shared) / len(left_tokens | right_tokens)
    containment = len(shared) / min(len(left_tokens), len(right_tokens))
    return round(max(jaccard, containment * 0.95), 4)


def combined_candidate_score(
    left: IdentityRecord,
    right: IdentityRecord,
) -> tuple[float, str]:
    name_score, reason = token_score(left, right)
    if left.record_type != "programme":
        return name_score, reason

    context_score = text_similarity(left.context, right.context)
    if left.context and right.context and context_score < 0.5:
        return 0, "programme title match but institution context differs"

    if context_score:
        return (
            round((name_score * 0.65) + (context_score * 0.35), 4),
            f"{reason} with institution context",
        )

    return name_score, reason


def candidate_matches(
    left_records: list[IdentityRecord],
    right_records: list[IdentityRecord],
    min_score: float,
    max_examples: int,
) -> list[AliasCandidate]:
    index: defaultdict[str, list[IdentityRecord]] = defaultdict(list)
    for record in right_records:
        for token in set(record.tokens):
            index[token].append(record)

    best_by_pair: dict[tuple[str, str, str, str], AliasCandidate] = {}
    for left in left_records:
        right_candidates: dict[tuple[str, str], IdentityRecord] = {}
        for token in set(left.tokens):
            for right in index.get(token, []):
                right_candidates[(right.normalized_name, right.context)] = right

        for right in right_candidates.values():
            score, reason = combined_candidate_score(left, right)
            if score < min_score:
                continue
            key = (
                left.normalized_name,
                left.context,
                right.normalized_name,
                right.context,
            )
            best_by_pair[key] = AliasCandidate(
                left_source=left.source,
                right_source=right.source,
                left_name=left.name,
                right_name=right.name,
                left_context=left.context,
                right_context=right.context,
                score=score,
                reason=reason,
            )

    return sorted(
        best_by_pair.values(),
        key=lambda candidate: (
            -candidate.score,
            candidate.left_name,
            candidate.right_name,
        ),
    )[:max_examples]


def source_by_name(sources: list[SourceDefinition]) -> dict[str, SourceDefinition]:
    return {source.name: source for source in sources}


def summarize_pair(
    repo_root: Path,
    sources: dict[str, SourceDefinition],
    left_name: str,
    right_name: str,
    min_score: float,
    max_examples: int,
) -> AliasPairSummary:
    left_source = sources[left_name]
    right_source = sources[right_name]
    left_records = identity_records(repo_root, left_source)
    right_records = identity_records(repo_root, right_source)
    examples = candidate_matches(
        left_records,
        right_records,
        min_score=min_score,
        max_examples=max_examples,
    )

    return AliasPairSummary(
        left_source=left_name,
        right_source=right_name,
        record_type=left_source.record_type,
        left_count=len(left_records),
        right_count=len(right_records),
        candidate_count=len(examples),
        high_confidence_count=sum(
            1 for candidate in examples if candidate.score >= 0.9
        ),
        examples=examples,
    )


def build_alias_report(
    repo_root: Path,
    min_score: float = 0.72,
    max_examples: int = 25,
) -> AliasReport:
    institution_sources = source_by_name(INSTITUTION_SOURCES)
    programme_sources = source_by_name(PROGRAMME_SOURCES)

    return AliasReport(
        institution_pairs=[
            summarize_pair(
                repo_root,
                institution_sources,
                left,
                right,
                min_score,
                max_examples,
            )
            for left, right in INSTITUTION_ALIAS_PAIRS
        ],
        programme_pairs=[
            summarize_pair(
                repo_root,
                programme_sources,
                left,
                right,
                min_score,
                max_examples,
            )
            for left, right in PROGRAMME_ALIAS_PAIRS
        ],
    )
