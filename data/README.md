# Kozi Ipi Data

This folder stores education datasets used by Kozi Ipi.

## Raw Datasets

### `raw/tanzania-education-pathways-dataset`

Recommended canonical dataset.

- 621 raw institution records
- 2,916 raw programme records
- 4,503 raw entry requirement records
- Covers Form Four, Form Six, certificate, diploma, and equivalent entry routes
- Includes `entry_requirements.csv` so eligibility can be modeled as separate route rows instead of one programme-level note

### `raw/tanzania-post-form-four-dataset`

Fallback baseline dataset retained for coverage.

- 631 institution records
- 2,743 programme records
- Broader coverage across NACTVET, VETA, TCU, Ministry teacher pathways, and Zanzibar vocational sources
- Useful for preserving current-only institutions/programmes that are not present in the broader pathway export

## Current Processed Output

The processed import keeps a conservative union of the pathway export and current fallback data:

- 742 institution records
- 4,551 programme records
- 5,358 entry requirement records
- 5,358 parsed requirement rule records
- 69 verified institution logos from local enrichment

### `raw/tanzania-education-dataset`

Useful secondary source dataset.

- 503 institution records
- 1,771 programme records
- Stronger NACTVET-focused fields such as `entry_route_types`, `admission_capacity`, `registration_number_as_shown`, and `accepts_form_four_direct`
- Useful for enrichment and cross-checking against the broader baseline dataset

## Recommended Data Flow

```text
raw CSV exports
-> schema validation
-> normalization
-> conservative union/deduplication
-> enrichment
-> parsed requirement rules
-> processed import files
-> backend database import
```

## Next Cleanup Priorities

- Normalize column names across datasets.
- Preserve original raw files without manual edits.
- Create processed institution, programme, and entry-requirement import files from the broader pathway dataset.
- Merge useful NACTVET-specific fields from the education dataset where institution/programme records match.
- Add search fields such as `search_text`, `career_keywords`, `swahili_keywords`, and `aliases`.
- Validate required fields before import.
- Flag missing contacts, fees, websites, application URLs, and accreditation details for enrichment.
