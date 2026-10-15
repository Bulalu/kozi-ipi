# NACTVET Non-Technical Eligibility Requirement Review

Date: 2026-04-29

This review covers NACTVET non-technical ordinary diploma and certificate programmes in business, accounting, finance, procurement, education, social/community development, tourism/hospitality, arts/media, law/public administration, transport, religious studies, and adjacent non-STEM programme names such as records, archives, library, secretarial, local government, counselling, human resource, public relations, and logistics.

The review iterated through both processed files:

- `data/processed/programmes.jsonl`
- `data/processed/requirement-rules.jsonl`

Raw CSV files were not edited.

## Scope Counts

| Metric | Count |
| --- | ---: |
| Total programme rows iterated | 4,551 |
| NACTVET programme rows found | 2,180 |
| In-scope NACTVET non-technical programme rows reviewed | 1,037 |
| Requirement-rule rows iterated | 5,358 |
| In-scope requirement-rule rows reviewed | 1,461 |
| Unique raw requirement texts in scope | 770 |
| Grouped requirement pattern signatures in scope | 208 |

Scope was selected from regulator `NACTVET`, target non-technical `fieldCategory` and `courseFamily` values, plus programme-name recovery for misclassified rows such as library, records, secretarial, social work, law, public administration, theology, and logistics. Some recovered rows carry broad or incorrect categories such as `health`, `ICT`, `other`, or `planning built environment land`; they were included only when the programme name itself was a target non-technical pathway.

## Route Parse Status Counts

| Route | Structured | Partial | Unparsed | Total variants |
| --- | ---: | ---: | ---: | ---: |
| `form_four` | 297 | 330 | 45 | 672 |
| `form_six` | 17 | 528 | 228 | 773 |
| `certificate` | 49 | 609 | 342 | 1,000 |
| `diploma` | 28 | 31 | 0 | 59 |
| `equivalent` | 0 | 0 | 305 | 305 |
| **All variants** | **391** | **1,498** | **920** | **2,809** |

The largest risk is not missing direct Form Four routes; most CSEE four-pass routes are at least partially represented. The main risk is over-emitting incomplete `certificate` and `equivalent` variants from CSEE + NVA/Trade Test text, then leaving those variants unparsed.

## Repeated Raw Requirement Patterns

These exact raw texts account for a large share of the scope:

| Count | Raw requirement pattern |
| ---: | --- |
| 266 | CSEE with at least four passes in non-religious subjects |
| 63 | CSEE four passes OR NVA Level III with CSEE |
| 36 | Basic Technician Certificate NTA Level 4 in Social Work/Gender/Community Development/Youth Work OR ACSEE one principal and one subsidiary |
| 24 | CSEE four passes OR NVA Level III with at least two CSEE passes |
| 20 | CSEE four passes OR NVA Level III with a CSEE |
| 18 | Basic Technician Certificate NTA Level 4 in Community Development/Social Work/Gender/Youth Work OR ACSEE one principal and one subsidiary |
| 13 | Basic Technician Certificate NTA Level 4 in Law OR ACSEE one principal and one subsidiary |
| 11 | CSEE four passes including English Language |
| 11 | Basic Technician Certificate NTA Level 4 in Journalism/Mass Communication/TV Production/Media Production OR ACSEE one principal and one subsidiary |
| 11 | Basic Technician Certificate NTA Level 4 in Accountancy OR ACSEE one principal and one subsidiary |
| 9 | Basic Technician Certificate NTA Level 4 in Business Administration/Finance and Banking/Marketing OR ACSEE one principal and one subsidiary |
| 8 | Basic Technician Certificate NTA Level 4 in Business Administration OR ACSEE one principal and one subsidiary |
| 8 | CSEE four passes OR National Vocation Award Level III with CSEE |
| 8 | Accountancy/Banking/Finance/Tax/Business/Procurement/Marketing/Social Protection/Insurance route OR ACSEE one principal and one subsidiary |
| 6 | Adult Education or Teacher Certificate Grade IIIA OR ACSEE one principal and one subsidiary |
| 6 | Social Work/Gender/Community Development certificate OR ACSEE one principal and one subsidiary |
| 5 | Education Management/Administration, MUKA, Grade IIIA Teachers Certificate, Diploma in Teachers Education, or Bachelor of Education with three years of work experience |
| 5 | Accountancy/Finance and Banking certificate OR ACSEE one principal and one subsidiary |
| 5 | Procurement and Supply/Logistics/Clearing and Forwarding certificate OR ACSEE one principal and one subsidiary |

