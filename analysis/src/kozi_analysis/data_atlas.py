from __future__ import annotations

import re
from collections import Counter, defaultdict
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any

from kozi_analysis.features import value_present
from kozi_analysis.io import csv_records, jsonl_records
from kozi_analysis.overlap import normalize_identity


@dataclass(frozen=True)
class CountRow:
    label: str
    count: int


@dataclass(frozen=True)
class CategoryInstitutionRow:
    category: str
    institution: str
    count: int


@dataclass(frozen=True)
class MissingFieldRow:
    dataset: str
    field: str
    missing_count: int
    total_count: int
    missing_percent: float


@dataclass(frozen=True)
class RequirementIntensityRow:
    institution: str
    programme: str
    category: str
    award_level: str
    score: int
    reasons: list[str]


@dataclass(frozen=True)
class InstitutionRequirementSummary:
    institution: str
    programme_count: int
    average_score: float
    high_intensity_count: int


@dataclass(frozen=True)
class DataAtlasReport:
    headline: dict[str, int]
    source_counts: dict[str, int]
    institution_categories: list[CountRow]
    institution_regulators: list[CountRow]
    institution_regions: list[CountRow]
    programme_regions: list[CountRow]
    award_levels: list[CountRow]
    field_categories: list[CountRow]
    course_families: list[CountRow]
    applicant_pathways: list[CountRow]
    top_institutions: list[CountRow]
    campus_like_institutions: list[CountRow]
    multi_location_parent_groups: list[CountRow]
    top_institutions_by_category: list[CategoryInstitutionRow]
    missing_fields: list[MissingFieldRow]
    review_reasons: list[CountRow]
    high_requirement_programmes: list[RequirementIntensityRow]
    institution_requirement_intensity: list[InstitutionRequirementSummary]

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


INSTITUTION_MISSING_FIELDS = (
    "region",
    "districtOrCouncil",
    "website",
    "email",
    "phoneNumbers",
    "applicationUrl",
    "applicationMethod",
    "logoUrl",
    "regulator",
    "ownershipType",
)

PROGRAMME_MISSING_FIELDS = (
    "awardLevel",
    "fieldCategory",
    "courseFamily",
    "region",
    "campusLocation",
    "minimumEntryRequirements",
    "acceptsFormFourDirect",
    "acceptsFormSix",
    "acceptsCertificate",
    "acceptsDiploma",
    "acceptsEquivalent",
    "duration",
    "feesIfAvailable",
    "admissionCapacity",
)

PATHWAY_FIELDS = {
    "Form Four direct": "acceptsFormFourDirect",
    "Form Six": "acceptsFormSix",
    "Certificate": "acceptsCertificate",
    "Diploma": "acceptsDiploma",
    "Equivalent": "acceptsEquivalent",
}

SCIENCE_SUBJECTS = {
    "advanced mathematics",
    "biology",
    "chemistry",
    "mathematics",
    "physics",
}


