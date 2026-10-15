# Data Integration Plan

Kozi Ipi currently works from three raw datasets:

- `data/raw/tanzania-education-pathways-dataset`: canonical base dataset.
- `data/raw/tanzania-post-form-four-dataset`: fallback coverage dataset.
- `data/raw/tanzania-education-dataset`: NACTVET-focused enrichment dataset.

The pathways dataset stays canonical because it includes institution, programme, and entry-requirement rows across Form Four, Form Six, certificate, diploma, and equivalent routes. The post-Form Four dataset is retained as a conservative fallback for current-only institutions/programmes that are absent from the pathways export. The NACTVET-focused dataset is used only to enrich matching rows with useful extra fields.

## Merge Strategy

```text
pathways institutions
-> merge matching fallback/current-only rows where needed
-> merge matching NACTVET institution enrichment
-> processed institutions

pathways programmes
-> merge matching fallback/current-only rows where needed
-> merge matching NACTVET programme enrichment
-> add search keywords and review flags
-> processed programmes

pathways entry requirements
-> preserve route rows as the canonical eligibility source
-> processed entry requirements
-> parsed requirement rules for deterministic eligibility evaluation
```

Matching uses normalized institution names and programme tuples:

```text
normalized_programme_name + institution_name + award_level
```

The raw CSVs must not be manually edited. All cleanup should happen through scripts so the process is repeatable.

## Output Files

Run:

```sh
bun run data:build
```

This generates:

```text
data/processed/institutions.json
data/processed/institutions.jsonl
data/processed/programmes.json
data/processed/programmes.jsonl
data/processed/entry-requirements.json
data/processed/entry-requirements.jsonl
data/processed/requirement-rules.json
data/processed/requirement-rules.jsonl
data/processed/data-quality-report.json
```

Use the JSONL files for backend imports once the backend is installed.

For Convex dev imports:

```sh
bun run data:import
```

For Convex production imports:

```sh
bun run data:import:prod
```

## Review Flags

Rows are flagged with:

```text
needsReview
reviewReasons
```

Examples:

```text
programme_name_looks_incomplete
unknown_award_level
missing_entry_requirements
missing_duration
missing_region
missing_registration_number
missing_website
missing_phone_numbers
not_high_confidence
```

Search should demote rows with `needsReview = true` until they are verified or cleaned.
