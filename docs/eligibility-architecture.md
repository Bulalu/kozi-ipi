# Kozi Ipi Eligibility Architecture

Kozi Ipi eligibility should turn student results into conservative, source-backed programme guidance. It should not replace search. It should sit on top of search and answer a different question:

```text
Search: what programmes match this interest or filter?
Eligibility: given this student profile, how safe is this programme option?
```

The core principle remains:

```text
Lexical search finds.
Rules decide eligibility.
Semantic search suggests.
```

AI or vector search may help users discover possible paths, but it must never be the source of an eligibility decision.

## Target Flow

```text
Student input
-> profile normalization
-> route-aware candidate generation, with query optional
-> fetch route-specific requirement variants
-> evaluate all matching variants
-> keep the best variant per programme
-> assign verdict bucket
-> rank within bucket
-> explain using matched/missing clauses and official source
```

The product should support two modes:

```text
Search-led: "nursing", "ICT", "nataka kuwa nurse"
Profile-led: "I have these results. What can I study?"
```

This means eligibility APIs must accept an optional query. A student should be able to enter grades and browse eligible courses without typing a programme name.

## Student Profile

Student input should be normalized before evaluation. The UI can ask simple questions, but the system should derive pass counts, ACSEE points, principal/subsidiary pass status, and canonical subject keys.

Keep CSEE data available for all application routes because some certificate, diploma, and degree routes still require O-Level support subjects.

Recommended input shape:

```ts
type StudentEligibilityProfile = {
  applicationRoute:
    | "form_four"
    | "form_six"
    | "certificate"
    | "diploma"
    | "equivalent"

  csee?: {
    division?: "I" | "II" | "III" | "IV" | "0"
    subjects: Array<{
      subject: string
      grade: "A" | "B" | "C" | "D" | "E" | "F"
    }>
  }

  acsee?: {
    division?: "I" | "II" | "III" | "IV" | "0"
    combination?: string
    subjects: Array<{
      subject: string
      grade: "A" | "B" | "C" | "D" | "E" | "S" | "F"
    }>
  }

  certificate?: {
    awardName: string
    field?: string
    ntaLevel?: string
    gpa?: number
  }

  diploma?: {
    awardName: string
    field?: string
    ntaLevel?: string
    gpa?: number
  }

  equivalent?: {
    description: string
  }

  preferences?: {
    query?: string
    fieldCategory?: string
    region?: string
    awardLevel?: string
  }
}
```

Recommended normalized shape:

```ts
type NormalizedStudentProfile = StudentEligibilityProfile & {
  cseeSummary?: {
    passCount: number
    subjectGrades: Record<string, string>
  }

  acseeSummary?: {
    division?: "I" | "II" | "III" | "IV" | "0"
    principalPassCount: number
    subsidiaryPassCount: number
    points: number
    subjectGrades: Record<string, string>
  }

  normalizedSubjects: string[]
}
```

ACSEE division should be captured as part of the student profile because students know and use it, and some guidance may reference it. For eligibility decisions, ACSEE principal passes, points, required subjects, and subject grades should usually carry more weight than division alone.

## Subject Normalization

Subject normalization is first-class infrastructure. Parsing and evaluation should use canonical subject keys, not raw labels.

Examples:

```text
Basic Mathematics -> mathematics
Mathematics -> mathematics
Advanced Mathematics -> advanced_mathematics
English -> english
English Language -> english
Computer Studies -> computer_science
Computer Science -> computer_science
ICT -> computer_science
Book Keeping -> bookkeeping
Accountancy -> accountancy
Food & Nutrition -> nutrition
Agriculture Science -> agriculture
```

Implementation should start in a shared pure TypeScript module, for example:

```text
lib/eligibility/subjects.ts
```

Convex code can import pure helpers from shared modules where the runtime supports them, or mirror the same pure helpers under `convex/eligibility` if needed.

## Requirement Data Model

Keep `entryRequirements` as the canonical source rows. They preserve official raw text, route flags, source URLs, and confidence.

Add a separate parsed/evaluable rules layer. Do not overload `programmes.minimumEntryRequirements`, because programme-level summaries can blur route-specific requirements.

Recommended processed file:

