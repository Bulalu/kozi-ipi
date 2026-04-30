from __future__ import annotations

import json
from pathlib import Path

from kozi_analysis.overlap import PairOverlap, SourceOverlapReport, SourceSummary
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
