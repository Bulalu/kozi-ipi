# TCU STEM Eligibility Requirement Review

Review date: 2026-04-29

Scope: processed TCU programmes whose `fieldCategory`, `courseFamily`, or `programmeName` relates to health, medicine, nursing, pharmacy, science, engineering, ICT/computer, agriculture, environment, planning, built environment, land, architecture, veterinary, laboratory, or nutrition.

Files reviewed exhaustively:

- `data/processed/programmes.jsonl`
- `data/processed/requirement-rules.jsonl`

## Counts

| Item | Count |
| --- | ---: |
| Total programme rows scanned | 4,551 |
| Total requirement-rule rows scanned | 5,358 |
| TCU STEM programme rows reviewed | 759 |
| Unique programme-level `minimumEntryRequirements` summaries in scope | 700 |
| Empty programme-level requirement summaries in scope | 6 |
| Joinable requirement-rule rows for scoped programmes | 348 |
| Scoped programmes with joinable requirement-rule rows | 192 |
| Scoped programmes without joinable requirement-rule rows | 561 |
| Unique raw requirement-rule patterns in scope | 322 |
| Repeated raw requirement-rule patterns | 17 |
| Requirement-rule rows covered by repeated patterns | 43 |
| Singleton raw requirement-rule patterns | 305 |
| Requirement variants reviewed from joinable rules | 495 |

The 561 programme rows without joinable requirement-rule rows still carry programme-level `minimumEntryRequirements`, so they were reviewed at summary-text level. The gap means the parsed rule layer is incomplete for TCU STEM coverage and should not be treated as exhaustive yet.

## Current Variant Parse Status By Route

| Route | Structured | Partial | Unparsed | Total |
| --- | ---: | ---: | ---: | ---: |
| `form_six` | 30 | 134 | 7 | 171 |
| `diploma` | 3 | 173 | 1 | 177 |
| `certificate` | 0 | 53 | 0 | 53 |
| `equivalent` | 0 | 0 | 94 | 94 |
| **Total** | **33** | **360** | **102** | **495** |

No joinable TCU STEM requirement-rule variant used `form_four`. For TCU degree programmes this is expected in most cases, but O-Level support clauses are still common inside `form_six`, `diploma`, and `equivalent` routes.

## Pattern Families

| Pattern family | Rule rows | Unique raw patterns | Variants | Current statuses |
| --- | ---: | ---: | ---: | --- |
| Diploma plus GPA/class plus O-Level support subjects | 65 | 62 | 110 | 87 partial, 23 unparsed |
| ACSEE two principal passes from a broad subject list | 64 | 56 | 64 | 57 partial, 7 structured |
| OUT/foundation bridge alternatives mixed with another route | 61 | 59 | 121 | 72 partial, 49 unparsed |
| Diploma plus GPA/class without explicit O-Level support | 46 | 42 | 86 | 65 partial, 21 unparsed |
| ACSEE two principal passes with conditional Mathematics support | 38 | 37 | 38 | 38 partial |
| ACSEE three PCB principal passes with points and grade minima | 26 | 22 | 26 | 16 structured, 10 partial |
| ACSEE two principal passes in specific subjects | 18 | 14 | 18 | 7 structured, 11 partial |
| Other/unclassified ACSEE wording | 17 | 17 | 17 | 12 partial, 5 unparsed |
| Prior award field only | 6 | 6 | 8 | 3 structured, 3 partial, 2 unparsed |
| Other principal-pass wording | 5 | 5 | 5 | 3 partial, 2 unparsed |
| ACSEE three principal passes in specific subjects | 2 | 2 | 2 | 2 partial |

## Repeated Raw Requirement Patterns

These exact raw requirement-rule strings repeat across multiple scoped programmes and should be prioritized because one parser improvement can cover several rows.

