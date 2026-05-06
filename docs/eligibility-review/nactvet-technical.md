# NACTVET Technical/STEM Eligibility Review

Review date: 2026-04-29

## Scope

This review iterated through all rows in:

- `data/processed/programmes.jsonl`: 4,551 rows
- `data/processed/requirement-rules.jsonl`: 5,358 rows

The reviewed subset is regulator `NACTVET` with technical/STEM fields or programme names related to health, ICT, engineering, electrical, mechanical, construction, planning, built environment, agriculture, fisheries, livestock, science, laboratory, and environment.

Reviewed subset:

| Metric | Count |
| --- | ---: |
| NACTVET technical/STEM programme rows reviewed | 1,312 |
| Associated requirement rule rows reviewed | 1,320 |
| Unique raw requirement patterns | 666 |
| Reviewed programme rows without associated requirement rule rows | 315 |

Award mix in the reviewed programme rows:

| Award level | Rows |
| --- | ---: |
| Ordinary diploma | 1,179 |
| Certificate | 41 |
| Unknown | 92 |

## Current Variant Parse Counts

These counts are from existing `variants[].parseStatus` values in `requirement-rules.jsonl` for the reviewed subset.

| Route | Structured | Partial | Unparsed | Total variants |
| --- | ---: | ---: | ---: | ---: |
| `form_four` | 78 | 652 | 199 | 929 |
| `form_six` | 4 | 147 | 207 | 358 |
| `certificate` | 38 | 271 | 250 | 559 |
| `diploma` | 4 | 27 | 2 | 33 |
| `equivalent` | 0 | 0 | 263 | 263 |
| **Total** | **124** | **1,097** | **921** | **2,142** |

Existing clause emission is heavily weighted toward `min_csee_passes`, `min_acsee_principal_passes`, and `prior_award`. The main missing pieces are CSEE named subject clauses, ACSEE subsidiary clauses, NVA/Trade Test equivalent clauses, and prior-award GPA/grade extraction.

## Repeated Raw Requirement Patterns

The 666 exact raw patterns collapse into these repeated parser families:

| Pattern family | Rule rows | Unique raw patterns | Current parser result |
| --- | ---: | ---: | --- |
| CSEE four passes including Mathematics/English or science subjects | 576 | 145 | Almost all partial/unparsed because named CSEE subjects and advisory wording are not represented |
| CSEE four non-religious passes, often with NVA/Trade Test alternative | 325 | 192 | Plain CSEE rows can be structured; NVA/equivalent alternatives become partial/unparsed |
| NTA Level 4 certificate OR ACSEE one principal plus one subsidiary | 220 | 164 | Mostly partial; certificate fields are partly extracted, subsidiary pass is not |
| NTA certificate in related/named field | 56 | 54 | Mixed structured/unparsed depending on whether the field list is clean |
| ACSEE one principal plus one subsidiary | 30 | 29 | Mostly partial/unparsed; subsidiary count and subject set are missing |
| CSEE four passes with N-of subject set | 22 | 19 | Partial/unparsed; needs `subject_group` with `at_least_n_of` |
| NVA Level III / Trade Test / GCE equivalent branch | 12 | 12 | Mostly unparsed equivalent variants |
| Diploma/NTA progression with GPA or grade | 11 | 10 | Mostly partial/unparsed; GPA, credit, distinction, and NTA level progression need extraction |
| ACSEE principal-pass route | 8 | 8 | Mostly partial; named principal subject requirements are under-modelled |

High-frequency exact patterns:

| Count | Route(s) | Target reading |
| ---: | --- | --- |
| 109 | `form_four` | Pharmaceutical/clinical nutrition: CSEE 4 passes including Chemistry and Biology; Mathematics and English are advisory added advantages |
| 98 | `form_four` | Clinical medicine: CSEE 4 passes including Chemistry, Biology, and Physics/Engineering Science; Mathematics and English advisory |
| 69 | `form_four` | Same clinical medicine pattern as above, but unparsed because wording says `with four (4) passes` instead of `at least four (4) passes` |
| 45 | `form_four` | Medical laboratory: CSEE 4 passes including Chemistry, Biology, and one of Physics/Engineering Science or Basic Mathematics, plus English |
| 36 | `form_four` | Generic CSEE 4 non-religious passes |
| 22 | `form_four` | Clinical medicine pattern with capitalized `Passes`; unparsed for the same wording reason |
| 15 | `form_four` | Diagnostic radiography: D passes in Chemistry, Biology, Physics, Basic Mathematics, and English |
| 10 | `form_six`, `certificate` | Agriculture production: NTA Level 4 in Agriculture Production OR ACSEE one principal plus one subsidiary from Biology, Chemistry, Physics, Advanced Mathematics, Agriculture Science, Geography |
| 9 | `form_four` | Health information: CSEE 4 passes including Biology, Basic Mathematics, and English |
| 9 | `form_four` | DIT technical set: CSEE 4 passes including three passes in Physics/Engineering Science, Mathematics, Chemistry, or English |

