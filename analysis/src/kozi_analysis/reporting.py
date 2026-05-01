from __future__ import annotations

import json
from pathlib import Path

from kozi_analysis.aliases import AliasPairSummary, AliasReport
from kozi_analysis.candidate_export import CandidateComparisonReport
from kozi_analysis.cleanup import CleanupPlanReport
from kozi_analysis.features import FeatureReadinessReport
from kozi_analysis.overlap import PairOverlap, SourceOverlapReport, SourceSummary
from kozi_analysis.p0_design import P0CleanupDesignReport
from kozi_analysis.profiling import InventoryReport


def render_inventory_markdown(report: InventoryReport) -> str:
    lines = [
        "# Data Inventory",
        "",
        "## Question This Answers",
        "",
        "What data files do we have, how large are they, and what columns are "
        "available before we make production data-cleaning decisions?",
        "",
        "## How To Use This Report",
        "",
        "Use this as the map of the data workspace. It does not decide cleaning "
        "rules. It tells us which sources exist, which ones are tabular, and "
        "which fields are available for deeper analysis.",
        "",
        "## Summary",
        "",
        f"- Total files: {report.total_files}",
        f"- Tabular files: {report.tabular_files}",
        "",
        "## Files By Group",
        "",
        "| Group | Files | Rows |",
        "| --- | ---: | ---: |",
    ]

    for group, file_count in report.files_by_group.items():
        rows = report.rows_by_group.get(group, 0)
        lines.append(f"| {group} | {file_count} | {rows} |")

    lines.extend(
        [
            "",
            "## Data Files",
            "",
            "| Path | Rows | Columns | Notes |",
            "| --- | ---: | ---: | --- |",
        ]
    )

    for file in report.files:
        row_count = "" if file.row_count is None else str(file.row_count)
        column_count = "" if file.column_count is None else str(file.column_count)
        notes = ", ".join(file.notes)
        lines.append(f"| `{file.path}` | {row_count} | {column_count} | {notes} |")

    lines.extend(
        [
            "",
            "## Most Reused Column Names",
            "",
            "| Column | File Count |",
            "| --- | ---: |",
        ]
    )

    common_columns = sorted(
        report.columns_by_name.items(), key=lambda item: (-item[1], item[0])
    )[:40]
    for column, count in common_columns:
        lines.append(f"| `{column}` | {count} |")

    lines.extend(
        [
            "",
            "## Next Inspection Prompts",
            "",
            "- Which source groups disagree on institution identity fields?",
            "- Which programme fields are present in raw data but missing in "
            "processed data?",
            "- Which eligibility/pathway columns are sparse, conflicting, or "
            "duplicated?",
            "- Which sources should drive the next source-overlap notebook?",
            "",
        ]
    )

    return "\n".join(lines)


def write_inventory_report(report: InventoryReport, output_dir: Path) -> None:
    output_dir.mkdir(parents=True, exist_ok=True)
    (output_dir / "inventory.md").write_text(
        render_inventory_markdown(report), encoding="utf-8"
    )
    (output_dir / "inventory.json").write_text(
        json.dumps(report.to_dict(), indent=2, sort_keys=True), encoding="utf-8"
    )


def _render_source_summary(title: str, summaries: list[SourceSummary]) -> list[str]:
    lines = [
        f"## {title}",
        "",
        "| Source | Rows | Unique Keys | Blank Keys | Duplicate Keys |",
        "| --- | ---: | ---: | ---: | ---: |",
    ]
    for summary in summaries:
        lines.append(
            f"| `{summary.source}` | {summary.row_count} | "
            f"{summary.unique_key_count} | {summary.blank_key_count} | "
            f"{summary.duplicate_key_count} |"
        )
    return lines


