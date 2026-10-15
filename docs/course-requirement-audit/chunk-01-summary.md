# Course Requirement Audit: Chunk 01 Lines 0001-0760

Audited programme rows 1-760 from `data/processed/programmes.jsonl` and joined requirement rules from `data/processed/requirement-rules.jsonl` by normalized programme and institution name.

## Totals

- Programmes audited: 760
- Programmes with joined requirement-rule rows: 760
- Programmes without joined requirement-rule rows: 0

## Review Status Counts

| reviewStatus | count |
| --- | ---: |
| ok | 410 |
| needs_parser_work | 327 |
| needs_source_cleanup | 4 |
| missing_requirements | 0 |
| manual_review | 19 |

## Route Status Counts

| route | structured | partial | unparsed | missing |
| --- | ---: | ---: | ---: | ---: |
| form_four | 645 | 14 | 20 | 81 |
| form_six | 343 | 17 | 68 | 332 |
| certificate | 204 | 192 | 70 | 294 |
| diploma | 8 | 3 | 2 | 747 |
| equivalent | 0 | 0 | 260 | 500 |

## Notes

- `ok` means all listed entry routes found in `entryRouteTypes` have structured rule variants and no programme-level cleanup flag is present.
- `needs_parser_work` is mostly caused by partial or unparsed variants, or by listed entry routes missing from joined rule rows.
- `manual_review` means rules joined, but none of the joined route variants produced structured clauses.

## Sample Rows By Status

### ok
- 1: Ordinary Diploma in Arts with Education / ABDULRAHMAN AL- SUMAIT UNIVERSITY
- 3: Ordinary Diploma in Computing and Information Technology / ABDULRAHMAN AL- SUMAIT UNIVERSITY
- 5: Ordinary Diploma in Office Administration / ABDULRAHMAN AL- SUMAIT UNIVERSITY
- 6: Ordinary Diploma in Science with Education / ABDULRAHMAN AL- SUMAIT UNIVERSITY
- 12: Ordinary Diploma in Computer Science / INSTITUTE OF ACCOUNTANCY ARUSHA (IAA) - ARUSHA

### needs_parser_work
- 2: Ordinary Diploma in Business Information Technology / ABDULRAHMAN AL- SUMAIT UNIVERSITY
- 4: Ordinary Diploma in Counselling and Psychology / ABDULRAHMAN AL- SUMAIT UNIVERSITY
- 7: Ordinary Diploma in Accountancy / INSTITUTE OF ACCOUNTANCY ARUSHA (IAA) - ARUSHA
- 8: Ordinary Diploma in Accountancy with Information Technology / INSTITUTE OF ACCOUNTANCY ARUSHA (IAA) - ARUSHA
- 9: Ordinary Diploma in Business Management / INSTITUTE OF ACCOUNTANCY ARUSHA (IAA) - ARUSHA

### needs_source_cleanup
- 63: Basic Technician in Adult Education and Community Development / INSTITUTE OF ADULT EDUCATION - MWANZA
- 555: Diploma in Accounting and Finance Holders Certificate in Accountancy, Business Administration OR of / UNIVERSITY OF IRINGA
- 602: Ordinary Diploma in Nursing and Midwifery / KAIRUKI SCHOOL OF NURSING
- 663: Ordinary Diploma in Woodwork Technology The minimum entry requirements to the Basic Technician Certificate programme in Woodwork Technology shall be: Certificate of Secondary Education Examination (CSEE) with a minimum pass of four (4) D grades in non-religious subjects OR Candidate with / KARUME INSTITUTE OF SCIENCE AND TECHNOLOGY- ZANZIBAR

### manual_review
- 233: Ordinary Diploma in Information Technology / COLLEGE OF BUSINESS EDUCATION - MWANZA
- 239: Ordinary Diploma in Diagnostic Radiography / BWIMA INSTITUTE OF HEALTH AND ALLIED SCIENCES
- 256: Diploma in Law / CATHOLIC UNIVERSITY COLLEGE OF MBEYA
- 268: Ordinary Diploma in Diagnostic Radiography / CITY COLLEGE OF HEALTH AND ALLIED SCIENCES
- 277: Ordinary Diploma in Diagnostic Radiography / CITY COLLEGE OF HEALTH AND ALLIED SCIENCES - ARUSHA CAMPUS
