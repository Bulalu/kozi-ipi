# Course Requirement Audit Summary

Date: 2026-04-30

This is the course-by-course audit requested for the full processed programme
corpus.

## Coverage

The audit covers every row in `data/processed/programmes.jsonl`.

| Chunk | Programme lines | Rows |
| --- | --- | ---: |
| 01 | 1-760 | 760 |
| 02 | 761-1520 | 760 |
| 03 | 1521-2280 | 760 |
| 04 | 2281-3040 | 760 |
| 05 | 3041-3800 | 760 |
| 06 | 3801-4551 | 751 |
| **Total** | **1-4551** | **4,551** |

Aggregate validation:

- Total audited rows: 4,551
- Missing line numbers: 0
- Duplicate line numbers: 0

## Regulator Coverage

| Regulator | Rows |
| --- | ---: |
| NACTVET | 2,180 |
| TCU | 1,524 |
| VETA | 642 |
| Ministry | 122 |
| ZVTA/VTA Zanzibar | 46 |
| Zanzibar authority | 37 |

## Review Status

| Status | Rows | Meaning |
| --- | ---: | --- |
| `ok` | 883 | Current joined rule coverage is usable for this audit pass |
| `needs_parser_work` | 1,790 | Requirement text exists, but parser/rule coverage needs improvement |
| `needs_source_cleanup` | 876 | Source extraction or programme metadata is noisy before eligibility can be trusted |
| `missing_requirements` | 978 | Programme-level requirements or joined rules are missing |
| `manual_review` | 24 | Joined rules exist, but the route logic needs human review |

## Initial Rule Join Coverage

| Metric | Rows |
| --- | ---: |
| Programmes with at least one joined requirement-rule row | 2,568 |
| Programmes without a joined requirement-rule row | 1,983 |

The initial audit showed that the largest issue was not only parser quality.
Many programmes had usable programme-level requirement text, but no exact
`requirement-rules` row joined by normalized programme and institution keys.

## Current Rule Coverage After Repair

`scripts/build-processed-data.ts` now creates fallback parsed rules from
programme-level `minimumEntryRequirements` when no exact entry-requirement rule
already exists.

| Metric | Rows |
| --- | ---: |
| Requirement rules created from programme-level fallback text | 1,637 |
| Programmes with exact requirement-rule coverage | 4,142 |
| Programmes without exact requirement-rule coverage | 409 |
| Programmes with requirement text but no exact rule | 0 |

The remaining 409 rows do not have programme-level requirement text in the
processed source data. Those need source collection or upstream dataset cleanup,
not parser work.

## Chunk Artifacts

Each chunk has a one-row-per-course JSONL file and a summary:

- [chunk-01-lines-0001-0760.jsonl](./chunk-01-lines-0001-0760.jsonl)
- [chunk-01-summary.md](./chunk-01-summary.md)
- [chunk-02-lines-0761-1520.jsonl](./chunk-02-lines-0761-1520.jsonl)
- [chunk-02-summary.md](./chunk-02-summary.md)
- [chunk-03-lines-1521-2280.jsonl](./chunk-03-lines-1521-2280.jsonl)
- [chunk-03-summary.md](./chunk-03-summary.md)
- [chunk-04-lines-2281-3040.jsonl](./chunk-04-lines-2281-3040.jsonl)
- [chunk-04-summary.md](./chunk-04-summary.md)
- [chunk-05-lines-3041-3800.jsonl](./chunk-05-lines-3041-3800.jsonl)
- [chunk-05-summary.md](./chunk-05-summary.md)
- [chunk-06-lines-3801-4551.jsonl](./chunk-06-lines-3801-4551.jsonl)
- [chunk-06-summary.md](./chunk-06-summary.md)

## What This Means

We now have a concrete course-level audit, not only pattern-level parser notes.
The fallback repair has handled the join gap for all programmes that already
carry requirement text. The next implementation work should focus on:

1. collecting missing requirement text for the remaining 409 source-missing rows
2. cleaning noisy source extraction rows marked `needs_source_cleanup`
3. improving parser support for rows marked `needs_parser_work`
4. manually reviewing the 24 `manual_review` cases

Do not manually patch Convex rows one by one unless a source row is genuinely
one-off and cannot be represented by parser logic.