def _render_overlap_table(title: str, overlaps: list[PairOverlap]) -> list[str]:
    lines = [
        f"## {title}",
        "",
        "| Left Source | Right Source | Shared | Left Only | Right Only | Jaccard |",
        "| --- | --- | ---: | ---: | ---: | ---: |",
    ]

    for overlap in sorted(
        overlaps,
        key=lambda item: (-item.shared_count, item.left_source, item.right_source),
    ):
        lines.append(
            f"| `{overlap.left_source}` | `{overlap.right_source}` | "
            f"{overlap.shared_count} | {overlap.left_only_count} | "
            f"{overlap.right_only_count} | {overlap.jaccard:.4f} |"
        )

    return lines


def _render_low_overlap_examples(
    title: str,
    overlaps: list[PairOverlap],
    max_pairs: int = 5,
) -> list[str]:
    lines = [f"## {title}", ""]
    ranked = sorted(overlaps, key=lambda item: (item.jaccard, -item.shared_count))

    for overlap in ranked[:max_pairs]:
        lines.extend(
            [
                f"### `{overlap.left_source}` vs `{overlap.right_source}`",
                "",
                f"- Shared keys: {overlap.shared_count}",
                f"- Jaccard: {overlap.jaccard:.4f}",
                f"- Left-only examples: {', '.join(overlap.left_only_examples[:5])}",
                f"- Right-only examples: {', '.join(overlap.right_only_examples[:5])}",
                "",
            ]
        )

    return lines


def render_source_overlap_markdown(report: SourceOverlapReport) -> str:
    lines = [
        "# Source Overlap",
        "",
        "## Question This Answers",
        "",
        "Which institution and programme records appear to refer to the same "
        "thing across raw, enrichment, extracted, and processed sources?",
        "",
        "## How To Use This Report",
        "",
        "Use this to decide whether exact identity fields are good enough for "
        "production cleaning. Low overlap is not automatically bad data; it can "
        "mean naming drift, campus suffixes, abbreviations, or missing alias "
        "rules.",
        "",
        "This report uses exact normalized identity keys. Low overlap can mean true "
        "source difference, key drift, missing institution context, or the need "
        "for a future fuzzy matching pass.",
        "",
    ]

    lines.extend(
        _render_source_summary("Institution Sources", report.institution_sources)
    )
    lines.append("")
    lines.extend(_render_source_summary("Programme Sources", report.programme_sources))
    lines.append("")
    lines.extend(
        _render_overlap_table("Institution Pair Overlap", report.institution_overlaps)
    )
    lines.append("")
    lines.extend(
        _render_overlap_table("Programme Pair Overlap", report.programme_overlaps)
    )
    lines.append("")
    lines.extend(
        _render_low_overlap_examples(
            "Low Institution Overlap Examples", report.institution_overlaps
        )
    )
    lines.append("")
    lines.extend(
        _render_low_overlap_examples(
            "Low Programme Overlap Examples", report.programme_overlaps
        )
    )
    lines.extend(
        [
            "## Next Inspection Prompts",
            "",
            "- Which low-overlap source pairs need synonym or alias matching?",
            "- Which fallback-only institutions are real coverage wins?",
            "- Which processed records cannot be traced back to canonical sources?",
            "- Which programme keys need programme-code-aware matching?",
            "",
        ]
    )

    return "\n".join(lines)


def write_source_overlap_report(
    report: SourceOverlapReport,
    output_dir: Path,
) -> None:
    output_dir.mkdir(parents=True, exist_ok=True)
    (output_dir / "source-overlap.md").write_text(
        render_source_overlap_markdown(report), encoding="utf-8"
    )
    (output_dir / "source-overlap.json").write_text(
        json.dumps(report.to_dict(), indent=2, sort_keys=True), encoding="utf-8"
    )


def _render_alias_pair(pair: AliasPairSummary) -> list[str]:
    lines = [
        f"## `{pair.left_source}` vs `{pair.right_source}`",
        "",
        f"- Left records inspected: {pair.left_count}",
        f"- Right records inspected: {pair.right_count}",
        f"- Candidate examples shown: {pair.candidate_count}",
        f"- High-confidence examples shown: {pair.high_confidence_count}",
        "",
        "| Score | Reason | Left | Right | Context |",
        "| ---: | --- | --- | --- | --- |",
    ]

    for candidate in pair.examples:
        context = " / ".join(
            item for item in [candidate.left_context, candidate.right_context] if item
        )
        lines.append(
            f"| {candidate.score:.4f} | {candidate.reason} | "
            f"{candidate.left_name} | {candidate.right_name} | {context} |"
        )

    return lines


