# AGENTS.md

## Project

Kozi Ipi is a Tanzania education discovery platform for post-secondary pathways. It helps students, parents, and guardians find institutions and programmes by course name, career goal, location, field, award level, and applicant pathway suitability.

The platform is no longer limited to Form Four leavers. Treat Form Four, Form Six, diploma holders, and equivalent applicants as first-class supported pathways when modelling data, search, eligibility, and UI language.

## Stack

- Next.js app router
- shadcn UI preset
- Convex backend/database
- Bun package manager
- TypeScript

## Root

Work from the repository root. Do not create another nested `kozi-ipi` app folder.

## Data

Raw datasets:

```text
data/raw/tanzania-education-pathways-dataset
data/raw/tanzania-post-form-four-dataset
data/raw/tanzania-education-dataset
```

Canonical source:

```text
data/raw/tanzania-education-pathways-dataset
```

The post-Form Four dataset is a fallback source for preserving current-only records, not the full product boundary. The NACTVET-focused dataset is only an enrichment source. Do not manually edit raw CSV files. Build processed data with:

```sh
bun run data:build
```

Processed import files:

```text
data/processed/institutions.jsonl
data/processed/programmes.jsonl
data/processed/entry-requirements.jsonl
data/processed/requirement-rules.jsonl
```

Import processed data into Convex with:

```sh
bun run data:import
```

Import processed data into production Convex with:

```sh
bun run data:import:prod
```

## Search Principle

```text
Lexical search finds.
Rules decide eligibility.
Semantic search suggests.
```

MVP search should use full-text search, structured filters, synonym/intent mapping, and conservative eligibility labels. Eligibility language should be pathway-aware rather than Form-Four-only. Do not make vector search or AI chat the source of eligibility decisions.

## Important Docs

```text
docs/search-queries.md
docs/search-architecture.md
docs/eligibility-architecture.md
docs/data-integration.md
docs/admin-api.md
data/README.md
```

## Commands

```sh
bun run typecheck
bun run lint
bun run build
bun run convex:dev
bun run convex:deploy
bun run dev
```

Run `bun run convex:dev` in one terminal and `bun run dev` in another when developing locally.

<!-- convex-ai-start -->
This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read `convex/_generated/ai/guidelines.md` first** for important guidelines on how to correctly use Convex APIs and patterns. The file contains rules that override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running `npx convex ai-files install`.
<!-- convex-ai-end -->
