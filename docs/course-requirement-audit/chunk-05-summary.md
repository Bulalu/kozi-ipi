# Chunk 05 Requirement Audit Summary

Scope: `data/processed/programmes.jsonl` lines 3041-3800 inclusive.

## Counts

- Programmes audited: 760
- Requirement-rule rows joined: 147
- Exact normalized key matches: 0
- Canonical normalized key matches: 66
- Programmes with no joined requirement-rule rows: 694

## Review Status

| Status | Programmes |
| --- | ---: |
| needs_parser_work | 278 |
| needs_source_cleanup | 278 |
| missing_requirements | 191 |
| ok | 13 |

## Route Status Coverage

| Route | Structured | Partial | Unparsed | Missing |
| --- | ---: | ---: | ---: | ---: |
| form_four | 6 | 0 | 279 | 475 |
| form_six | 39 | 17 | 360 | 344 |
| certificate | 3 | 4 | 214 | 539 |
| diploma | 4 | 49 | 4 | 703 |
| equivalent | 0 | 0 | 47 | 713 |

## Regulators

| Regulator | Programmes |
| --- | ---: |
| NACTVET | 275 |
| TCU | 225 |
| VETA | 171 |
| Ministry | 69 |
| Zanzibar authority | 20 |

## Award Levels

| Award level | Programmes |
| --- | ---: |
| ordinary diploma | 266 |
| degree | 225 |
| vocational certificate | 183 |
| unknown | 71 |
| short course | 8 |
| certificate | 7 |

## Notes

- No exact normalized programme/institution key joins were available in this chunk because programme-name normalization differs between `programmes.jsonl` and `requirement-rules.jsonl` for stop words such as "of", "in", and "and". A conservative canonical join found 66 programmes.
- Rows with processed `minimumEntryRequirements` but no joined rule rows are marked as parser work with inferred route types only; the audit does not invent structured eligibility decisions.
- VETA rows without programme-level academic entry text are marked as missing requirements, because the processed source only lists offerings/training levels.
- Source-cleanup flags are concentrated in rows where the processed requirement text appears to include duration/fee/source-table spillover or existing processed-data review flags such as unknown award level.