## Target Clause Structures

The current `RequirementClause` schema can model most non-technical NACTVET requirements if variants are split by route and OR branch. The following structures should be the target for parser improvements.

### Form Four

Plain CSEE four-pass route:

```ts
{
  route: "form_four",
  parseStatus: "structured",
  clauses: [{ kind: "min_csee_passes", count: 4 }],
}
```

CSEE four passes with named support subjects:

```ts
{
  route: "form_four",
  parseStatus: "structured",
  clauses: [
    { kind: "min_csee_passes", count: 4 },
    {
      kind: "subject_group",
      level: "csee",
      mode: "all_of",
      subjects: ["english"],
    },
  ],
}
```

Use the same structure for `basic_mathematics`, `kiswahili`, or tourism-specific subject additions where the raw text says `including`.

### Form Six

Generic ACSEE progression route:

```ts
{
  route: "form_six",
  parseStatus: "structured",
  clauses: [
    { kind: "min_acsee_principal_passes", count: 1 },
    {
      kind: "subject_group",
      level: "acsee",
      mode: "at_least_n_of",
      count: 1,
      subjects: ["any_principal_subject"],
    },
  ],
}
```

For broad non-technical programmes, the subject group should usually be omitted until the evaluator supports `any_principal_subject`; one principal plus one subsidiary is the meaningful requirement.

Business, accounting, finance, procurement, law, social work, education, journalism, and tourism ACSEE routes are usually:

```ts
{
  route: "form_six",
  parseStatus: "structured",
  clauses: [{ kind: "min_acsee_principal_passes", count: 1 }],
}
```

Where the raw text names subject families, use `subject_group`:

```ts
{
  route: "form_six",
  parseStatus: "structured",
  clauses: [
    { kind: "min_acsee_principal_passes", count: 1 },
    {
      kind: "subject_group",
      level: "acsee",
      mode: "at_least_n_of",
      count: 1,
      subjects: ["economics", "commerce", "accountancy", "history", "geography", "english", "kiswahili"],
    },
  ],
}
```

### Certificate

Basic Technician Certificate / NTA Level 4 in a related field:

```ts
{
  route: "certificate",
  parseStatus: "structured",
  clauses: [
    {
      kind: "prior_award",
      acceptedAwardLevels: ["certificate"],
      acceptedFields: ["related_field"],
      relatedFieldRequired: true,
    },
  ],
}
```

For field-specific families, target canonical field groups rather than overly narrow programme-title tokens:

| Programme family | Target `acceptedFields` examples |
| --- | --- |
| Accountancy / finance / banking | `accountancy`, `finance`, `banking`, `tax`, `insurance`, `risk_management` |
| Business / marketing / HR / office | `business_administration`, `business_management`, `marketing`, `human_resource_management`, `office_administration`, `secretarial_studies` |
| Procurement / logistics | `procurement`, `supply`, `logistics`, `clearing_and_forwarding`, `materials_management` |
| Social/community development | `social_work`, `community_development`, `gender`, `youth_work`, `counselling`, `psychology` |
| Law/public administration | `law`, `paralegal_studies`, `police_science`, `local_government_administration`, `public_administration`, `governance` |
| Education | `teacher_education`, `adult_education`, `education_management`, `grade_iiia_teachers_certificate` |
| Arts/media | `journalism`, `mass_communication`, `media_production`, `tv_production`, `public_relations`, `multimedia`, `film`, `music`, `graphic_arts` |
| Tourism/hospitality | `tourism`, `travel_and_tourism`, `tour_guiding`, `hospitality`, `hotel_management`, `food_production`, `food_and_beverage` |
| Records/library | `records_management`, `archives`, `library_information_science`, `information_studies` |

Any certificate from a recognized institution:

```ts
{
  route: "certificate",
  parseStatus: "structured",
  clauses: [
    {
      kind: "prior_award",
      acceptedAwardLevels: ["certificate"],
      relatedFieldRequired: false,
    },
  ],
}
```

### Diploma

NTA Level 5 / Technician Certificate top-up routes:

```ts
{
  route: "diploma",
  parseStatus: "structured",
  clauses: [
    {
      kind: "prior_award",
      acceptedAwardLevels: ["diploma"],
      acceptedFields: ["related_field"],
      relatedFieldRequired: true,
    },
  ],
}
```