def load_processed(
    repo_root: Path,
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    return (
        list(jsonl_records(repo_root / "data/processed/institutions.jsonl")),
        list(jsonl_records(repo_root / "data/processed/programmes.jsonl")),
    )


def count_rows(counter: Counter[str], limit: int | None = None) -> list[CountRow]:
    rows = [
        CountRow(label=label or "missing/unknown", count=count)
        for label, count in counter.most_common()
    ]
    return rows if limit is None else rows[:limit]


def clean_label(value: object) -> str:
    text = str(value or "").strip()
    return text if text and text.lower() != "unknown" else "missing/unknown"


def institution_category(record: dict[str, Any]) -> str:
    text = " ".join(
        str(record.get(field) or "")
        for field in ("institutionType", "institutionCategory", "regulator")
    ).lower()
    regulator = str(record.get("regulator") or "").upper()
    if "teacher" in text:
        return "teacher college"
    if "vocational" in text or regulator == "VETA":
        return "vocational centre"
    if "technical" in text:
        return "technical institution"
    if "university" in text or "higher education" in text or regulator == "TCU":
        return "university / higher education"
    if "college" in text:
        return "college / institute"
    return "other / unclear"


def is_campus_like(record: dict[str, Any]) -> bool:
    name = str(record.get("institutionName") or "")
    normalized = normalize_identity(name)
    tokens = set(normalized.split())
    if tokens & {"campus", "branch", "centre", "center"}:
        return True
    return bool(re.search(r"\s[-–]\s+[A-Za-z]", name))


def parent_candidate_name(record: dict[str, Any]) -> str:
    name = str(record.get("institutionName") or "")
    name = re.split(r"\s[-–]\s+", name, maxsplit=1)[0]
    name = re.sub(r",\s*(?:[A-Z][A-Za-z'’.-]+\s*){1,4}$", "", name)
    name = re.sub(r"\b(?:campus|branch|centre|center)\b.*$", "", name, flags=re.I)
    return normalize_identity(name)


def programme_region(record: dict[str, Any]) -> str:
    region = clean_label(record.get("region"))
    if region != "missing/unknown":
        return region
    campus = str(record.get("campusLocation") or "")
    if " - " in campus:
        return clean_label(campus.rsplit(" - ", maxsplit=1)[-1])
    return "missing/unknown"


def source_counts(repo_root: Path) -> dict[str, int]:
    paths = {
        "raw_canonical_institutions": (
            "data/raw/tanzania-education-pathways-dataset/institutions.csv"
        ),
        "raw_canonical_programmes": (
            "data/raw/tanzania-education-pathways-dataset/programmes.csv"
        ),
        "raw_fallback_institutions": (
            "data/raw/tanzania-post-form-four-dataset/institutions.csv"
        ),
        "raw_fallback_programmes": (
            "data/raw/tanzania-post-form-four-dataset/programmes.csv"
        ),
    }
    return {
        name: len(csv_records(repo_root / path))
        for name, path in paths.items()
        if (repo_root / path).exists()
    }


def top_institutions_by_programme_count(
    programmes: list[dict[str, Any]],
    limit: int,
) -> list[CountRow]:
    counts = Counter(
        clean_label(record.get("institutionName")) for record in programmes
    )
    return count_rows(counts, limit)


def category_leaders(
    programmes: list[dict[str, Any]],
    limit_per_category: int,
) -> list[CategoryInstitutionRow]:
    counts: dict[str, Counter[str]] = defaultdict(Counter)
    for record in programmes:
        category = clean_label(record.get("fieldCategory"))
        institution = clean_label(record.get("institutionName"))
        counts[category][institution] += 1

    rows: list[CategoryInstitutionRow] = []
    for category in sorted(counts):
        for institution, count in counts[category].most_common(limit_per_category):
            rows.append(
                CategoryInstitutionRow(
                    category=category,
                    institution=institution,
                    count=count,
                )
            )
    return rows


def missing_fields(
    dataset: str,
    records: list[dict[str, Any]],
    fields: tuple[str, ...],
) -> list[MissingFieldRow]:
    total = len(records)
    rows: list[MissingFieldRow] = []
    for field in fields:
        missing = sum(1 for record in records if not value_present(record.get(field)))
        rows.append(
            MissingFieldRow(
                dataset=dataset,
                field=field,
                missing_count=missing,
                total_count=total,
                missing_percent=round((missing / total) * 100, 2) if total else 0,
            )
        )
    return sorted(rows, key=lambda row: (-row.missing_percent, row.dataset, row.field))


def applicant_pathway_counts(programmes: list[dict[str, Any]]) -> list[CountRow]:
    counter: Counter[str] = Counter()
    for label, field in PATHWAY_FIELDS.items():
        counter[label] = sum(
            1
            for record in programmes
            if str(record.get(field) or "").strip().lower() == "yes"
        )
    return count_rows(counter)


def required_subjects(record: dict[str, Any]) -> list[str]:
    value = str(record.get("requiredSubjects") or "")
    return [subject.strip() for subject in value.split(";") if subject.strip()]


def requirement_intensity(record: dict[str, Any]) -> RequirementIntensityRow:
    score = 0
    reasons: list[str] = []
    award_level = clean_label(record.get("awardLevel")).lower()
    requirement_text = str(record.get("minimumEntryRequirements") or "").lower()
    subjects = required_subjects(record)
    normalized_subjects = {normalize_identity(subject) for subject in subjects}

    if "degree" in award_level or "bachelor" in award_level:
        score += 3
        reasons.append("degree-level award")
    elif "diploma" in award_level:
        score += 2
        reasons.append("diploma-level award")
    elif "certificate" in award_level:
        score += 1
        reasons.append("certificate-level award")

    if subjects:
        subject_points = min(3, len(subjects))
        score += subject_points
        reasons.append(f"{len(subjects)} named subject(s)")

    science_count = len(normalized_subjects & SCIENCE_SUBJECTS)
    if science_count:
        score += min(2, science_count)
        reasons.append("science/math subject requirement")

    if "principal pass" in requirement_text or "principal passes" in requirement_text:
        score += 2
        reasons.append("principal pass requirement")

    if re.search(r"\bpoints?\b|\bgpa\b|\bgrade\b", requirement_text):
        score += 2
        reasons.append("points/GPA/grade threshold")

    if not value_present(record.get("minimumEntryRequirements")):
        reasons.append("missing requirement text")

    return RequirementIntensityRow(
        institution=clean_label(record.get("institutionName")),
        programme=clean_label(record.get("programmeName")),
        category=clean_label(record.get("fieldCategory")),
        award_level=clean_label(record.get("awardLevel")),
        score=score,
        reasons=reasons,
    )


def top_requirement_programmes(
    programmes: list[dict[str, Any]],
    limit: int,
) -> list[RequirementIntensityRow]:
    rows = [requirement_intensity(record) for record in programmes]
    return sorted(
        rows,
        key=lambda row: (-row.score, row.category, row.institution, row.programme),
    )[:limit]


def institution_requirement_summaries(
    programmes: list[dict[str, Any]],
    min_programmes: int,
    limit: int,
) -> list[InstitutionRequirementSummary]:
    by_institution: dict[str, list[RequirementIntensityRow]] = defaultdict(list)
    for record in programmes:
        row = requirement_intensity(record)
        by_institution[row.institution].append(row)

    summaries = [
        InstitutionRequirementSummary(
            institution=institution,
            programme_count=len(rows),
            average_score=round(sum(row.score for row in rows) / len(rows), 2),
            high_intensity_count=sum(1 for row in rows if row.score >= 10),
        )
        for institution, rows in by_institution.items()
        if len(rows) >= min_programmes
    ]
    return sorted(
        summaries,
        key=lambda row: (
            -row.average_score,
            -row.high_intensity_count,
            row.institution,
        ),
    )[:limit]


def build_data_atlas_report(
    repo_root: Path,
    top_n: int = 12,
) -> DataAtlasReport:
    institutions, programmes = load_processed(repo_root)
    campus_like = [record for record in institutions if is_campus_like(record)]
    parent_counts = Counter(parent_candidate_name(record) for record in campus_like)
    parent_counts.pop("", None)
    review_counter: Counter[str] = Counter()
    for record in [*institutions, *programmes]:
        reasons = record.get("reviewReasons")
        if isinstance(reasons, list):
            review_counter.update(str(reason) for reason in reasons)
        if record.get("needsReview") is True:
            review_counter["needsReview:true"] += 1

    headline = {
        "listed_institutions": len(institutions),
        "campus_like_institutions": len(campus_like),
        "programmes": len(programmes),
        "regions": len(
            {
                clean_label(record.get("region"))
                for record in institutions
                if clean_label(record.get("region")) != "missing/unknown"
            }
        ),
        "award_levels": len(
            {
                clean_label(record.get("awardLevel"))
                for record in programmes
                if clean_label(record.get("awardLevel")) != "missing/unknown"
            }
        ),
        "records_needing_review": sum(
            1 for record in [*institutions, *programmes] if record.get("needsReview")
        ),
    }

    return DataAtlasReport(
        headline=headline,
        source_counts=source_counts(repo_root),
        institution_categories=count_rows(
            Counter(institution_category(record) for record in institutions)
        ),
        institution_regulators=count_rows(
            Counter(clean_label(record.get("regulator")) for record in institutions)
        ),
        institution_regions=count_rows(
            Counter(clean_label(record.get("region")) for record in institutions), top_n
        ),
        programme_regions=count_rows(
            Counter(programme_region(record) for record in programmes), top_n
        ),
        award_levels=count_rows(
            Counter(clean_label(record.get("awardLevel")) for record in programmes)
        ),
        field_categories=count_rows(
            Counter(clean_label(record.get("fieldCategory")) for record in programmes)
        ),
        course_families=count_rows(
            Counter(clean_label(record.get("courseFamily")) for record in programmes)
        ),
        applicant_pathways=applicant_pathway_counts(programmes),
        top_institutions=top_institutions_by_programme_count(programmes, top_n),
        campus_like_institutions=count_rows(
            Counter(
                clean_label(record.get("institutionName")) for record in campus_like
            ),
            top_n,
        ),
        multi_location_parent_groups=count_rows(
            Counter({key: count for key, count in parent_counts.items() if count > 1}),
            top_n,
        ),
        top_institutions_by_category=category_leaders(programmes, limit_per_category=5),
        missing_fields=(
            missing_fields("institutions", institutions, INSTITUTION_MISSING_FIELDS)
            + missing_fields("programmes", programmes, PROGRAMME_MISSING_FIELDS)
        ),
        review_reasons=count_rows(review_counter, top_n),
        high_requirement_programmes=top_requirement_programmes(programmes, top_n),
        institution_requirement_intensity=institution_requirement_summaries(
            programmes,
            min_programmes=5,
            limit=top_n,
        ),
    )


def bar_chart_html(rows: list[CountRow], max_rows: int = 12) -> str:
    selected = rows[:max_rows]
    max_count = max((row.count for row in selected), default=1)
    blocks = []
    for row in selected:
        width = 0 if max_count == 0 else round((row.count / max_count) * 100, 1)
        blocks.append(
            f"""
            <div class="atlas-bar-row">
              <div class="atlas-bar-label">{row.label}</div>
              <div class="atlas-bar-track">
                <div class="atlas-bar-fill" style="width: {width}%"></div>
              </div>
              <div class="atlas-bar-value">{row.count:,}</div>
            </div>
            """
        )

    return (
        """
        <style>
          .atlas-bars { display: grid; gap: 8px; max-width: 860px; }
          .atlas-bar-row {
            display: grid;
            grid-template-columns: minmax(180px, 260px) minmax(140px, 1fr) 80px;
            align-items: center;
            gap: 10px;
            font-size: 13px;
          }
          .atlas-bar-label { font-weight: 600; overflow-wrap: anywhere; }
          .atlas-bar-track {
            height: 10px;
            background: #e5e7eb;
            border-radius: 999px;
            overflow: hidden;
          }
          .atlas-bar-fill { height: 100%; background: #2563eb; }
          .atlas-bar-value { text-align: right; color: #374151; }
        </style>
        <div class="atlas-bars">
        """
        + "\n".join(blocks)
        + "</div>"
    )