| Count | Routes | Current status mix | Raw pattern |
| ---: | --- | --- | --- |
| 7 | `form_six` | 7 partial | Two principal passes in the following subjects: History, Geography, Kiswahili, English Language, French, Arabic, Fine Arts, Economics, Commerce, Accountancy, Physics, Chemistry, Biology, Advanced Mathematics, Agriculture, Computer Science or Nutrition. |
| 3 | `form_six` | 3 structured | Three principal passes in Physics, Chemistry and Biology with a minimum of 6 points: A minimum of D grade in Chemistry, Biology and Physics. |
| 3 | `form_six` | 3 structured | Two principal passes in Physics and Advanced Mathematics. |
| 3 | `diploma` | 3 partial | Diploma in Clinical Medicine or Clinical Dentistry with an average of B or a minimum GPA of 3.0. In addition, an applicant must have a minimum of D grade in Mathematics, Chemistry, Biology, Physics and English at O-Level. |
| 3 | `diploma` | 3 partial | Diploma in Computer Science, Computer Engineering, Information Technology, Telecommunication Engineering and Electronics with an average of B or a minimum GPA of 3.0. |
| 2 | `diploma`, `equivalent` | 2 partial, 2 unparsed | Diploma in Computer Science or Information Technology and 4 passes at O-Level with an average of B or a minimum GPA of 3.0, or Foundation Certificate from OUT with GPA of 3.0. |
| 2 | `form_six` | 2 partial | Two principal passes in Physics, Chemistry, Biology, Computer Studies, Agriculture, Geography or Advanced Mathematics. |
| 2 | `diploma` | 2 partial | Diploma in Nursing with an average of B or a minimum GPA of 3.0. In addition, an applicant must have a minimum of D grade in Biology, Chemistry, Physics, English, and Mathematics at O-Level. |
| 2 | `certificate`, `diploma`, `equivalent` | 4 partial, 2 unparsed | Ordinary Diploma (NTA level 6) with at least a GPA of 3.0, or FTC with average of B, or any other Diploma of not less than Upper Second Class/B+, or a Distinction for unclassified diplomas. |
| 2 | `form_six` | 2 partial | Two principal passes in Physics, Mathematics, Geography, Biology, Chemistry or Economics. |
| 2 | `form_six` | 2 structured | Two principal passes in Physics, Computer Science and Advanced Mathematics. |
| 2 | `form_six` | 2 structured | Three principal passes in Physics, Chemistry and Biology with a minimum of 6 points: A minimum of D grade in Chemistry, Biology and Physics. |
| 2 | `form_six` | 2 partial | Two principal passes in Biology, Chemistry, Physics, Geography, Agriculture, Nutrition, Advanced Mathematics, Commerce, Economics, History, Accountancy, English Language or Kiswahili. |
| 2 | `form_six` | 2 structured | Three principal passes in Physics, Chemistry and Biology with a minimum of 6 points: a minimum of D grade in Chemistry, Biology and Physics. |
| 2 | `diploma` | 2 partial | Diploma in Shipbuilding, Marine Engineering or Mechanical Engineering with an average of B or a minimum GPA of 3.0. |
| 2 | `certificate`, `diploma`, `equivalent` | 4 partial, 2 unparsed | Diploma or FTC in Information Technology with Accounting, Business with Information Technology, Information Technology, Computing and Information Technology, ICT, Electronics and Telecommunication Engineering, Computer Engineering, Computer Science, Computer Application, or Electronics and Telecommunication with Industrial Automation with an average of B or a minimum GPA of 3.0, or Foundation Certificate of the OUT with GPA of 3.0. |
| 2 | `form_six` | 2 partial | Two principal passes from a broad subject list. If one principal pass is not Advanced Mathematics, the applicant must have a subsidiary pass in Advanced Mathematics/Basic Applied Mathematics at A-Level or a minimum D grade in Mathematics at O-Level. |

## Target Clause Structures

### ACSEE Three Principal Passes With Points And Subject Grades

Target routes: `form_six`

Example programmes: Medicine, Pharmacy, Medical Imaging, Dental Surgery.

Target structure:

