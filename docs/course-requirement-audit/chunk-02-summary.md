# Course Requirement Audit - Chunk 02

Scope: `data/processed/programmes.jsonl` lines 761-1520 inclusive.

Rows audited: 760

## Review Status

| Status | Rows |
|---|---:|
| needs_parser_work | 377 |
| needs_source_cleanup | 35 |
| ok | 348 |

## Requirement Rule Join Coverage

| Rule rows found | Programmes |
|---|---:|
| 1 | 413 |
| 10 | 2 |
| 2 | 325 |
| 21 | 1 |
| 3 | 17 |
| 7 | 1 |
| 8 | 1 |

- Programmes with no matching requirement-rule row: 0
- Programmes with multiple matching requirement-rule rows: 347
- Programmes with all accepted routes structured: 348

## Route Status Counts

### form_four

| Route status | Rows |
|---|---:|
| missing | 90 |
| partial | 11 |
| structured | 618 |
| unparsed | 41 |

### form_six

| Route status | Rows |
|---|---:|
| missing | 336 |
| partial | 27 |
| structured | 301 |
| unparsed | 96 |

### certificate

| Route status | Rows |
|---|---:|
| missing | 300 |
| partial | 169 |
| structured | 206 |
| unparsed | 85 |

### diploma

| Route status | Rows |
|---|---:|
| missing | 751 |
| partial | 5 |
| structured | 4 |

### equivalent

| Route status | Rows |
|---|---:|
| missing | 525 |
| unparsed | 235 |

## Main Findings

- All rows in this chunk join to at least one requirement-rule row by normalized programme and institution name.
- The largest parser gap is equivalent-route handling for NVA, trade test, foundation, and related qualifications embedded in otherwise parseable CSEE/ACSEE/certificate requirements.
- Rows marked `needs_source_cleanup` show table/OCR spillover or broken requirement segmentation and should be checked against the official guidebook before parser tuning.

## Needs Parser Work - Sample

- Line 763: Ordinary Diploma in Business Administration — LANDMARK INSTITUTE OF EDUCATION SCIENCE AND TECHNOLOGY
- Line 764: Ordinary Diploma in Educational Management and Administration — LANDMARK INSTITUTE OF EDUCATION SCIENCE AND TECHNOLOGY
- Line 765: Ordinary Diploma in Information and Communication Technology — LANDMARK INSTITUTE OF EDUCATION SCIENCE AND TECHNOLOGY
- Line 767: Technician Certificate in Accountancy — LEGACY COLLEGE OF TOURISM AND BUSINESS STUDIES
- Line 768: Technician Certificate in Business Administration — LEGACY COLLEGE OF TOURISM AND BUSINESS STUDIES
- Line 769: Technician Certificate in Procurement and Supply — LEGACY COLLEGE OF TOURISM AND BUSINESS STUDIES
- Line 774: Ordinary Diploma in Animal Health and Production — LIVESTOCK TRAINING AGENCY BUHURI CAMPUS - TANGA
- Line 775: Ordinary Diploma in Animal Health and Production — LIVESTOCK TRAINING AGENCY MABUKI CAMPUS
- Line 776: Ordinary Diploma in Animal Health and Production — LIVESTOCK TRAINING AGENCY MADABA CAMPUS
- Line 777: Ordinary Diploma in Animal Health and Production — LIVESTOCK TRAINING AGENCY MOROGORO CAMPUS
- Line 778: Ordinary Diploma in Range Management and Tsetse Control — LIVESTOCK TRAINING AGENCY MOROGORO CAMPUS
- Line 779: Ordinary Diploma in Animal Health and Production — LIVESTOCK TRAINING AGENCY MPWAPWA CAMPUS

## Needs Source Cleanup - Sample

- Line 894: Ordinary Diploma in Irrigation Engineering — MINISTRY OF AGRICULTURE TRAINING INSTITUTE IGURUSI - MBEYA
- Line 906: Ordinary Diploma in Agriculture Production — MINISTRY OF AGRICULTURE TRAINING INSTITUTE UYOLE - MBEYA
- Line 907: Ordinary Diploma in Crop Production — MINISTRY OF AGRICULTURE TRAINING INSTITUTE UYOLE - MBEYA
- Line 916: Ordinary Diploma in Community Development — MLALE COMMUNITY DEVELOPMENT TRAINING INSTITUTE (CDTI) - SONGEA
- Line 1008: Ordinary Diploma in Community Development — THE MWALIMU NYERERE MEMORIAL ACADEMY - PEMBA
- Line 1010: Ordinary Diploma in Economics Development — THE MWALIMU NYERERE MEMORIAL ACADEMY - PEMBA
- Line 1011: Ordinary Diploma in Human Resource Management — THE MWALIMU NYERERE MEMORIAL ACADEMY - PEMBA
- Line 1012: Ordinary Diploma in Procurement and Supply — THE MWALIMU NYERERE MEMORIAL ACADEMY - PEMBA
- Line 1037: Ordinary Diploma in Pharmaceutical Sciences — MWANZA POLYTECHNIC INSTITUTE - MASWA
- Line 1059: Ordinary Diploma in Agriculture Production — NATIONAL SUGAR INSTITUTE - KIDATU
- Line 1060: Ordinary Diploma in Sugar Production Technology — NATIONAL SUGAR INSTITUTE - KIDATU
- Line 1067: Technician Certificate in Tour Guiding Operations — NATIONAL COLLEGE OF TOURISM - ARUSHA