## Target RequirementClause Structures

The targets below use the existing `RequirementClause` vocabulary where possible. Where the current vocabulary is insufficient, the gap is noted in the next section.

### `form_four`

Generic CSEE four-pass route:

```ts
[
  { kind: "min_csee_passes", count: 4 },
]
```

Health science route requiring named subjects:

```ts
[
  { kind: "min_csee_passes", count: 4 },
  {
    kind: "subject_group",
    level: "csee",
    mode: "all_of",
    subjects: ["chemistry", "biology", "physics"],
    minGrade: "D",
  },
]
```

Clinical medicine wording with `Physics/Engineering Sciences` should normalize the slash as an alternative:

```ts
[
  { kind: "min_csee_passes", count: 4 },
  {
    kind: "subject_group",
    level: "csee",
    mode: "all_of",
    subjects: ["chemistry", "biology"],
    minGrade: "D",
  },
  {
    kind: "subject_group",
    level: "csee",
    mode: "one_of",
    subjects: ["physics", "engineering_science"],
    minGrade: "D",
  },
]
```

Medical laboratory wording with `Physics/Engineering sciences/Basic Mathematics`:

```ts
[
  { kind: "min_csee_passes", count: 4 },
  {
    kind: "subject_group",
    level: "csee",
    mode: "all_of",
    subjects: ["chemistry", "biology", "english"],
    minGrade: "D",
  },
  {
    kind: "subject_group",
    level: "csee",
    mode: "one_of",
    subjects: ["physics", "engineering_science", "mathematics"],
    minGrade: "D",
  },
]
```

Engineering/construction/built-environment CSEE subject-set route:

```ts
[
  { kind: "min_csee_passes", count: 4 },
  {
    kind: "subject_group",
    level: "csee",
    mode: "at_least_n_of",
    count: 2,
    subjects: [
      "physics",
      "engineering_science",
      "mathematics",
      "chemistry",
      "geography",
      "biology",
    ],
    minGrade: "D",
  },
]
```

Agriculture, wildlife, forestry, fisheries, livestock, and environment routes commonly need:

```ts
[
  { kind: "min_csee_passes", count: 4 },
  {
    kind: "subject_group",
    level: "csee",
    mode: "at_least_n_of",
    count: 2,
    subjects: [
      "biology",
      "chemistry",
      "physics",
      "engineering_science",
      "geography",
      "agriculture",
      "nutrition",
      "mathematics",
    ],
    minGrade: "D",
  },
]
```

`added advantage` subjects should not become hard eligibility clauses. They should be captured as advisory metadata outside `RequirementClause`, or omitted from eligibility decisions.

### `form_six`

Common NACTVET diploma route:

```ts
[
  { kind: "min_acsee_principal_passes", count: 1 },
]
```

The recurring wording `one principal pass and one subsidiary in principal subjects` needs an additional subsidiary clause. Until the schema supports it, this route can only be partial:

```ts
[
  { kind: "min_acsee_principal_passes", count: 1 },
  // Needed: { kind: "min_acsee_subsidiary_passes", count: 1 }
]
```

Agriculture/horticulture route:

```ts
[
  { kind: "min_acsee_principal_passes", count: 1 },
  {
    kind: "subject_group",
    level: "acsee",
    mode: "one_of",
    subjects: [
      "biology",
      "chemistry",
      "physics",
      "advanced_mathematics",
      "agriculture",
      "geography",
    ],
    minGrade: "E",
  },
  // Needed: subsidiary pass count, often in the same subject set.
]
```

Technical/built-environment route:

```ts
[
  { kind: "min_acsee_principal_passes", count: 1 },
  {
    kind: "subject_group",
    level: "acsee",
    mode: "one_of",
    subjects: [
      "advanced_mathematics",
      "physics",
      "chemistry",
      "geography",
      "biology",
      "computer_science",
    ],
    minGrade: "E",
  },
]
```

Where wording says the principal pass must be in a named subject, use:

```ts
[
  { kind: "min_acsee_principal_passes", count: 1 },
  {
    kind: "subject_group",
    level: "acsee",
    mode: "one_of",
    subjects: ["advanced_mathematics"],
    minGrade: "E",
  },
]
```

### `certificate`

NTA Level 4 certificate progression:

```ts
[
  {
    kind: "prior_award",
    acceptedAwardLevels: ["certificate"],
    acceptedFields: ["information_technology", "computer_science"],
    relatedFieldRequired: true,
  },
]
```

Named NTA Level 4 field lists should be normalized into canonical fields, not subjects, for example:

