# Chunk 06 Course Requirement Audit

Scope: `data/processed/programmes.jsonl` lines 3801-4551 inclusive.

## Totals

- Programme rows audited: 751
- Rows with programme-level minimumEntryRequirements: 560
- Rows missing programme-level minimumEntryRequirements: 191
- Rows with exact normalized requirement-rule joins: 0
- Rows without exact normalized requirement-rule joins: 751

## Review Status

- needs_parser_work: 481
- missing_requirements: 191
- needs_source_cleanup: 79

## Detected Route Coverage

- form_six: 473
- form_four: 250
- certificate: 115
- diploma: 8
- equivalent: 6

## Route Status Counts

- equivalent:missing: 745
- diploma:missing: 743
- certificate:missing: 636
- form_four:missing: 501
- form_six:unparsed: 473
- form_six:missing: 278
- form_four:unparsed: 250
- certificate:unparsed: 115
- diploma:unparsed: 8
- equivalent:unparsed: 6

## Regulators

- TCU: 326
- NACTVET: 187
- VETA: 174
- Ministry: 47
- Zanzibar authority: 17

## Award Levels

- degree: 326
- vocational certificate: 184
- ordinary diploma: 170
- unknown: 54
- certificate: 10
- short course: 7

## Notes

- No programme in this chunk had an exact requirement-rule join by `normalizedProgrammeName + normalizedInstitutionName`; the JSONL preserves this as `requirementRuleRowsFound: 0` for every row.
- Detected route coverage is inferred from programme-level requirement text only when joined rule rows are absent.
- Rows with requirement text but no joined rules are marked `needs_parser_work` unless the programme row already indicates source metadata cleanup is needed.
- Rows without programme-level requirement text and without joined rules are marked `missing_requirements`.
