# Chunk 04 Course Requirement Audit

Programme lines audited: 2281-3040 inclusive (760 rows).

## Join Coverage

- Exact normalized programme+institution matches: 523
- Programmes without matched requirement-rule rows: 237
- Requirement-rule rows joined to this chunk: 880

## Review Status Counts

- ok: 10
- needs_parser_work: 134
- needs_source_cleanup: 20
- missing_requirements: 596
- manual_review: 0

## Route Status Matrix

| Route | Missing | Structured | Partial | Unparsed |
| --- | ---: | ---: | ---: | ---: |
| form_four | 760 | 0 | 0 | 0 |
| form_six | 603 | 110 | 46 | 1 |
| certificate | 745 | 4 | 11 | 0 |
| diploma | 597 | 37 | 126 | 0 |
| equivalent | 652 | 0 | 0 | 108 |

## Main Findings

- 343 rows, mostly vocational listings, explicitly say the source used does not state programme-specific academic entry requirements.
- 614 rows carry programme-level review reasons from the processed programme corpus, commonly PDF extraction issues around duration, admission capacity, or point parsing.
- Rows marked `missing_requirements` either have no exact joined requirement-rule row, have advertised routes without rule coverage, or have source text that does not state programme-specific requirements.
- Rows marked `needs_parser_work` have joined rule rows, but at least one route variant remains partial or unparsed.

## Largest Groups Without Exact Rule Joins

- archbishop mihayo tabora amucta: 59
- sokoine agriculture: 34
- open tanzania: 31
- business education cbe: 14
- abdulrahman al sumait: 14
- mineral resources madini dodoma: 12
- st john s tanzania: 9
- water: 9
- stella maris mtwara: 7
- tengeru community development: 7
- dar es salaam: 6
- arusha technical arusha: 6

## Recommended Follow-up

- Prioritize adding or repairing requirement-rule rows for exact programme/institution keys with advertised ACSEE, diploma, certificate, or equivalent routes.
- For VETA/ZVTA-style vocational rows whose source text does not state academic requirements, verify the official source before adding eligibility rules.
- Improve parser coverage for partial/unparsed variants after source coverage gaps are separated from parser gaps.