def render_alias_markdown(report: AliasReport) -> str:
    lines = [
        "# Identity Aliases",
        "",
        "## Question This Answers",
        "",
        "Which institution and programme names look like they may refer to the "
        "same thing even when exact matching fails?",
        "",
        "## How To Use This Report",
        "",
        "Use this as a review queue for alias and fuzzy-matching rules. These are "
        "candidate matches only; they are not production merge decisions.",
        "",
        "## Institution Alias Candidates",
        "",
    ]

    for pair in report.institution_pairs:
        lines.extend(_render_alias_pair(pair))
        lines.append("")

    lines.extend(["## Programme Alias Candidates", ""])
    for pair in report.programme_pairs:
        lines.extend(_render_alias_pair(pair))
        lines.append("")

    lines.extend(
        [
            "## Next Inspection Prompts",
            "",
            "- Which candidate rules are safe enough to encode as deterministic "
            "normalization?",
            "- Which matches need a manual alias table instead of fuzzy matching?",
            "- Which programme candidates are title leaks rather than aliases?",
            "- Which candidate groups should block production export replacement?",
            "",
        ]
    )

    return "\n".join(lines)


def write_alias_reports(report: AliasReport, output_dir: Path) -> None:
    output_dir.mkdir(parents=True, exist_ok=True)
    (output_dir / "identity-aliases.md").write_text(
        render_alias_markdown(report), encoding="utf-8"
    )
    (output_dir / "identity-aliases.json").write_text(
        json.dumps(report.to_dict(), indent=2, sort_keys=True), encoding="utf-8"
    )


def render_feature_readiness_markdown(report: FeatureReadinessReport) -> str:
    lines = [
        "# Feature Readiness",
        "",
        "## Question This Answers",
        "",
        "Which processed fields are strong, partial, or weak for the product "
        "features Kozi Ipi needs?",
        "",
        "## How To Use This Report",
        "",
        "Use this to choose data cleanup priorities. Weak coverage does not always "
        "block a feature, but it shows where the UI or data pipeline needs "
        "fallbacks, enrichment, or clearer expectations.",
        "",
        "## Area Summary",
        "",
        "| Area | Fields Checked | Average Coverage | Weak Fields |",
        "| --- | ---: | ---: | ---: |",
    ]

    for summary in report.area_summaries:
        lines.append(
            f"| `{summary.area}` | {summary.field_count} | "
            f"{summary.average_coverage_percent:.2f}% | {summary.weak_field_count} |"
        )

    lines.extend(
        [
            "",
            "## Field Coverage",
            "",
            "| Area | Dataset | Field | Coverage | Status | Required For |",
            "| --- | --- | --- | ---: | --- | --- |",
        ]
    )

    for coverage in sorted(
        report.field_coverages,
        key=lambda item: (item.area, item.coverage_percent, item.dataset, item.field),
    ):
        lines.append(
            f"| `{coverage.area}` | `{coverage.dataset}` | `{coverage.field}` | "
            f"{coverage.coverage_percent:.2f}% | {coverage.status} | "
            f"{coverage.required_for} |"
        )

    weak_fields = [
        coverage for coverage in report.field_coverages if coverage.status == "weak"
    ]
    lines.extend(["", "## Weak Field Examples", ""])
    for coverage in weak_fields:
        lines.extend(
            [
                f"### `{coverage.dataset}.{coverage.field}`",
                "",
                f"- Coverage: {coverage.coverage_percent:.2f}%",
                f"- Required for: {coverage.required_for}",
                "- Missing examples:",
                *[f"  - {example}" for example in coverage.missing_examples],
                "",
            ]
        )

    lines.extend(
        [
            "## Next Inspection Prompts",
            "",
            "- Which weak fields are acceptable for MVP with UI fallbacks?",
            "- Which weak fields need deterministic enrichment before export "
            "replacement?",
            "- Which feature promises should be delayed until source coverage is "
            "stronger?",
            "- Which processed fields are present but semantically unreliable?",
            "",
        ]
    )

    return "\n".join(lines)


