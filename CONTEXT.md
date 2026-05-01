# Kozi Ipi

Kozi Ipi is a Tanzania education discovery platform for post-secondary pathways.
This context defines the domain language used for data, search, eligibility, and
student-facing guidance.

## Language

**Applicant Pathway**:
The prior education route through which a student may apply to a programme.
_Avoid_: application route, qualification route, applicant route, route

## Relationships

- An **Applicant Pathway** is one of Form Four, Form Six, certificate, diploma,
  or equivalent.
- A **Programme** may support one or more **Applicant Pathways**.
- Eligibility is evaluated for a student through a specific **Applicant
  Pathway**.

## Example dialogue

> **Dev:** "Should the profile field be called application route?"
> **Domain expert:** "In the domain, call it **Applicant Pathway**. The code may
> use `applicationRoute`, but the product language should stay pathway-aware."

## Flagged ambiguities

- "route" has been used to mean **Applicant Pathway**, route flags such as
  `acceptsDiploma`, and implementation fields such as `applicationRoute`.
  Resolved: use **Applicant Pathway** for the domain concept, and use
  implementation names only when referring to code or data fields.