```text
data/processed/requirement-rules.jsonl
```

Recommended Convex table:

```text
requirementRules
```

The parser should produce rule sets with variants, not one flat requirement object. Real requirements often contain OR branches and conditional clauses.

```ts
type RequirementRuleSet = {
  programmeKey: string
  institutionKey: string
  variants: RequirementVariant[]
  rawRequirementText: string
  sourceUrl: string
  confidence: "high" | "medium" | "low"
  parseVersion: string
}

type RequirementVariant = {
  route: "form_four" | "form_six" | "certificate" | "diploma" | "equivalent"
  clauses: RequirementClause[]
  parseStatus: "structured" | "partial" | "unparsed"
}

type RequirementClause =
  | { kind: "min_csee_passes"; count: number }
  | { kind: "min_csee_division"; division: "I" | "II" | "III" | "IV" }
  | { kind: "min_acsee_division"; division: "I" | "II" | "III" | "IV" }
  | { kind: "min_acsee_principal_passes"; count: number }
  | { kind: "min_acsee_points"; points: number }
  | {
      kind: "subject_group"
      level: "csee" | "acsee"
      mode: "all_of" | "one_of" | "at_least_n_of"
      count?: number
      subjects: string[]
      minGrade?: string
    }
  | {
      kind: "prior_award"
      acceptedAwardLevels?: string[]
      acceptedFields?: string[]
      relatedFieldRequired?: boolean
      minGpa?: number
    }
  | {
      kind: "o_level_subject_grade"
      subject: string
      minGrade: string
    }
```

Variants model OR branches. Clauses inside a variant are AND conditions.

Examples:

```text
Certificate route OR ACSEE route
Diploma in a related field OR Foundation Certificate with GPA 3.0
Two principal passes in Mathematics and Physics, plus O-Level Chemistry if Chemistry is missing at A-Level
Four CSEE passes including at least two science subjects
```

## Route Flags

Existing route flags are useful for narrowing candidates:

```text
acceptsFormFourDirect
acceptsFormSix
acceptsCertificate
acceptsDiploma
acceptsEquivalent
```

They are not enough to claim eligibility.

With only route flags, the strongest safe verdict is:

```text
likely_eligible_but_verify
cannot_determine
```

Never return `eligible` from route flags alone. A route flag only proves that a route exists; it does not prove required subjects, GPA, points, or related-field constraints.

## Verdicts

Use these internal verdicts:

```text
eligible
likely_eligible_but_verify
interest_match_only
not_eligible
cannot_determine
```

Semantics:

```text
eligible
Structured rules matched and confidence is high enough.

likely_eligible_but_verify
Route or partial rules mostly match, but parser/source/equivalency confidence is not strong enough.

cannot_determine
Data is incomplete, unparsed, or too ambiguous for a decision.

not_eligible
High-confidence structured rules clearly fail.

interest_match_only
The programme matches the query or preference, but there is no usable eligibility basis.
```

Use safer public wording:

```text
Meets published minimum requirements
May meet requirements - verify details
Could not verify from available data
Does not currently meet the published minimum requirements
Interest match only
```

Avoid "you qualify" unless the product later has legal/content review for that wording.

## Evaluator

The evaluator should be pure deterministic TypeScript.

Suggested modules:

```text
lib/eligibility/profile.ts
lib/eligibility/subjects.ts
lib/eligibility/grades.ts
lib/eligibility/points.ts
lib/eligibility/rules.ts
lib/eligibility/evaluate.ts
lib/eligibility/explanations.ts
```

The evaluation output should include machine-readable reasons and UI-ready explanation text.

```ts
type EligibilityEvaluation = {
  status:
    | "eligible"
    | "likely_eligible_but_verify"
    | "interest_match_only"
    | "not_eligible"
    | "cannot_determine"
  matchedRoute?: string
  matchedVariantIndex?: number
  confidence: "high" | "medium" | "low"
  matchedClauses: string[]
  missingClauses: string[]
  warnings: string[]
  sourceUrl: string
  rawRequirementText: string
}
```

When multiple variants exist for one programme, evaluate all variants and keep the best one. Ranking preference:

```text
eligible
likely_eligible_but_verify
cannot_determine
interest_match_only
not_eligible
```

