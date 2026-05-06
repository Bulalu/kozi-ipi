# Kozi Ipi Search Architecture

Kozi Ipi search should be built around this principle:

```text
Lexical search finds.
Rules decide eligibility.
Semantic search suggests.
```

The product is not just a generic directory search. It helps Form Four leavers, Form Six leavers, diploma holders, parents, and guardians make education decisions, so search must be accurate, explainable, and conservative about eligibility.

## Recommendation

Use a staged search architecture.

### MVP

Build the first version with:

- Full-text/keyword search
- Structured filters
- English/Swahili synonym mapping
- Query classification
- Eligibility rules
- Clear result explanations
- Search analytics

Do not use AI chat or vector search as the main search engine in the MVP.

### Long Term

Add hybrid search later:

- Lexical search for exact course, institution, region, and filter matching
- Vector search for vague natural-language discovery
- Eligibility rules as the final decision layer
- Reranking only after real search analytics show ranking problems
- AI chat only after the normal search experience is trustworthy

## Why Not Pure Vector Search

Vector search is useful for vague intent, such as:

```text
I like helping people
nataka kazi ya ofisini
I want something practical
I want a course that can help me get employed quickly
```

But it should not decide exact facts like:

```text
region
award level
required subjects
fees
regulator
eligibility
accreditation
```

For Kozi Ipi, vector search can suggest possible matches, but only structured data and eligibility rules should decide whether a student appears qualified.

## MVP Query Pipeline

```text
User query
-> normalize text
-> detect language/mixed language
-> extract filters and constraints
-> classify query intent
-> expand synonyms and aliases
-> run lexical search
-> apply structured filters
-> apply ranking boosts/demotions
-> run eligibility rules if enough data exists
-> group results by eligibility status
-> explain why each result matched
-> log analytics
```

## Query Intent Types

Recommended intent labels:

```text
known_item_programme
known_item_institution
faceted_browse
eligibility_check
career_goal
comparison
open_discovery
```

Examples:

```text
diploma in clinical medicine -> known_item_programme
DIT -> known_item_institution
government colleges in Mwanza -> faceted_browse
I got Division III, what can I study? -> eligibility_check
nataka kuwa nurse -> career_goal
ICT vs procurement -> comparison
what should I study after Form Four? -> open_discovery
```

## Search Document Shape

Create denormalized search documents for programmes.

Recommended fields:

```text
programme_id
institution_id
programme_name
normalized_programme_name
institution_name
institution_aliases
award_level
field_category
course_family
career_goal_tags
region
district
institution_type
ownership_type
regulator
fees_min
fees_max
fee_band
duration
study_mode
source_url
source_confidence
last_verified_date
raw_requirement_text
requirement_summary_text
requirement_rules_json
suitable_for_form_four_leaver
requires_math
requires_physics
requires_biology
requires_chemistry
eligibility_confidence
verification_status
search_text
needs_review
```

## Building `search_text`

For the MVP, create one strong searchable text field from:

```text
programme name
programme aliases
institution name
institution aliases
field category
course family
career tags
English keywords
Swahili keywords
region
district
award level
short requirement text
```

Example:

```text
Ordinary Diploma in Nursing and Midwifery nursing afya hospital nurse health medical diploma Dar es Salaam Form Four biology chemistry
```

## Structured Filters

High-priority filters:

```text
region
district
award_level
field_category
course_family
institution_type
ownership_type
regulator
suitable_for_form_four_leaver
requires_math
requires_physics
fee_band
study_mode
verification_status
confidence_level
```

Filters should handle hard facts. Synonyms should help text search, but structured filters should use canonical values.

## Synonym Strategy

Maintain a bilingual taxonomy table instead of hard-coding everything in search code.

Examples:

```text
afya -> health, nursing, clinical medicine, medical laboratory, pharmacy
nurse -> nursing, midwifery, health
computer -> ICT, IT, computing, software, networking
biashara -> business, accounting, procurement, marketing
ofisini -> business administration, accounting, records management, procurement
serikali -> public, government
bei nafuu -> affordable, low fees
```

Use one-way expansion for broad concepts.

Example:

```text
afya -> health courses
```

Do not always reverse it.

## Eligibility Rules

Eligibility should be a separate deterministic layer.

Detailed profile, rule, evaluator, and rollout design lives in
[`docs/eligibility-architecture.md`](./eligibility-architecture.md).

Recommended states:

```text
eligible
likely_eligible_but_verify
interest_match_only
not_eligible
cannot_determine
```

Rules:

- Never let vector search or AI override eligibility.
- Never say "you qualify" unless the rules engine can support it.
- If requirement data is incomplete, show `cannot_determine`.
- Always preserve the raw official requirement text.
- Always show source URL and verification date.

## Result Buckets

Search results should be grouped like:

```text
Eligible now
Likely eligible, verify details
Possible interest matches
Cannot determine from available data
```

Avoid mixing interest matches with eligibility-confirmed results.

## Ranking

Start with simple scoring.

Boost:

```text
exact programme match
exact institution match
matching region
matching award level
matching course family
verified official source
complete entry requirements
suitable for Form Four leaver
```

Demote:

```text
missing requirements
low confidence data
needs_review rows
incomplete programme names
not suitable for Form Four leaver
stale source dates
```

## No-Result Behavior

When no exact results are found:

```text
1. Retry with synonyms and aliases.
2. Show related course families.
3. Suggest broader filters.
4. Keep hard constraints intact.
5. Clearly label related results as suggestions, not eligibility matches.
```

Never relax a user's hard eligibility constraint silently.

## Analytics

Track:

```text
search_submitted
filter_applied
result_clicked
source_link_clicked
no_results_viewed
query_reformulated
eligibility_profile_submitted
eligibility_result_viewed
suggest_edit_clicked
```

Use analytics to improve:

```text
synonyms
aliases
no-result recovery
ranking
missing data priorities
eligibility rules
```

## Roadmap

### Phase 1: Lexical MVP

- Backend database
- Denormalized programme search documents
- Full-text search
- Filters
- Synonym expansion
- Basic query classification
- Result explanations

### Phase 2: Eligibility

- Structured requirement parser
- Rule engine
- Eligibility buckets
- User-entered grade/subject profile
- Conservative `cannot_determine` state

### Phase 3: Search Quality

- Query analytics
- No-result reports
- Synonym admin tools
- Search test suite
- Gold query evaluation set

### Phase 4: Hybrid Search

- Embeddings for course-family and career-goal templates
- Vector search for vague discovery queries
- Hybrid ranking for mixed queries
- Related course recommendations

### Phase 5: Assistant Layer

- AI-assisted comparisons
- Source-cited answers
- Chat as a secondary interface
- No AI-generated eligibility claims without rules-engine support