def write_feature_readiness_reports(
    report: FeatureReadinessReport,
    output_dir: Path,
) -> None:
    output_dir.mkdir(parents=True, exist_ok=True)
    (output_dir / "feature-readiness.md").write_text(
        render_feature_readiness_markdown(report), encoding="utf-8"
    )
    (output_dir / "feature-readiness.json").write_text(
        json.dumps(report.to_dict(), indent=2, sort_keys=True), encoding="utf-8"
    )


def render_cleanup_plan_markdown(report: CleanupPlanReport) -> str:
    lines = [
        "# Cleanup Plan",
        "",
        "## Question This Answers",
        "",
        "What cleanup and enrichment tasks should happen before the Marimo/Python "
        "pipeline replaces the current TypeScript data builder?",
        "",
        "## How To Use This Report",
        "",
        "Use this as the planning queue. It turns current evidence into tasks, but "
        "does not mutate source or processed data.",
        "",
        "## Prioritized Tasks",
        "",
        "| Priority | Area | Task | Evidence | Next Action |",
        "| --- | --- | --- | --- | --- |",
    ]

    for task in report.tasks:
        lines.append(
            f"| {task.priority} | `{task.area}` | {task.title} | "
            f"{task.evidence} | {task.next_action} |"
        )

    lines.extend(
        [
            "",
            "## Next Inspection Prompts",
            "",
            "- Which P0 tasks block production export replacement?",
            "- Which P1/P2 tasks can become enrichment backlog instead of blockers?",
            "- Which tasks need a manual review file or deterministic code change?",
            "- Which tasks should become tests before replacing `data:build`?",
            "",
        ]
    )

    return "\n".join(lines)


def write_cleanup_plan_reports(
    report: CleanupPlanReport,
    output_dir: Path,
) -> None:
    output_dir.mkdir(parents=True, exist_ok=True)
    (output_dir / "cleanup-plan.md").write_text(
        render_cleanup_plan_markdown(report), encoding="utf-8"
    )
    (output_dir / "cleanup-plan.json").write_text(
        json.dumps(report.to_dict(), indent=2, sort_keys=True), encoding="utf-8"
    )


def render_p0_cleanup_design_markdown(report: P0CleanupDesignReport) -> str:
    lines = [
        "# P0 Cleanup Design",
        "",
        "## Question This Answers",
        "",
        "Which P0 cleanup tasks should become deterministic code, manual review "
        "files, and tests?",
        "",
        "## How To Use This Report",
        "",
        "Use this as the implementation boundary. It proposes rule queues and "
        "test assertions only; it does not mutate processed data.",
        "",
        "## Deterministic Identity Rule Queue",
        "",
        "| Rule ID | Rule | Left Example | Right Example | Test Assertion |",
        "| --- | --- | --- | --- | --- |",
    ]

    for candidate in report.deterministic_identity_rules:
        lines.append(
            f"| `{candidate.rule_id}` | {candidate.rule_name} | "
            f"{candidate.example_left} | {candidate.example_right} | "
            f"{candidate.test_assertion} |"
        )

    lines.extend(
        [
            "",
            "## Manual Alias Review Queue",
            "",
            "| Reason | Left Name | Right Name | Context | Review Question |",
            "| --- | --- | --- | --- | --- |",
        ]
    )

    for candidate in report.manual_alias_review_candidates:
        context = " / ".join(
            item for item in [candidate.left_context, candidate.right_context] if item
        )
        lines.append(
            f"| {candidate.reason} | {candidate.left_name} | "
            f"{candidate.right_name} | {context} | {candidate.review_question} |"
        )

    lines.extend(
        [
            "",
            "## Equivalent Applicant Pathway Tasks",
            "",
            "| Task | Evidence | Boundary | Test Assertion |",
            "| --- | --- | --- | --- |",
        ]
    )

    for task in report.equivalent_pathway_tasks:
        lines.append(
            f"| {task.task} | {task.evidence} | {task.design_boundary} | "
            f"{task.test_assertion} |"
        )

    lines.extend(
        [
            "",
            "## Next Inspection Prompts",
            "",
            "- Which deterministic candidates should become code first?",
            "- Which manual-review candidates need a committed review file?",
            "- Which equivalent-pathway cases need new parser states or review "
            "reasons?",
            "- Which assertions should become tests before replacing `data:build`?",
            "",
        ]
    )

    return "\n".join(lines)


