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

- 734 institution records
- 3,915 programme records
- 4,626 entry requirement records
- 5,235 parsed requirement rule records
- 69 verified institution logos from local enrichment

## TCU Degree Layer

TCU Bachelor's degree programmes are keyed by the TCU programme code printed
in the official 2025/26 admission guidebook for holders of secondary school
qualifications (6 October 2025 edition, `tcu.go.tz` public notice PDF).

```sh
bun run tcu:extract "<path to the guidebook PDF>"   # needs poppler's pdftotext
bun run data:build
```

`scripts/extract-tcu-secondary-guidebook.ts` reads pdftotext word boxes and
splits the Programme / Code / Admission Requirements / points / capacity /
duration columns by position. It writes
`extracted/tcu-secondary-guidebook-2025-2026-programmes.csv` (one row per
code, including `minimumAdmissionPoints` and, for "5 from 3 subjects",
`minimumAdmissionPointsSubjects`) and a comparison JSON.

The build then:

- resolves each guidebook institution heading (main campus or branch) to a
  processed institution;
- merges every other TCU degree row onto the guidebook row with the same code,
  or the same title at the same institution, so the guidebook title,
  institution, capacity and points win;
- recovers codes from leaked titles such as
  `Bachelor of Science in Environmental Sciences DM079 Two principal passes…`;
- drops TCU degree rows that still have no code (older guidebook parses and
  prospectus supplements the 2025/26 guidebook does not list) and lists them
  in the coverage report;
- re-points pathway entry requirements at the final programme identity and
  drops Form Six-only rows superseded by the guidebook requirement.

`processed/tcu-coverage-report.json` lists, per guidebook institution, the
guidebook programme count, the processed TCU degree count, missing codes and
extra records, plus the dropped and repaired records.

Coverage as of this build:

| | Before | After |
| --- | ---: | ---: |
| TCU degree programmes | 1,410 | 890 |
| TCU degrees with a programme code | 811 (58%) | 890 (100%) |
| Guidebook codes published | 801 of 855 extracted | 882 of 882 |
| TCU degrees with capacity / minimum points | 786 / 0 | 888 / 882 |
| Form Six variants structured / partial / unparsed | 940 / 345 / 68 | 674 / 211 / 0 |
| TCU degrees without a Form Six variant / rule | 96 / 15 | 8 / 0 |
| Quarantined title leaks | 21 | 2 (non-TCU) |
| Institutions with no programmes | 27 | 20 (Ministry FDCs, one VTC) |

Every guidebook institution now has all of its codes. The 8 coded TCU degrees
that the secondary guidebook does not list come from the pathways dataset
(e.g. AKU02, MH015, SU028) and are listed as extra records. TCU fees are not
in the guidebook, so `feesIfAvailable` is still empty for TCU degrees.

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