```ts
[
  { kind: "min_acsee_principal_passes", count: 3 },
  { kind: "min_acsee_points", points: 6 },
  {
    kind: "subject_group",
    level: "acsee",
    mode: "all_of",
    subjects: ["physics", "chemistry", "biology"],
    minGrade: "D",
  },
]
```

Some nursing variants need a mixed grade rule that the current model cannot fully express as one clause: Chemistry minimum C, Biology minimum D, and one of Physics/Advanced Mathematics/Nutrition minimum E. This needs either per-subject minimum grade clauses for ACSEE or a richer subject group shape.

### ACSEE Two Principal Passes From A Broad Subject List

Target routes: `form_six`

Target structure:

```ts
[
  { kind: "min_acsee_principal_passes", count: 2 },
  {
    kind: "subject_group",
    level: "acsee",
    mode: "at_least_n_of",
    count: 2,
    subjects: [
      "history",
      "geography",
      "kiswahili",
      "english",
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

This pattern is currently often partial because broad OR lists and punctuation are interpreted as complex branching. For eligibility, it is a normal `at_least_n_of` subject group.

### ACSEE Two Principal Passes With Conditional Mathematics Support

Target routes: `form_six`

Target structure:

```ts
[
  { kind: "min_acsee_principal_passes", count: 2 },
  {
    kind: "subject_group",
    level: "acsee",
    mode: "at_least_n_of",
    count: 2,
    subjects: ["...broad accepted principal subjects"],
  },
  {
    kind: "subject_group",
    level: "acsee",
    mode: "one_of",
    subjects: ["advanced_mathematics", "basic_applied_mathematics"],
  },
  { kind: "o_level_subject_grade", subject: "mathematics", minGrade: "D" },
]
```

The last two clauses are conditional: they apply only if Advanced Mathematics is not one of the principal passes. The current `RequirementClause` model has no conditional wrapper, so the safe target is a new variant-level condition model such as `requires_one_when_missing(principal_subject=advanced_mathematics, alternatives=[...])`.

### Engineering ACSEE Physics And Advanced Mathematics

Target routes: `form_six`

Target structure:

```ts
[
  { kind: "min_acsee_principal_passes", count: 2 },
  {
    kind: "subject_group",
    level: "acsee",
    mode: "all_of",
    subjects: ["physics", "advanced_mathematics"],
  },
]
```

Some DIT-style rows add O-Level support: Basic Mathematics and Physics at O-Level. Those should add:

```ts
[
  { kind: "o_level_subject_grade", subject: "mathematics", minGrade: "D" },
  { kind: "o_level_subject_grade", subject: "physics", minGrade: "D" },
]
```

### Diploma Or FTC With GPA/Class

Target routes: `diploma`, sometimes `certificate`

Target structure:

```ts
[
  {
    kind: "prior_award",
    acceptedAwardLevels: ["diploma", "full_technician_certificate"],
    acceptedFields: ["...programme-specific fields"],
    relatedFieldRequired: true,
    minGpa: 3.0,
  },
]
```

Rows using B average, B+, Upper Second Class, Distinction, or unclassified diploma distinction need normalized non-GPA award-performance constraints. The current model only has `minGpa`, so these are partial even when fields are captured.

### Diploma Plus O-Level Support Subjects

Target routes: `diploma`

Target structure:

```ts
[
  {
    kind: "prior_award",
    acceptedAwardLevels: ["diploma"],
    acceptedFields: ["clinical_medicine", "clinical_dentistry"],
    relatedFieldRequired: true,
    minGpa: 3.0,
  },
  { kind: "o_level_subject_grade", subject: "mathematics", minGrade: "D" },
  { kind: "o_level_subject_grade", subject: "chemistry", minGrade: "D" },
  { kind: "o_level_subject_grade", subject: "biology", minGrade: "D" },
  { kind: "o_level_subject_grade", subject: "physics", minGrade: "D" },
  { kind: "o_level_subject_grade", subject: "english", minGrade: "D" },
]
```

Health, nursing, laboratory, geology, architecture, and engineering top-up routes frequently combine prior-award performance with O-Level subject minima. These should be modeled as cumulative route clauses, not as separate alternatives.

### OUT Foundation Or Equivalent Bridge

Target routes: `equivalent`

Target structure:

```ts
[
  {
    kind: "prior_award",
    acceptedAwardLevels: ["foundation_certificate", "foundation_programme"],
    acceptedFields: ["science_cluster"], // where stated
    relatedFieldRequired: false,
    minGpa: 3.0,
  },
]
```

The current parser emits empty `equivalent` variants for almost every OUT/foundation path. This causes 94 unparsed equivalent variants in the scoped TCU STEM rules.

## Unresolved Parser Gaps

1. **Rule coverage gap for TCU STEM programmes.** Only 192 of 759 scoped programme rows have joinable parsed rule rows. Programme-level summaries show many more TCU STEM requirements than the rule file currently exposes through matching keys.

2. **Conditional clauses are not representable.** Common ICT and statistics requirements say Mathematics support is required only when Advanced Mathematics is absent from the principal passes. The current clause list cannot express conditional dependencies.

3. **Equivalent/foundation routes are effectively unparsed.** OUT Foundation Certificate/Foundation Programme alternatives are common, but equivalent variants have no clauses and account for 94 unparsed variants.

4. **Prior-award performance is under-modeled.** TCU wording uses GPA, average grade B, B+, Upper Second Class, Distinction, and FTC grade equivalences. `prior_award.minGpa` alone cannot preserve these alternatives.

5. **Diploma/FTC/certificate award levels are conflated.** Requirements often allow Ordinary Diploma, FTC, any other diploma, or NTA Level 6. The current `acceptedAwardLevels` usually contains only the route name and loses FTC/NTA/classification detail.

6. **O-Level support subjects inside non-Form-Four routes are partially parsed or missed.** Diploma and Form Six routes often require O-Level Mathematics, Physics, Chemistry, Biology, or English at a minimum grade. These should become `o_level_subject_grade` clauses.

7. **ACSEE subject-grade minima need per-subject support.** Medicine and nursing can require different grades by subject. A single `subject_group.minGrade` cannot express Chemistry C, Biology D, and Physics/Advanced Mathematics/Nutrition E in one route.

8. **Broad subject lists are over-classified as partial.** Many clean "two principal passes from the following subjects" rows are normal `at_least_n_of` constraints, not unsafe branching.

9. **PDF extraction artifacts leak into requirements.** Examples include embedded capacities, duration fragments, programme codes, page-row text, and broken words such as `Telecommuni cation`. These artifacts make otherwise parseable rows partial or unparsed.

10. **Subject normalization needs STEM-specific aliases.** Observed variants include Computer Studies, Computer, compute science, Basic Applied Mathematics, Mathematics, Food Science, Biotechnology, Laboratory Technology, Geosciences, Geomatics, and Physical Education/Sport Science. Some are not canonicalized precisely enough for eligibility.

11. **Route alternatives need nested OR groups.** Many rows are `Diploma ... OR Foundation ...`; some are `Diploma OR FTC OR any other Diploma`. A flat variant with flat clauses cannot distinguish alternatives that should be independently satisfiable.

12. **Programme-level merged summaries obscure route boundaries.** Several `minimumEntryRequirements` values concatenate multiple route rows using `||`; these should be split into separate rule rows before evaluation.

## Recommended Parser Work Order

1. Fix TCU STEM rule coverage/key joins so every scoped programme with `minimumEntryRequirements` has route-level requirement rules.
2. Add an `equivalent` parser for OUT Foundation Certificate/Foundation Programme with GPA and optional cluster/field.
3. Add nested alternative groups at the variant level so Diploma/FTC/Foundation alternatives are not flattened.
4. Add conditional support for "if principal passes do not include Advanced Mathematics" mathematics clauses.
5. Add prior-award performance constraints for average grade, class, FTC grade, and distinction.
6. Add O-Level subject-grade extraction for all routes, not only direct Form Four.
7. Expand ACSEE subject parsing to classify broad subject lists as `at_least_n_of`.
8. Clean extraction artifacts before parsing route text.