def write_p0_cleanup_design_reports(
    report: P0CleanupDesignReport,
    output_dir: Path,
) -> None:
    output_dir.mkdir(parents=True, exist_ok=True)
    (output_dir / "p0-cleanup-design.md").write_text(
        render_p0_cleanup_design_markdown(report), encoding="utf-8"
    )
    (output_dir / "p0-cleanup-design.json").write_text(
        json.dumps(report.to_dict(), indent=2, sort_keys=True), encoding="utf-8"
    )


def render_candidate_comparison_markdown(
    report: CandidateComparisonReport,
) -> str:
    lines = [
        "# Candidate Export Comparison",
        "",
        "## Question This Answers",
        "",
        "Can the Python export path produce candidate processed files behind the "
        "current production contract?",
        "",
        "## How To Use This Report",
        "",
        "Use this as the replacement gate for `bun run data:build`. A clean "
        "copy-through run proves the candidate output location and comparison "
        "checks work before we replace one transformation slice at a time.",
        "",
        "## Summary",
        "",
        f"- Copied files: {len(report.copied_files)}",
        f"- Files compared: {len(report.files)}",
        f"- All hashes equal: {report.all_hashes_equal}",
        "",
        "## File Contract",
        "",
        "| File | Present | Rows | Hashes Equal | Fields Equal | Blank Keys | "
        "Review Equal | Sources Equal | Pathways Equal | Parse Status Equal |",
        "| --- | --- | ---: | --- | --- | ---: | --- | --- | --- | --- |",
    ]

    for file in report.files:
        present = f"{file.current_exists}/{file.candidate_exists}"
        rows = (
            ""
            if file.current_record_count is None or file.candidate_record_count is None
            else f"{file.current_record_count}/{file.candidate_record_count}"
        )
        blank_keys = "" if file.blank_key_count is None else str(file.blank_key_count)
        lines.append(
            f"| `{file.name}` | {present} | {rows} | {file.hashes_equal} | "
            f"{file.field_sets_equal} | {blank_keys} | "
            f"{file.needs_review_distribution_equal} | "
            f"{file.source_datasets_distribution_equal} | "
            f"{file.applicant_pathway_distribution_equal} | "
            f"{file.parse_status_distribution_equal} |"
        )

    changed = [
        (file.name, sample)
        for file in report.files
        for sample in file.changed_record_samples
    ]
    lines.extend(["", "## Changed Record Samples", ""])
    if changed:
        for name, sample in changed:
            lines.append(f"- `{name}`: {sample}")
    else:
        lines.append("- No changed records in the sampled comparison.")

    lines.extend(
        [
            "",
            "## Next Inspection Prompts",
            "",
            "- Which transformation slice can replace copy-through first?",
            "- Which contract checks should become hard failures in CI?",
            "- Which candidate differences are intended improvements versus "
            "regressions?",
            "- Which processed JSON files still need compatibility handling?",
            "",
        ]
    )

    return "\n".join(lines)


def write_candidate_comparison_reports(
    report: CandidateComparisonReport,
    output_dir: Path,
) -> None:
    output_dir.mkdir(parents=True, exist_ok=True)
    (output_dir / "candidate-vs-current.md").write_text(
        render_candidate_comparison_markdown(report), encoding="utf-8"
    )
    (output_dir / "candidate-vs-current.json").write_text(
        json.dumps(report.to_dict(), indent=2, sort_keys=True), encoding="utf-8"
    )