Education-management rows that accept diploma or bachelor holders plus work experience need an additional model beyond the current schema:

```ts
{
  route: "diploma",
  parseStatus: "partial",
  clauses: [
    {
      kind: "prior_award",
      acceptedAwardLevels: ["diploma", "bachelor"],
      acceptedFields: ["teacher_education", "education"],
      relatedFieldRequired: true,
    },
  ],
}
```

The missing part is work experience, commonly `at least three years of working experience`.

### Equivalent

NVA Level III / Trade Test Grade I with CSEE should be modelled as equivalent, not as an empty certificate route:

```ts
{
  route: "equivalent",
  parseStatus: "structured",
  clauses: [
    {
      kind: "prior_award",
      acceptedAwardLevels: ["nva_level_iii", "trade_test_i"],
      relatedFieldRequired: true,
    },
    { kind: "min_csee_passes", count: 2 },
  ],
}
```

When the raw text only says NVA Level III with a CSEE and does not specify two CSEE passes:

```ts
{
  route: "equivalent",
  parseStatus: "partial",
  clauses: [
    {
      kind: "prior_award",
      acceptedAwardLevels: ["nva_level_iii"],
      relatedFieldRequired: true,
    },
  ],
}
```

## Unresolved Parser Gaps

1. `equivalent` is entirely unparsed in this scope: 305 unparsed variants, 0 structured, 0 partial. The repeated pattern is NVA Level III / Trade Test Grade I with CSEE.
2. `certificate` has 342 unparsed variants. Most are not true certificate progression routes; they are CSEE + NVA/Trade Test rows where the word `Certificate` in `Certificate of Secondary Education Examination` appears to trigger a certificate route.
3. `form_six` has 228 unparsed variants. Common causes are abbreviated or malformed wording: `Form VI`, `Advanced Certificate of Secondary Examination`, missing `Education`, `Principle Subjects`, `one principal and subsidiary`, and truncated guidebook rows.
4. `form_four` has 45 unparsed variants. Several are ACSEE rows incorrectly written as `Certificate of Secondary Education Examination (ACSEE)` or truncated rows beginning with ACSEE but classified as CSEE.
5. Generic ACSEE `one Principal pass and one Subsidiary in Principal subjects` is usually partial, even when no subject constraints remain to parse. This should become structured once subsidiary-pass support is explicit.
6. The parser often extracts only the first few `acceptedFields` from long NTA Level 4 lists. Business/accounting/procurement/media/library routes often list 8-15 acceptable certificates, but the structured output may keep only 3-5.
7. The schema has no explicit subsidiary-pass clause. Current output preserves principal-pass count but cannot represent `one subsidiary` except by leaving the variant partial.
8. The schema has no work-experience clause for education management and administration rows requiring three years of work experience.
9. Truncated imported rows such as `or National`, `Holders of advanced certificate of secondary`, and programme names ending in `and` need upstream row repair or a low-confidence parse status.
10. Religious studies has special wording: `including Religious Subjects` in one raw row and `non-religious subjects` in another. The parser should not globally exclude religious subjects when the programme is theology/religious studies.
11. Tourism and hospitality routes frequently accept related NVA/VETA awards with two CSEE passes. These should create equivalent variants with `relatedFieldRequired: true`, not blank certificate variants.
12. Subject extraction sometimes overreaches on non-technical ACSEE routes by inferring subjects from certificate field lists. For broad business/law/social routes, ACSEE should normally be one principal pass plus subsidiary unless the raw text clearly says `in the following subjects`.

## Recommended Parser Work Order

1. Fix route classification so CSEE does not create `certificate` variants.
2. Add NVA Level III / Trade Test Grade I equivalent parsing with optional CSEE pass count.
3. Normalize ACSEE wording variants: `Form VI`, `Advanced Certificate of Secondary Examination`, `Advanced Certificate of Secondary Education`, `ACSE`, `Principle Subjects`, and missing `with`.
4. Treat generic ACSEE one-principal-one-subsidiary as structured after subsidiary-pass modelling is added.
5. Expand prior-award field extraction to keep all comma-separated accepted certificate fields before the ACSEE OR branch.
6. Add work-experience modelling or keep those variants explicitly partial with a clear gap reason.
7. Add religious-studies exception handling for religious-subject wording.

