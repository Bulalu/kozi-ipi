# Eligibility Review Index

Date: 2026-04-29

This folder contains the exhaustive eligibility requirement review for the
current processed corpus. The review covers all programme rows by regulator:

| Regulator group | Programme rows |
| --- | ---: |
| TCU | 1,524 |
| NACTVET | 2,180 |
| VETA, Ministry, Zanzibar, and other regulators | 847 |
| **Total processed programmes** | **4,551** |

The detailed reports split those regulator groups by domain. Some domain reports
intentionally overlap noisy field categories so parser work does not miss
misclassified programmes. Use the regulator totals above as the corpus coverage
baseline.

## Reports

| Report | Purpose |
| --- | --- |
| [TCU STEM](./tcu-stem.md) | Degree-side health, medicine, engineering, ICT, science, agriculture, built environment, and related programmes |
| [TCU Non-STEM](./tcu-non-stem.md) | Degree-side business, education, arts, law, social sciences, language, media, tourism, and related programmes |
| [NACTVET Technical](./nactvet-technical.md) | Ordinary diploma/certificate technical, health, ICT, engineering, construction, agriculture, science, and environment programmes |
| [NACTVET Non-Technical](./nactvet-non-technical.md) | Ordinary diploma/certificate business, accounting, procurement, education, community development, tourism, media, law, and other non-STEM programmes |
| [Vocational And Other Regulators](./vocational-and-other-regulators.md) | VETA, Ministry, ZVTA/VTA Zanzibar, Zanzibar authority, and remaining non-TCU/non-NACTVET rows |

## Main Parser Priorities

1. Parse named CSEE subject requirements, including `including` and
   `at least N of` patterns.
2. Parse ACSEE subject groups from raw text, not only from `requiredSubjects`.
3. Support ACSEE per-subject grade floors.
4. Support ACSEE subsidiary-pass requirements.
5. Split OR branches into separate variants instead of marking all `or` text as
   partial.
6. Improve prior-award extraction for NTA Level 4, diploma, FTC, NVA, Trade
   Test, and OUT Foundation alternatives.
7. Clean PDF extraction noise before parsing requirements.

## Product Rule

The eligibility UI may use combinations and programme interests to narrow
candidates, but final eligibility must continue to come from structured
requirement clauses evaluated against subjects, grades, prior awards, and route.