```ts
[
  {
    kind: "prior_award",
    acceptedAwardLevels: ["certificate"],
    acceptedFields: [
      "agriculture_production",
      "horticulture",
      "crop_production",
      "livestock_production",
    ],
    relatedFieldRequired: true,
  },
]
```

Where the raw text says `related field`, `relevant field`, or `field related to ...`, target:

```ts
[
  {
    kind: "prior_award",
    acceptedAwardLevels: ["certificate"],
    relatedFieldRequired: true,
  },
]
```

This is evaluable only if programme-field-to-prior-field mappings exist.

### `diploma`

Diploma/NTA Level 6 progression:

```ts
[
  {
    kind: "prior_award",
    acceptedAwardLevels: ["diploma"],
    acceptedFields: ["health"],
    relatedFieldRequired: true,
  },
]
```

Progression with GPA:

```ts
[
  {
    kind: "prior_award",
    acceptedAwardLevels: ["diploma"],
    acceptedFields: ["animal_production", "general_agriculture"],
    relatedFieldRequired: true,
    minGpa: 2.0,
  },
]
```

Some raw rows use `Technician Certificate (NTA Level 5)` while the route is emitted as `diploma` or `certificate`. The parser should distinguish NTA Level 4, 5, and 6 in prior-award metadata instead of relying only on route.

### `equivalent`

Current equivalent variants are all unparsed in this subset. For NACTVET technical/STEM programmes, equivalent branches mainly mean NVA Level III, Trade Test Grade I, GCE, pre-technology certificate, or equivalent certificates recognized by NACTVET.

The existing schema has no explicit equivalent-award clause. Target options:

```ts
[
  {
    kind: "prior_award",
    acceptedAwardLevels: ["nva_level_iii", "trade_test_grade_i"],
    relatedFieldRequired: true,
  },
  { kind: "min_csee_passes", count: 2 },
]
```

or add a dedicated clause:

```ts
{ kind: "equivalent_award", awards: ["nva_level_iii", "trade_test_grade_i"], relatedFieldRequired: true }
```

The first option fits the current union only if `acceptedAwardLevels` is allowed to carry non-school award keys. The second option is clearer.

## Unresolved Parser Gaps

| Gap | Unique raw patterns | Rule rows | Impact |
| --- | ---: | ---: | --- |
| OR/slash alternatives force partial status | 509 | 938 | Common in `Physics/Engineering Science`, `NTA Level 4 OR ACSEE`, and NVA alternatives |
| CSEE named subjects missing from clauses | 309 | 819 | Health, engineering, agriculture, and ICT decisions cannot be precise |
| Subject-set cardinality not fully structured | 276 | 758 | `two/three of the following` cannot be evaluated conservatively |
| ACSEE subsidiary pass count/subject not modelled | 200 | 257 | Form Six routes remain partial even when principal pass count is known |
| NVA/Trade Test/GCE equivalent branches unparsed | 218 | 261 | Equivalent applicants are under-supported |
| Required subject grade/floor not represented precisely | 89 | 445 | `D passes`, `C grade`, `credits`, and compulsory subject floors are lost |
| Added-advantage subjects need advisory handling | 47 | 400 | Mathematics/English added advantages in health rows should not be hard requirements |
| Related-field semantics need explicit field mapping | 46 | 50 | Certificate/diploma progression cannot verify field relevance reliably |
| Equivalent qualification route lacks evaluable clauses | 26 | 29 | Recognized equivalent routes have no structured decision path |
| Prior-award GPA/grade floors need extraction | 26 | 26 | NTA progression with GPA 2.0, B+, credit, or distinction remains partial |

Additional concrete parser fixes:

1. Parse `with four (4) passes` and capitalized `Passes`, not only `at least four (4) passes`.
2. Normalize `Physics/Engineering Science` as `one_of ["physics", "engineering_science"]`.
3. Normalize `Basic Mathematics`, `Mathematics`, and `Basic Applied Mathematics` consistently.
4. Treat `English`, `English Language`, `First Language English`, and `Second Language English` as `english`.
5. Split concatenated extracted rows where multiple numbered programmes appear in one raw requirement string.
6. Preserve CSEE support clauses on Form Six/certificate routes when the route also requires O-Level subject passes.
7. Model `minimum CSEE division` and science-subject division wording, for example Division III with two science passes.
8. Avoid emitting route variants with empty clause arrays unless the route has an explicit supported equivalent-award clause.

## Recommended Parser Priority

1. Add CSEE `subject_group` extraction for `including`, `must be in`, and `two/three of the following` wording.
2. Add a subsidiary-pass clause for ACSEE routes.
3. Add equivalent-award modelling for NVA Level III, Trade Test Grade I, GCE, and pre-technology certificates.
4. Add advisory metadata for `added advantage` subjects.
5. Add prior-award field normalization and GPA/grade extraction.
6. Add specific wording support for `with four (4) passes`, `D passes in`, `C grade in`, and `credit passes in`.
