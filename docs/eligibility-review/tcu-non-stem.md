# TCU Non-STEM Eligibility Requirement Review

Reviewed files:

- `data/processed/programmes.jsonl`
- `data/processed/requirement-rules.jsonl`

Scope: TCU bachelor/degree programmes in business, economics, accounting, procurement, management, education, arts, law, social sciences, community development, language, media, public administration, tourism, religious studies, and related non-STEM areas. Rows in `other` / `other needs classification` were included only when the programme title was clearly non-STEM; obvious health, ICT, engineering, science, built-environment, and agriculture rows were excluded even when their category was noisy.

## Counts

| Metric | Count |
| --- | ---: |
| In-scope programme rows reviewed | 934 |
| Matching requirement-rule rows reviewed | 569 |
| Unique raw requirement patterns | 497 |
| Requirement variants reviewed | 786 |

Programme rows by processed field category:

| Field category | Rows |
| --- | ---: |
| business finance management | 334 |
| business | 172 |
| education | 139 |
| arts media communication | 79 |
| accounting | 42 |
| arts | 36 |
| other | 28 |
| law public administration | 23 |
| social work | 18 |
| social sciences community development | 14 |
| other needs classification | 13 |
| law | 10 |
| community development | 8 |
| media | 5 |
| tourism hospitality | 5 |
| religious studies | 4 |
| tourism | 2 |
| procurement | 1 |
| vocational trade | 1 |

Variant parse status by route:

| Route | Structured | Partial | Unparsed | Total variants |
| --- | ---: | ---: | ---: | ---: |
| form_six | 36 | 240 | 7 | 283 |
| certificate | 0 | 17 | 0 | 17 |
| diploma | 7 | 278 | 1 | 286 |
| equivalent | 0 | 0 | 200 | 200 |
| Total | 43 | 535 | 208 | 786 |

Requirement-rule rows by route membership:

| Route | Requirement rows |
| --- | ---: |
| form_six | 283 |
| certificate | 17 |
| diploma | 286 |
| equivalent | 200 |

## Repeated Raw Requirement Pattern Groups

The dominant pattern is a broad TCU Form Six subject pool: "Two principal passes in the following subjects: History, Geography, Kiswahili, English Language, French, Arabic, Fine Arts, Economics, Commerce, Accountancy, Physics, Chemistry, Biology, Advanced Mathematics, Agriculture, Computer Science or Nutrition." Minor capitalization, punctuation, spelling, and PDF-extraction variants account for many of the 497 unique strings.

