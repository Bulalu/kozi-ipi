# Eligibility Requirement Review

This review captures the first pass of manual compatibility modelling for the
eligibility engine. The goal is to convert published entry requirement text into
structured `RequirementClause` variants that the evaluator can compare against a
student profile.

## Combination Inputs

The source data does not reliably store ACSEE combination codes. Eligibility
must therefore be decided from subjects and grades, not from the code alone.
The UI can use combinations to populate subjects and steer candidate search.

Recommended Form Six combinations:

| Code | Subjects |
| --- | --- |
| PCB | Physics, Chemistry, Biology |
| PCM | Physics, Chemistry, Advanced Mathematics |
| PGM | Physics, Geography, Advanced Mathematics |
| CBG | Chemistry, Biology, Geography |
| CBN | Chemistry, Biology, Nutrition |
| CBA | Chemistry, Biology, Agriculture |
| EGM | Economics, Geography, Advanced Mathematics |
| ECA | Economics, Commerce, Accountancy |
| HGE | History, Geography, Economics |
| HGL | History, Geography, English Language |
| HGK | History, Geography, Kiswahili |
| HKL | History, Kiswahili, English Language |
| KLF | Kiswahili, English Language, French |

## Parser Gaps

Highest impact parser improvements:

1. Extract exact Form Six all-of patterns such as `Physics, Chemistry and Biology`.
2. Support per-subject ACSEE grade floors, for example Chemistry C, Biology D, Physics E.
3. Parse required-plus-one-of constructions such as `Chemistry, Biology and either Physics or Advanced Mathematics`.
4. Parse `principal level passes` wording in addition to `principal passes`.
5. Model subsidiary subject requirements, for example subsidiary in Physics, Geography, Nutrition, or Agriculture.
6. Emit O-Level fallback clauses when Form Six routes require O-Level support subjects.
7. Stop marking every `or` as partial once the `or` is represented as a structured subject group.

## Representative Rule Targets

| Area | Programme pattern | Structured Form Six target |
| --- | --- | --- |
| Health | Doctor of Medicine / Pharmacy | `min_acsee_principal_passes: 3`, `min_acsee_points: 6`, `subject_group all_of [physics, chemistry, biology] minGrade: D` |
| Health | Medical Laboratory Sciences | `min_acsee_principal_passes: 3`, `min_acsee_points: 6`, Chemistry C, Biology D, Physics E |
| Health | Nursing | `min_acsee_principal_passes: 3`, `min_acsee_points: 6`, Chemistry C, Biology D, `one_of [physics, advanced_mathematics, nutrition] minGrade: E` |
| Engineering | Civil Engineering | Advanced Mathematics and Physics, plus Chemistry subsidiary or O-Level Chemistry C as alternate variants |
| Engineering | Biomedical Engineering | Physics and Advanced Mathematics, plus O-Level Mathematics and Physics passes |
| Engineering | Computer Engineering / IT | Advanced Mathematics and one of Physics or Computer Science, plus Chemistry subsidiary or O-Level Chemistry C |
| Business | Accountancy | Two principals from business/science/geography/math subjects, with Math/BAM subsidiary or O-Level Math fallback variants |
| Education | BA with Education | At least two principals from arts, languages, economics, commerce, accountancy, or advanced mathematics |
| Education | BSc with Education | At least two principals from science, math, computer science, or geography |
| Agriculture | BSc Agriculture / Animal Science | Biology plus one of Chemistry, Physics, Geography, or Agriculture |
| Agriculture | Agricultural Engineering | Advanced Mathematics plus one of Physics, Chemistry, or Geography, with O-Level science support subjects |

## Schema Notes

The existing `subject_group` clause can represent most all-of, one-of, and
at-least-n-of requirements. Two schema additions may be needed for higher
confidence matching:

```ts
{ kind: "acsee_subject_grade"; subject: string; minGrade: AcseeGrade }
{ kind: "min_acsee_subsidiary_passes"; count: number }
```

Specific subsidiary subjects can temporarily be represented as
`subject_group` with `minGrade: "S"`, but an explicit subsidiary clause would be
clearer.
