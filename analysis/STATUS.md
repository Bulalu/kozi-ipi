# Kozi Ipi Data Analysis Status

For the best view, open the Marimo dashboard:

```sh
cd analysis
uv run marimo edit notebooks/00_status.py
```

This file is the short text fallback.

## What We Are Trying To Do

Kozi Ipi needs a trustworthy production data pipeline. Before replacing the
current TypeScript data builder, we are building a Marimo/Python analysis
workbench that explains the data clearly.

The current phase is read-only. We are not changing `data/processed/*` yet.
First we need to understand what data we have, where sources overlap, what is
missing, and which cleaning rules are justified.

## Current Question

Are candidate processed outputs safe to treat as production-compatible?

Short answer so far: the candidate gate now blocks unexplained differences and
requires intentional changes to be listed with reasons.

The candidate export and gate notebooks write to ignored analysis output paths.
They do not mutate `data/processed/*`.

## What Exists Now

- `notebooks/01_inventory.py` answers: what files, rows, and columns do we have?
- `notebooks/02_source_overlap.py` answers: which sources share institution and
  programme identities under exact normalized matching?
- `notebooks/03_identity_aliases.py` answers: which names are candidate aliases
  when exact matching fails?
- `notebooks/04_feature_readiness.py` answers: which product fields are strong,
  partial, or weak?
- `notebooks/05_cleanup_plan.py` answers: what should be cleaned or enriched
  before pipeline replacement?
- `notebooks/06_p0_cleanup_design.py` answers: which P0 work becomes code,
  review files, and tests?
- `notebooks/07_candidate_export.py` answers: can Python generate candidate
  processed outputs behind the stable contract?
- `notebooks/08_candidate_gate.py` answers: are candidate outputs safe to treat
  as production-compatible?
- `src/kozi_analysis/` contains reusable analysis logic used by the notebooks.
- `tests/` verifies the reusable logic.
- `reports/latest/` contains generated local reports.

## What We Have Learned

- The repository has 28 data files.
- 23 of those files are tabular.
- Current counted row groups:
  - raw: 14,300 rows
  - extracted: 857 rows
  - enrichment: 296 rows
  - processed: 34,973 rows
- Exact overlap between canonical pathway institutions and processed
  institutions is strong enough to inspect further.
- Exact overlap with TCU extracted names is very weak because names often include
  campus/location/abbreviation text.
- Logo enrichment also does not exact-match the pathway institution names, which
  suggests the production pipeline needs explicit alias handling.
- Programme alias matching must include institution context. Programme title
  alone creates too many false matches.
- Feature readiness shows:
  - search average coverage: 88.92%
  - location average coverage: 77.92%
  - eligibility average coverage: 69.83%
  - contact/application average coverage: 18.89%
  - institution card average coverage: 78.54%
- Cleanup planning produced:
  - P0: identity aliases and equivalent-route coverage
  - P1: contact/application gaps, programme context matching, source overlap
  - P2: institution logos
- P0 cleanup design produced:
  - deterministic identity rule candidates
  - manual alias review candidates
  - Equivalent Applicant Pathway parser/test tasks
- Candidate export comparison produced:
  - copy-through files under `analysis/build/candidate-processed/`
  - file presence, row-count, hash, field-set, key, review-flag, source,
    pathway, parse-status, and changed-sample checks
- Candidate export gate produced:
  - blocker/expected/pass statuses for candidate differences
  - an empty expected-changes file at
    `analysis/config/candidate-gate-expected.json`
  - a script mode that can fail on blockers

## Why This Matters

If we clean or merge records before solving identity drift, we risk:

- losing valid fallback institutions
- duplicating the same institution under multiple names
- attaching programmes or logos to the wrong institution
- making search and eligibility coverage look better or worse than it is

So the export replacement must happen through a candidate path with a gate that
fails on unexplained differences before `data/processed/*` changes.

## Next Question

Which transformation slice should replace copy-through first while keeping the
processed-data contract stable?

The next notebook should be:

```text
notebooks/09_transform_slice_identity.py
```

It should implement the first narrow replacement slice behind candidate output.

## How To Read The Files

Start here:

```text
analysis/notebooks/00_status.py
```

Then read generated reports:

```text
analysis/reports/latest/inventory.md
analysis/reports/latest/source-overlap.md
analysis/reports/latest/identity-aliases.md
analysis/reports/latest/feature-readiness.md
analysis/reports/latest/cleanup-plan.md
analysis/reports/latest/p0-cleanup-design.md
analysis/reports/latest/candidate-vs-current.md
analysis/reports/latest/candidate-gate.md
```

For implementation progress and decisions:

```text
analysis/STATUS.md
analysis/MILESTONE.md
```

For agent rules:

```text
analysis/AGENTS.md
```

## How To Regenerate Reports

Run from `analysis/`:

```sh
uv run notebooks/01_inventory.py --write-report true
uv run notebooks/02_source_overlap.py --write-report true
uv run notebooks/03_identity_aliases.py --write-report true
uv run notebooks/04_feature_readiness.py --write-report true
uv run notebooks/05_cleanup_plan.py --write-report true
uv run notebooks/06_p0_cleanup_design.py --write-report true
uv run notebooks/07_candidate_export.py --copy-current true --write-report true
uv run notebooks/08_candidate_gate.py --copy-current true --write-report true --fail-on-blockers true
```

Run verification:

```sh
uv run ruff check .
uv run ruff format --check .
uv run ty check .
uv run pytest
```
