# Vocational And Other Regulators Eligibility Review

Scope: exhaustive pass over `data/processed/programmes.jsonl` and
`data/processed/requirement-rules.jsonl` for the remaining non-TCU/non-NACTVET
regulators present in the processed corpus: VETA, Ministry, ZVTA/VTA Zanzibar,
Zanzibar authority, and any unknown/remaining regulator buckets.

No unknown regulator bucket is present in the current processed programme file.

## Corpus Counts

| Item | Count |
| --- | ---: |
| Programme rows iterated | 4,551 |
| Requirement-rule rows iterated | 5,358 |
| Target programme rows reviewed | 847 |
| Target programme keys reviewed | 834 |
| Target requirement-rule rows joined | 354 |
| Target programme keys with a rule row | 343 |
| Target programme keys without a rule row | 491 |
| Unique target raw requirement patterns | 5 |

Target programme rows by regulator:

| Regulator | Programme rows |
| --- | ---: |
| VETA | 642 |
| Ministry | 122 |
| ZVTA/VTA Zanzibar | 46 |
| Zanzibar authority | 37 |
| Unknown/remaining | 0 |

Current `requirement-rules.jsonl` coverage for this target scope:

| Regulator | Joined rule rows | Non-empty variants | Empty variants |
| --- | ---: | ---: | ---: |
| VETA | 297 | 0 | 297 |
| ZVTA/VTA Zanzibar | 57 | 0 | 57 |
| Ministry | 0 | 0 | 0 |
| Zanzibar authority | 0 | 0 | 0 |
| Unknown/remaining | 0 | 0 | 0 |

The current parser emits no route variants for the target regulators. Therefore
the current structured/partial/unparsed variant count by route is zero for every
route:

| Route | Structured | Partial | Unparsed | Total current variants |
| --- | ---: | ---: | ---: | ---: |
| form_four | 0 | 0 | 0 | 0 |
| form_six | 0 | 0 | 0 | 0 |
| certificate | 0 | 0 | 0 | 0 |
| diploma | 0 | 0 | 0 | 0 |
| equivalent | 0 | 0 | 0 | 0 |

Manual target classification from the reviewed raw patterns:

| Route | Structured | Partial | Unparsed | Notes |
| --- | ---: | ---: | ---: | --- |
| form_four | 0 | 8 | 0 | Ministry science/mathematics teacher diploma pattern is mostly representable, but needs a generic "three subjects at C or better" clause. |
| form_six | 114 | 0 | 0 | Ministry ordinary diploma teacher education pattern is directly representable. |
| certificate | 114 | 0 | 0 | Ministry ordinary diploma teacher education certificate route is directly representable as prior teacher award. |
| diploma | 0 | 0 | 0 | No reviewed target pattern states a diploma-holder route. |
| equivalent | 0 | 0 | 0 | No reviewed target pattern states an equivalent route. |
| no_route_available | 0 | 0 | 725 | VETA, ZVTA, and Zanzibar authority source rows either have empty requirements or explicitly say no programme-specific requirement was available. |

## Repeated Raw Requirement Patterns

### 1. Empty requirement text

Rows: 382

Regulators: VETA 345, Zanzibar authority 37

Awards: vocational certificate 367, short course 15

Examples:

- Auto Electric (AE) - Arusha VTC
- Designing Sewing and Technology (DSCT) - Arusha VTC
- Electronics (ELEC) - Arusha VTC

Current parser output: no joined rule rows for the empty rows.

Target route structure: none. Do not infer eligibility from award level, centre
type, or regulator alone. These rows should remain `cannot_determine` until an
official source states actual entry requirements.

Parser/data gap:

- Empty `minimumEntryRequirements` should either be excluded from rule import or
  imported as an explicit source-absent rule with no route variants and a review
  reason. It should not produce eligibility variants.

### 2. VETA source does not state programme-specific requirement

Rows: 297

Regulators: VETA 297

Awards: vocational certificate 297

Raw pattern:

```text
Official VETA occupation listing does not state a programme-specific academic entry requirement in the source used.
```

Examples:

- Agro Mechanics (AGM) - Arusha VTC
- Carpentry & Joinery (CJ) - Arusha VTC
- Design Sewing & Clothing Technology (DSCT) - Arusha VTC

Current parser output: 297 rule rows, all with empty `variants`.

Target route structure: none. The source confirms programme availability, not
academic entry requirements.

Parser/data gap:

- Keep these rows out of route-specific eligibility decisions.
- If a UI needs to show them, label as "entry requirement not stated in source"
  and require institution/VETA verification.
- Do not map vocational certificate automatically to `form_four`,
  `equivalent`, or `certificate` routes without a source requirement.

### 3. Ministry ordinary diploma teacher education

Rows: 114

Regulators: Ministry 114

Awards: ordinary diploma 114

Raw pattern:

```text
Wahitimu wa Kidato cha sita wenye ufaulu wa Daraja la I-III kwa kiwango cha Principal Pass mbili (02), au walimu waliohitimu Astashahada (Cheti) ya Ualimu Elimu ya Awali au Msingi.
```

Examples:

- Stashahada ya Ualimu Elimu ya Msingi mchepuo wa Sayansi na Hisabati (kwa kutumia lugha ya kiswahili) - Al harmain
- Stashahada ya Ualimu Elimu ya Msingi mchepuo wa Sayansi ya Jamii (kwa kutumia lugha ya kiswahili) - Al harmain
- Stashahada ya Ualimu Elimu ya Msingi mchepuo wa lugha (Kiingereza, Kifaransa na Kichina) - Al harmain

Current parser output: no joined rule rows.