| Group | Rows | Current parser result | Target structure |
| --- | ---: | --- | --- |
| Broad Form Six subject pool | 48+ exact/repeated rows, many one-off noisy variants | Mostly `partial` because `or` and subject-list specificity are treated as incomplete | `min_acsee_principal_passes count: 2`; `min_acsee_points points: 4`; `subject_group level: "acsee", mode: "at_least_n_of", count: 2, subjects: [history, geography, kiswahili, english_language, french, arabic, fine_arts, economics, commerce, accountancy, physics, chemistry, biology, advanced_mathematics, agriculture, computer_science, nutrition]` |
| Broad Form Six pool plus Mathematics fallback | Repeats in accounting, banking, finance, tax, procurement, and IFM/TIA rows | `partial`, sometimes `unparsed` when wording says `principal level passes` | Base broad-pool variant plus alternatives for math support: one variant with `subject_group one_of [advanced_mathematics, basic_applied_mathematics] minGrade: "S"`; one variant with `o_level_subject_grade subject: "basic_mathematics", minGrade: "D"` or `"C"` where specified |
| Business/economics/accounting subject pool | Repeats with Economics, Accountancy/Accounts, Commerce, Geography, Mathematics/Advanced Mathematics, Physics, Chemistry, Biology, Agriculture | Mixed `structured` and `partial`; noisy OCR often prevents subject normalization | `min_acsee_principal_passes count: 2`; `min_acsee_points points: 4`; `subject_group at_least_n_of count: 2` over normalized business/economics pool; add math fallback variants where present |
| Fixed education subject pairs | Repeated pairs such as Geography and English, History and English, Kiswahili and English, Geography and History | Mostly `structured` | `min_acsee_principal_passes count: 2`; `min_acsee_points points: 4`; `subject_group all_of` for the exact two teaching subjects |
| Narrow arts/language/social-science pools | Repeats such as History, Geography, Kiswahili or English Language; English, History, Kiswahili, Geography, Literature or Economics | Mostly `partial` | `min_acsee_principal_passes count: 2`; `min_acsee_points points: 4`; `subject_group at_least_n_of count: 2` over the named arts/language/social-science subjects |
| Diploma in field list with GPA B / 3.0 | 46 rows without OUT foundation wording, plus many more with foundation wording | Mostly `partial`; only 7 structured diploma variants | `prior_award acceptedAwardLevels: ["diploma"], acceptedFields: [...normalized fields], relatedFieldRequired: true, minGpa: 3.0`; add a separate field for average grade B if schema supports it |
| Diploma or OUT Foundation alternative | 230 rows; 187 equivalent variants all `unparsed` | Diploma side is `partial`; foundation side becomes `equivalent: unparsed` | Split into two variants: diploma variant as above; equivalent/foundation variant requiring `Foundation Certificate of the OUT` with `minGpa: 3.0` |
| Diploma/FTC/certificate alternatives | 17 certificate variants and related diploma variants | Certificate is `partial`; diploma is `partial`; equivalent usually `unparsed` | Split `Diploma or Full Technician Certificate (FTC)` into accepted awards `["diploma", "certificate"]` or separate variants with identical field list and `minGpa: 3.0` |
| Diploma plus O-Level passes | Small but important repeated group with four O-Level passes and sometimes English or Mathematics grades | `partial` | `prior_award ... minGpa: 3.0`; `min_csee_passes count: 4`; optional `o_level_subject_grade` for English/Basic Mathematics where named |
| Noisy extraction rows | One-off rows with capacity/duration/points inserted into requirements | Mixed `partial`/`unparsed` | Pre-clean extracted numeric artifacts before parsing: capacity, duration, table headings, repeated programme names, and broken words |

## Target Clause Examples

Broad non-STEM Form Six pool:

```ts
[
  { kind: "min_acsee_principal_passes", count: 2 },
  { kind: "min_acsee_points", points: 4 },
  {
    kind: "subject_group",
    level: "acsee",
    mode: "at_least_n_of",
    count: 2,
    subjects: [
      "history",
      "geography",
      "kiswahili",
      "english_language",
      "french",
      "arabic",
      "fine_arts",
      "economics",
      "commerce",
      "accountancy",
      "physics",
      "chemistry",
      "biology",
      "advanced_mathematics",
      "agriculture",
      "computer_science",
      "nutrition",
    ],
  },
]
```

Business/accounting route with math support:

```ts
[
  { kind: "min_acsee_principal_passes", count: 2 },
  { kind: "min_acsee_points", points: 4 },
  {
    kind: "subject_group",
    level: "acsee",
    mode: "at_least_n_of",
    count: 2,
    subjects: [
      "economics",
      "accountancy",
      "commerce",
      "advanced_mathematics",
      "geography",
      "physics",
      "chemistry",
      "biology",
      "agriculture",
    ],
  },
  {
    kind: "subject_group",
    level: "acsee",
    mode: "one_of",
    subjects: ["advanced_mathematics", "basic_applied_mathematics"],
    minGrade: "S",
  },
]
```

Alternative for the same business/accounting route when the applicant lacks ACSEE math support:

```ts
[
  { kind: "min_acsee_principal_passes", count: 2 },
  { kind: "min_acsee_points", points: 4 },
  {
    kind: "subject_group",
    level: "acsee",
    mode: "at_least_n_of",
    count: 2,
    subjects: [
      "economics",
      "accountancy",
      "commerce",
      "advanced_mathematics",
      "geography",
      "physics",
      "chemistry",
      "biology",
      "agriculture",
    ],
  },
  { kind: "o_level_subject_grade", subject: "basic_mathematics", minGrade: "D" },
]
```

Fixed education subject pair:

```ts
[
  { kind: "min_acsee_principal_passes", count: 2 },
  { kind: "min_acsee_points", points: 4 },
  {
    kind: "subject_group",
    level: "acsee",
    mode: "all_of",
    subjects: ["geography", "english_language"],
  },
]
```

Diploma route with related fields:

