# Kozi Ipi

Kozi Ipi is a Tanzania education discovery platform for post-secondary pathways.
This context defines the domain language used for data, search, eligibility, and
student-facing guidance.

## Language

**Applicant Pathway**:
The prior education route through which a student may apply to a programme.
_Avoid_: application route, qualification route, applicant route, route

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

## Relationships

- An **Applicant Pathway** is one of Form Four, Form Six, certificate, diploma,
  or equivalent.
- A **Programme** may support one or more **Applicant Pathways**.
- Eligibility is evaluated for a student through a specific **Applicant
  Pathway**.
- An **Institution Identity** may have one or more **Institution Names**.
- An **Institution Alias** links an **Institution Name** to an **Institution
  Identity**.
- A **Manual Alias Review** may approve or reject candidate **Institution
  Aliases**.

## Example dialogue

> **Dev:** "Should the profile field be called application route?"
> **Domain expert:** "In the domain, call it **Applicant Pathway**. The code may
> use `applicationRoute`, but the product language should stay pathway-aware."

> **Dev:** "Can we merge `Ardhi University (ARU)` and `Ardhi University (ARU),
> Dar es Salaam`?"
> **Domain expert:** "Only if they represent the same **Institution Identity**
> for display, filtering, programmes, and application details. Otherwise record
> one as a separate identity or send it to **Manual Alias Review**."

## Flagged ambiguities

- "route" has been used to mean **Applicant Pathway**, route flags such as
  `acceptsDiploma`, and implementation fields such as `applicationRoute`.
  Resolved: use **Applicant Pathway** for the domain concept, and use
  implementation names only when referring to code or data fields.
- "identity", "alias", "normalized name", and "dedupe key" have been used
  interchangeably. Resolved: **Institution Identity** is the real-world entity;
  **Institution Name** is source text; **Institution Alias** is an approved
  alternate name; normalized names and keys are implementation details.