## Convex Integration

Add a new query rather than destabilizing existing search first:

```ts
programmes.eligibleSearchPaginated({
  query?: string,
  filters?: ProgrammeFilters,
  profile: StudentEligibilityProfile,
  paginationOpts,
})
```

Candidate generation should support:

```text
query present -> smart search candidates
query missing -> route-aware browse candidates
```

For route-aware candidate narrowing, add or use indexes/search filters for:

```text
acceptsFormFourDirect
acceptsFormSix
acceptsCertificate
acceptsDiploma
acceptsEquivalent
```

Search still finds candidate programmes. Eligibility rules only evaluate candidates.

Return shape should be bucketed:

```ts
type EligibleSearchPage = {
  page: Array<ProgrammeResult & { eligibility: EligibilityEvaluation }>
  buckets: {
    eligible: number
    likelyEligibleButVerify: number
    cannotDetermine: number
    interestMatchOnly: number
    notEligible: number
  }
  isDone: boolean
  continueCursor: string
}
```

## Frontend Flow

Add a dedicated flow:

```text
Find courses I may be eligible for
```

Steps:

```text
1. Choose application route
2. Enter grades/results
3. Add optional interest, field, award level, and region
4. Review bucketed programme results
5. Open a result to see matched and missing requirements
```

The UI should support:

```text
Form Four: CSEE subjects and grades, optional division
Form Six: ACSEE subjects and grades, optional division and combination
Certificate: award name, field, NTA level, GPA
Diploma: award name, field, NTA level, GPA
Equivalent: description with conservative verify messaging
```

## Privacy

Grades are sensitive. The product should not store full grade profiles in the first eligibility release.

Acceptable early approach:

```text
Client submits profile to Convex query.
Convex evaluates and returns results.
Analytics logs only route, coarse bucket counts, and non-sensitive query metadata.
```

Do not log raw subject-grade profiles in `searchEvents`.

Do not persist full grade profiles in:

```text
server database
localStorage
sessionStorage
cookies
```

The first release should keep grades in in-memory UI state only. Refreshing or closing the tab should clear the entered grades.

## Test Strategy

Build rule contracts and gold fixtures before broad implementation.

Required fixture categories:

```text
Form Four direct diploma rows
Form Six degree rows
certificate progression rows
diploma progression rows
ambiguous or unparseable rows
conditional O-Level support subject cases
at_least_n_of subject group cases
OR-branch route cases
```

Test layers:

```text
subject normalization tests
grade/pass-count/points utility tests
requirement clause evaluator tests
variant best-match tests
verdict semantics tests
Convex eligible-search contract tests
frontend form validation tests
```

The tests should prove conservative behavior:

```text
route flag only -> likely_eligible_but_verify or cannot_determine, never eligible
unparsed requirement -> cannot_determine
missing required subject -> not_eligible only when rules are high confidence
partial parse -> likely_eligible_but_verify or cannot_determine
```

## Implementation Order

### PR 1: Domain Foundation

- Profile types
- Subject taxonomy
- Grade utilities
- ACSEE division, points, and pass-count utilities
- Rule-set, variant, and clause types
- Gold fixtures from real requirements

### PR 2: Pure Evaluator

- Clause evaluator
- Variant evaluator
- Best-variant selector
- Explanation module
- Tests for Form Four, Form Six, certificate, diploma, and ambiguous cases

### PR 3: Convex Integration

- `programmes.eligibleSearchPaginated`
- Route-aware candidate narrowing
- Fetch entry requirements or parsed rule rows
- Bucketed return shape
- Contract tests

### PR 4: Data Parser Improvements

- `data/processed/requirement-rules.jsonl`
- Parser coverage report
- Unresolved-fragment reporting
- Parse confidence and parse status
- Convex import for `requirementRules`

### PR 5: Frontend Flow

- Pathway selection
- Grade entry
- Interest/preference selection
- Bucketed results
- Matched/missing requirement explanations

## Non-Goals For First Release

- AI-generated eligibility decisions
- Storing full grade profiles by default
- Claiming eligibility from route flags alone
- Fully parsing every official requirement before launch
- Replacing the current search experience