```ts
[
  {
    kind: "prior_award",
    acceptedAwardLevels: ["diploma"],
    acceptedFields: [
      "accounting",
      "business_administration",
      "procurement_and_supplies_management",
      "taxation",
      "banking_and_finance",
      "economics",
    ],
    relatedFieldRequired: true,
    minGpa: 3.0,
  },
]
```

Diploma route with O-Level support:

```ts
[
  {
    kind: "prior_award",
    acceptedAwardLevels: ["diploma"],
    acceptedFields: ["business_administration", "accountancy", "finance"],
    relatedFieldRequired: true,
    minGpa: 3.0,
  },
  { kind: "min_csee_passes", count: 4 },
]
```

OUT foundation equivalent route cannot be represented cleanly today. A target shape would be:

```ts
[
  {
    kind: "prior_award",
    acceptedAwardLevels: ["foundation_certificate"],
    acceptedFields: ["out_foundation_programme"],
    relatedFieldRequired: false,
    minGpa: 3.0,
  },
]
```

## Unresolved Parser Gaps

1. Equivalent/foundation routes are not modelled. All 200 `equivalent` variants in scope are `unparsed`, mainly `Foundation Certificate of the OUT with a minimum GPA of 3.0`.
2. `or` is currently a partial-status trigger even when it can be represented as `subject_group mode: "at_least_n_of"` or as separate variants.
3. The parser does not consistently extract `minimum admission points: 4.0` when the value appears as loose PDF artifacts such as `4.0 200 3 Points`.
4. `principal level passes` and `principal pass in X and a principal pass in any of...` are missed in several Form Six rows.
5. ACSEE subsidiary requirements are not first-class. Current schema can approximate them with `subject_group minGrade: "S"`, but a dedicated clause would be clearer.
6. Business/accounting math fallback needs alternate variants: ACSEE Advanced Mathematics, ACSEE Basic Applied Mathematics subsidiary, or O-Level Basic Mathematics at D/C/credit.
7. O-Level English fallback in accounting and finance rows needs `o_level_subject_grade` extraction.
8. Diploma average grade `"B"` and `"B+"` are not represented separately from `minGpa`; the parser only extracts GPA. This matters where the source says average B or GPA 3.0, and for stricter B+/GPA 3.5 rows.
9. `Diploma or Full Technician Certificate (FTC)` should create certificate and diploma variants from the same field list instead of relying on route flags only.
10. Field-list extraction for prior awards is too narrow. Most TCU diploma rows start with `Diploma in ...` followed by long comma/or lists; the current parser captures only a small slice.
11. OCR/table artifacts need preprocessing before clause extraction: inserted capacities, durations, `Points`, broken words, repeated programme titles, and stranded institution names.
12. Subject normalization needs aliases seen in this data: `Accounts` -> `accountancy`, `Mathematics` in ACSEE context -> `advanced_mathematics`, `English` / `English Literature` / `Literature` variants, `Fine Art` / `Fine Arts`, `Computer` / `Computer Sciences`, and `Food and Nutrition` / `Food and Human Nutrition`.
13. Exclusion wording such as `any other ACSEE subject except religious studies` cannot be represented by the current `subject_group` schema.
14. Rows requiring one named principal plus one from a pool need mixed clauses: `subject_group all_of [economics]` plus `subject_group one_of [...]`, or a nested requirement model.
15. The schema has no route-specific support for foundation certificates, FTC, professional certificates, or equivalent qualifications as distinct award levels.

## Recommended Parser Work Order

1. Add pre-cleaning for TCU PDF artifacts before parsing `rawRequirementText`.
2. Parse broad and narrow `Two principal passes in the following subjects` pools into `at_least_n_of` subject groups and stop marking represented `or` lists as partial.
3. Add extraction for Form Six minimum points from both prose and loose `4.0 ... Points` artifacts.
4. Split math-support fallback requirements into alternate variants using ACSEE subsidiary or O-Level Mathematics clauses.
5. Extend prior-award field-list extraction for TCU diploma/FTC rows and map FTC to certificate-equivalent variants.
6. Add explicit modelling for OUT foundation equivalent routes.
7. Add schema support for `min_acsee_subsidiary_passes`, `acsee_subject_grade`, and prior-award average grade if high-confidence matching is required.

