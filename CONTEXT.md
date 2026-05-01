# Kozi Ipi

Kozi Ipi is a Tanzania education discovery platform for post-secondary pathways.
This context defines the domain language used for data, search, eligibility, and
student-facing guidance.

## Language

**Applicant Pathway**:
The prior education route through which a student may apply to a programme.
_Avoid_: application route, qualification route, applicant route, route

**Equivalent Applicant Pathway**:
A regulator-accepted non-standard prior qualification that a source explicitly
says can be used instead of Form Four, Form Six, certificate, or diploma.
_Avoid_: generic equivalent, unknown route

**Institution Identity**:
The real-world institution or campus represented by one or more source names.
_Avoid_: merge key, normalized name, dedupe key

**Institution Name**:
A label for an institution as written by a specific source.
_Avoid_: institution identity

**Institution Alias**:
An alternate institution label that refers to the same **Institution Identity**.
_Avoid_: fuzzy match, duplicate

**Institution Identity Rule**:
A deterministic rule for deciding that two **Institution Names** refer to the
same **Institution Identity**.
_Avoid_: heuristic merge

**Manual Alias Review**:
A human-reviewed mapping between **Institution Names** when an **Institution
Identity Rule** is not safe enough.
_Avoid_: automatic fuzzy merge

**Deterministic Identity Rule Queue**:
The proposed low-risk **Institution Identity Rules** that can be implemented and
tested without human case-by-case review.
_Avoid_: automatic fuzzy queue, auto-merge list

**Manual Alias Review Queue**:
The proposed **Institution Alias** candidates that require human review before
they can affect merging, display, or imports.
_Avoid_: rejected matches, fuzzy matches

**Campus**:
A location-specific branch or site of an **Institution Identity** that may have
its own programmes, location, or application details.
_Avoid_: location suffix, branch text

**Programme Offering**:
A programme as offered by a specific **Institution Identity** or **Campus**.
_Avoid_: programme title, course name

**Programme Name**:
A label for a programme as written by a specific source.
_Avoid_: programme offering

**Programme Alias**:
An alternate programme label that refers to the same **Programme Offering**.
_Avoid_: title-only match

## Relationships

- An **Applicant Pathway** is one of Form Four, Form Six, certificate, diploma,
  or equivalent.
- An **Equivalent Applicant Pathway** must be source-backed and should be
  conservative in eligibility decisions when details are vague.
- A **Programme Offering** may support one or more **Applicant Pathways**.
- Eligibility is evaluated for a student through a specific **Applicant
  Pathway**.
- An **Institution Identity** may have one or more **Institution Names**.
- An **Institution Alias** links an **Institution Name** to an **Institution
  Identity**.
- A **Manual Alias Review** may approve or reject candidate **Institution
  Aliases**.
- A **Deterministic Identity Rule Queue** contains only explainable, low-risk
  **Institution Identity Rules**.
- A **Manual Alias Review Queue** contains candidate **Institution Aliases**
  where automatic rules could change what a student sees or chooses.
- An **Institution Identity** may have one or more **Campuses**.
- A **Campus** may host one or more **Programme Offerings**.
- A **Campus** may have distinct location, contact, or application details.
- A **Programme Offering** belongs to exactly one **Institution Identity** or
  **Campus** for search and selection purposes.
- A **Programme Alias** links a **Programme Name** to a **Programme Offering**.

## Example dialogue

> **Dev:** "Should the profile field be called application route?"
> **Domain expert:** "In the domain, call it **Applicant Pathway**. The code may
> use `applicationRoute`, but the product language should stay pathway-aware."

> **Dev:** "The source says `or equivalent`. Can we mark the student eligible?"
> **Domain expert:** "Not from that phrase alone. Treat it as an **Equivalent
> Applicant Pathway** for discovery, but use `cannot_determine` or
> `likely_eligible_but_verify` unless the rule is structured enough."

> **Dev:** "Can we merge `Ardhi University (ARU)` and `Ardhi University (ARU),
> Dar es Salaam`?"
> **Domain expert:** "Only if they represent the same **Institution Identity**
> for display, filtering, programmes, and application details. Otherwise record
> one as a separate identity or send it to **Manual Alias Review**."

> **Dev:** "Can punctuation and trailing location text be automatic?"
> **Domain expert:** "Only when the rule is explainable and low-risk. Otherwise
> put the candidate in the **Manual Alias Review Queue**."

> **Dev:** "Should `CBE - Dar es Salaam` and `CBE - Dodoma` become one card?"
> **Domain expert:** "Not automatically. If programme availability or location
> differs, model them as **Campuses** under the same **Institution Identity**."

> **Dev:** "Can we dedupe `Bachelor Degree in Accounting` by title?"
> **Domain expert:** "No. That title at two different institutions represents
> different **Programme Offerings**. Match by title only after institution or
> campus identity agrees."

## Flagged ambiguities

- "route" has been used to mean **Applicant Pathway**, route flags such as
  `acceptsDiploma`, and implementation fields such as `applicationRoute`.
  Resolved: use **Applicant Pathway** for the domain concept, and use
  implementation names only when referring to code or data fields.
- "equivalent" can mean foreign qualification, mature-age entry, foundation
  programme, recognized prior learning, professional qualification, or a vague
  "or equivalent" phrase. Resolved: **Equivalent Applicant Pathway** is
  first-class for discovery, but conservative for eligibility unless the source
  gives enough detail to evaluate it.
- "identity", "alias", "normalized name", and "dedupe key" have been used
  interchangeably. Resolved: **Institution Identity** is the real-world entity;
  **Institution Name** is source text; **Institution Alias** is an approved
  alternate name; normalized names and keys are implementation details.
- "automatic merge" is too broad. Resolved: use **Deterministic Identity Rule
  Queue** for low-risk rules, and **Manual Alias Review Queue** for candidates
  where automatic matching could change display, filtering, programme
  attachment, or application guidance.
- Location suffixes such as "Dar es Salaam", "Dodoma", or "Campus" can mean
  either descriptive location text or a real **Campus**. Resolved: treat
  **Campus** as first-class when the distinction affects programmes, location,
  contact, or application details.
- "programme", "course", and "title" have been used loosely. Resolved:
  **Programme Offering** is what students choose; **Programme Name** is source
  text; **Programme Alias** is an approved alternate label for the same offering.
