# Chunk 03 Course Requirement Audit

Scope: `data/processed/programmes.jsonl` lines 1521-2280 inclusive.

## Totals

- Programmes audited: 760
- Programmes with joined requirement-rule rows: 459
- Programmes without joined requirement-rule rows: 301

## Review Status Counts

- manual_review: 5
- needs_parser_work: 193
- needs_source_cleanup: 460
- ok: 102

## Route Status Counts

| Route | missing | structured | partial | unparsed |
|---|---:|---:|---:|---:|
| form_four | 615 | 137 | 2 | 6 |
| form_six | 414 | 240 | 85 | 21 |
| certificate | 602 | 65 | 67 | 26 |
| diploma | 497 | 39 | 223 | 1 |
| equivalent | 513 | 0 | 0 | 247 |

## Requirement Rule Row Matches

- 0: 301
- 1: 155
- 2: 245
- 3: 9
- 4: 29
- 5: 4
- 6: 1
- 7: 16

## Notes

- Join key used: `normalizedProgrammeName + normalizedInstitutionName`.
- `missing` route status means no parsed rule variant exists for that pathway in joined requirement rules. It does not always mean the programme should accept that pathway.
- `manual_review` rows usually have programme-level flags or route text indicating a pathway that was not present in parsed rule variants.
- `needs_source_cleanup` rows have requirement text that appears fragmented or malformed before parsing.

## Sample Non-OK Rows

- Line 1521: Ordinary Diploma in Human Resource Management / TANZANIA PUBLIC SERVICE COLLEGE - TANGA - needs_parser_work; Expected route(s) need parser work: certificate, equivalent. Rule rows found: 2.
- Line 1522: Ordinary Diploma in Procurement and Supply / TANZANIA PUBLIC SERVICE COLLEGE - TANGA - needs_parser_work; Expected route(s) need parser work: certificate, equivalent. Rule rows found: 2.
- Line 1523: Ordinary Diploma in Public Administration / TANZANIA PUBLIC SERVICE COLLEGE - TANGA - needs_parser_work; Expected route(s) need parser work: form_six, certificate, equivalent. Rule rows found: 2.
- Line 1525: Ordinary Diploma in Secretarial Studies / TANZANIA PUBLIC SERVICE COLLEGE - TANGA - needs_source_cleanup; Requirement text appears fragmented or malformed. Rule rows found: 3. form_four:structured, form_six:partial, certificate:unparsed, diploma:missing, equivalent:unparsed.
- Line 1528: Ordinary Diploma in Public Administration Leadership and Management / TANZANIA PUBLIC SERVICE COLLEGE (TPSC) - MBEYA - needs_source_cleanup; Requirement text appears fragmented or malformed. Rule rows found: 3. form_four:missing, form_six:partial, certificate:partial, diploma:missing, equivalent:unparsed.
- Line 1531: Ordinary Diploma in Human Resource Management / TANZANIA PUBLIC SERVICE COLLEGE (TPSC) - TABORA - needs_parser_work; Expected route(s) need parser work: certificate, equivalent. Rule rows found: 2.
- Line 1534: Ordinary Diploma in in Locomotive Driving Technology / TANZANIA INSTITUTE OF RAIL TECHNOLOGY MOROGORO CAMPUS - needs_parser_work; Expected route(s) need parser work: form_six, certificate, equivalent. Rule rows found: 2.
- Line 1535: Ordinary Diploma in Locomotive Electrical Technology / TANZANIA INSTITUTE OF RAIL TECHNOLOGY MOROGORO CAMPUS - needs_parser_work; Expected route(s) need parser work: form_six, certificate, equivalent. Rule rows found: 2.
- Line 1536: Ordinary Diploma in Locomotive Mechanical Technology / TANZANIA INSTITUTE OF RAIL TECHNOLOGY MOROGORO CAMPUS - needs_parser_work; Expected route(s) need parser work: form_six, certificate, equivalent. Rule rows found: 2.
- Line 1537: Ordinary Diploma in Carriage and Wagon Mechanical Technology / TANZANIA INSTITUTE OF RAIL TECHNOLOGY - TABORA - needs_parser_work; Expected route(s) need parser work: form_six, certificate, equivalent. Rule rows found: 2.
- Line 1538: Ordinary Diploma in Electronics and Communication Engineering / TANZANIA INSTITUTE OF RAIL TECHNOLOGY - TABORA - needs_parser_work; Expected route(s) need parser work: certificate, equivalent. Rule rows found: 1.
- Line 1541: Ordinary Diploma in Track Technology / TANZANIA INSTITUTE OF RAIL TECHNOLOGY - TABORA - needs_parser_work; Expected route(s) need parser work: form_six. Rule rows found: 2.
- Line 1542: Ordinary Diploma in Transport Safety and Railway Accident Management / TANZANIA INSTITUTE OF RAIL TECHNOLOGY - TABORA - needs_parser_work; Expected route(s) need parser work: form_six, equivalent. Rule rows found: 2.
- Line 1543: Ordinary Diploma in Agriculture Production / TANZANIA RESEARCH AND CAREER DEVELOPMENT INSTITUTE (TRACDI) - DODOMA - needs_parser_work; Expected route(s) need parser work: certificate, equivalent. Rule rows found: 2.
- Line 1544: Ordinary Diploma in Animal Health and Production / TANZANIA RESEARCH AND CAREER DEVELOPMENT INSTITUTE (TRACDI) - DODOMA - needs_parser_work; Expected route(s) need parser work: certificate, equivalent. Rule rows found: 1.
- Line 1548: Ordinary Diploma in Diagnostic Radiography / TANZANIA RESEARCH AND CAREER DEVELOPMENT INSTITUTE (TRACDI) - DODOMA - needs_parser_work; Expected route(s) need parser work: form_four. Rule rows found: 1.
- Line 1555: Ordinary Diploma in Accounting and Finance / TENGERU INSTITUTE OF COMMUNITY DEVELOPMENT - needs_parser_work; Expected route(s) need parser work: form_six, certificate. Rule rows found: 2.
- Line 1556: Ordinary Diploma in Community Development / TENGERU INSTITUTE OF COMMUNITY DEVELOPMENT - needs_parser_work; Expected route(s) need parser work: certificate. Rule rows found: 2.
- Line 1558: Ordinary Diploma in Gender and Community Development / TENGERU INSTITUTE OF COMMUNITY DEVELOPMENT - needs_parser_work; Expected route(s) need parser work: certificate. Rule rows found: 2.
- Line 1559: Ordinary Diploma in Human Resource Management / TENGERU INSTITUTE OF COMMUNITY DEVELOPMENT - needs_parser_work; Expected route(s) need parser work: form_six, certificate. Rule rows found: 2.