Target variants:

```ts
[
  {
    route: "form_six",
    parseStatus: "structured",
    clauses: [
      { kind: "min_acsee_division", division: "III" },
      { kind: "min_acsee_principal_passes", count: 2 },
    ],
  },
  {
    route: "certificate",
    parseStatus: "structured",
    clauses: [
      {
        kind: "prior_award",
        acceptedAwardLevels: ["certificate"],
        acceptedFields: [
          "teacher_education",
          "early_childhood_education",
          "primary_education",
        ],
        relatedFieldRequired: true,
      },
    ],
  },
]
```

Parser gaps:

- Parse Swahili `Kidato cha sita` as `form_six`.
- Parse `Daraja la I-III` as `min_acsee_division: "III"`.
- Parse `Principal Pass mbili (02)` as two principal passes.
- Parse `Astashahada (Cheti) ya Ualimu Elimu ya Awali au Msingi` as a
  certificate route in teacher education, early childhood education, or primary
  education.

### 4. ZVTA source does not state programme-specific requirement

Rows: 46

Regulators: ZVTA/VTA Zanzibar 46

Awards: vocational certificate 40, short course 6

Raw pattern:

```text
Official ZVTA centre page lists the course but does not state a programme-specific academic entry requirement in the accessible source text.
```

Examples:

- Auto Electric (Umeme wa Magari) - Daya VTC
- Carpentry and Joinery (Seremala) - Daya VTC
- Crop Farming and Horticulture (Kilimo cha Mazao na Mboga Mboga) - Daya VTC

Current parser output: 57 joined rule rows, all with empty `variants`. The joined
rule count is higher than programme rows because normalized programme/institution
keys are not one-to-one for this subset.

Target route structure: none. The source confirms course availability only.

Parser/data gap:

- Same treatment as VETA source-absent rows: do not infer Form Four,
  certificate, diploma, or equivalent eligibility.
- Investigate duplicate normalized keys before importing these rows into
  `requirementRules`, because 46 programme rows join to 57 rule rows.

### 5. Ministry special science/mathematics teacher diploma

Rows: 8

Regulators: Ministry 8

Awards: ordinary diploma 8

Raw pattern:

```text
Wahitimu wa Kidato cha nne wenye ufaulu wa Daraja la I-III kwa kiwango cha alama C au zaidi katika masomo matatu; mawili kati yake yakiwa Basic Mathematics, Biology, Chemistry, Physics, Information and Computer Studies au Computer Science.
```

Examples:

- Stashahada Maalumu ya Ualimu Elimu ya Msingi katika masomo ya sayansi na hisabati (PME, PCE, PBE, CBE, CME na CSME) - Chuo cha Ualimu Kasulu
- Stashahada Maalumu ya Ualimu Elimu ya Msingi katika masomo ya sayansi na hisabati (PME, PCE, PBE, CME na CBE) - Chuo cha Ualimu Kleruu
- Stashahada Maalumu ya Ualimu Elimu ya Msingi katika masomo ya sayansi na hisabati (PME, PCE, PBE, CBE, CME na CSME) - Chuo cha Ualimu Korogwe

Current parser output: no joined rule rows.

Target variant:

```ts
[
  {
    route: "form_four",
    parseStatus: "partial",
    clauses: [
      { kind: "min_csee_division", division: "III" },
      {
        kind: "subject_group",
        level: "csee",
        mode: "at_least_n_of",
        count: 2,
        subjects: [
          "mathematics",
          "biology",
          "chemistry",
          "physics",
          "computer_science",
        ],
        minGrade: "C",
      },
    ],
  },
]
```

The target remains partial because the current `RequirementClause` union has no
generic clause for "at least three CSEE subjects at grade C or better" across any
subject. `min_csee_passes` cannot represent grade C; a CSEE pass may be D.

Parser gaps:

- Parse Swahili `Kidato cha nne` as `form_four`.
- Parse `Daraja la I-III` as `min_csee_division: "III"`.
- Parse `alama C au zaidi katika masomo matatu` as a generic CSEE graded subject
  count. This likely needs a new clause, for example:

```ts
{ kind: "min_csee_subjects_at_grade", count: 3, minGrade: "C" }
```

- Parse `mawili kati yake yakiwa ...` as `subject_group` with
  `mode: "at_least_n_of"`, `count: 2`, and `minGrade: "C"`.
- Normalize `Information and Computer Studies` to `computer_science`.

## Unresolved Parser Gaps

1. Swahili route detection is missing for `Kidato cha nne`, `Kidato cha sita`,
   `Astashahada`, and `Cheti`.
2. Swahili division phrases such as `Daraja la I-III` are not parsed into
   minimum CSEE/ACSEE division clauses.
3. Swahili principal-pass phrases such as `Principal Pass mbili (02)` are not
   parsed into `min_acsee_principal_passes`.
4. The schema needs a generic graded CSEE subject-count clause to represent
   "three subjects at C or better" without enumerating every possible subject.
5. The parser should support nested count logic: three C-or-better subjects,
   with at least two from a named science/mathematics/computer list.
6. Source-absent vocational rows should be represented separately from
   unparsed academic requirements. They are not parse failures; the accessible
   source does not contain requirement text.
7. VETA/ZVTA/Zanzibar authority route flags are mostly unknown or blank in this
   corpus. Eligibility must not be inferred from regulator or award level alone.
8. Duplicate normalized keys in the ZVTA/VTA Zanzibar subset cause 46 programme
   rows to join to 57 rule rows. Rule import should preserve a stable programme
   identity or de-duplicate joins before eligibility evaluation.

