# Analysis Milestone

## Current Milestone

Read-only production data profiling.

The goal is to understand the current raw, enrichment, and processed data before replacing or changing the production export pipeline.

## Guardrails

- Do not replace `data/processed/*` exports during this milestone.
- Do not manually edit raw CSV files.
- Candidate processed exports belong in `analysis/build/candidate-processed/`
  until parity is proven.
- Candidate export parity means contract-compatible and regression-controlled,
  not byte-for-byte identical.
- Agents must update this file as work happens, including checklist status, next steps, and decision notes.
- Generated report output belongs in `analysis/reports/latest/`.
- Reusable analysis logic belongs in `analysis/src/kozi_analysis`.
- Notebooks should be repeatable from both Marimo UI and CLI execution.

## Target Questions

- What files do we have?
- How many rows are in each source?
- What columns exist in each source?
- Which columns overlap, drift, or conflict across sources?
- Which records are duplicated within and across sources?
- Which fields are missing for search, eligibility, location, contact, and application workflows?
- Which risks should block production transform changes?
- What should be inspected next?

## Planned Tasks

- [x] Create `analysis/README.md` explaining how to run the analysis workspace.
- [x] Create the initial Python project configuration for `uv`, `ruff`, `ty`, and tests.
- [x] Create `analysis/src/kozi_analysis` with reusable path, IO, profiling, and reporting helpers.
- [x] Create `analysis/notebooks/01_inventory.py`.
- [x] Generate `analysis/reports/latest/inventory.md`.
- [x] Generate machine-readable inventory output under `analysis/reports/latest/`.
- [x] Add focused tests/checks for reusable inventory logic.
- [x] Decide the next profiling notebook from the inventory findings.

## Latest Run

- 2026-04-30: `uv run notebooks/01_inventory.py --write-report true`
  generated `analysis/reports/latest/inventory.md` and
  `analysis/reports/latest/inventory.json`.
- 2026-04-30: Inventory found 28 data files, 23 tabular files, 14,300 raw
  rows, 857 extracted rows, 296 enrichment rows, and 34,973 processed rows.
- 2026-04-30: Verification passed with `ruff check`, `ruff format --check`,
  `ty check`, and `pytest`.
- 2026-04-30: `uv run notebooks/02_source_overlap.py --write-report true`
  generated `analysis/reports/latest/source-overlap.md` and
  `analysis/reports/latest/source-overlap.json`.
- 2026-04-30: Source overlap found 7 institution sources, 8 programme
  sources, 21 institution pair comparisons, and 28 programme pair comparisons.
- 2026-04-30: Exact overlap showed strong canonical-to-processed coverage but
  very low overlap for TCU extracted institution/programme names and logo
  enrichment, which indicates the next analysis should focus on identity alias
  and fuzzy matching needs.
- 2026-04-30: `uv run notebooks/03_identity_aliases.py --write-report true`
  generated `analysis/reports/latest/identity-aliases.md` and
  `analysis/reports/latest/identity-aliases.json`.
- 2026-04-30: Identity alias analysis now produces candidate review queues for
  3 institution source pairs and 3 programme source pairs. Programme candidates
  require institution-context overlap because title-only matching is too noisy.
- 2026-04-30: `uv run notebooks/04_feature_readiness.py --write-report true`
  generated `analysis/reports/latest/feature-readiness.md` and
  `analysis/reports/latest/feature-readiness.json`.
- 2026-04-30: Feature readiness showed search coverage is strongest, location
  is mostly usable, eligibility is partial, and contact/application/logo fields
  are the biggest weak areas.
- 2026-04-30: `uv run notebooks/05_cleanup_plan.py --write-report true`
  generated `analysis/reports/latest/cleanup-plan.md` and
  `analysis/reports/latest/cleanup-plan.json`.
- 2026-04-30: Cleanup planning identified P0 blockers for institution identity
  aliases and equivalent-route coverage before production export replacement.
- 2026-05-01: `uv run notebooks/06_p0_cleanup_design.py --write-report true`
  generated `analysis/reports/latest/p0-cleanup-design.md` and
  `analysis/reports/latest/p0-cleanup-design.json`.
- 2026-05-01: P0 cleanup design split institution identity work into a
  Deterministic Identity Rule Queue and Manual Alias Review Queue, and kept
  Equivalent Applicant Pathway work conservative for eligibility.
- 2026-04-30: User feedback showed `MILESTONE.md` and generated reports were
  not clear enough as a single spectator view. Added `analysis/STATUS.md` as
  the human-facing dashboard and kept this file as the implementation ledger.

## Spectator View

Start with `analysis/notebooks/00_status.py` to understand the current goal,
what has been built, what we have learned, why it matters, and what question
comes next.

Use this file for execution details, checklist status, and decision history.

`analysis/STATUS.md` is a short text fallback for the same narrative.

## Dashboard Task

- [x] Create `analysis/notebooks/00_status.py` as the primary spectator
  dashboard.
- [x] Add reusable dashboard snapshot helpers under `analysis/src/kozi_analysis`.
- [x] Update README, AGENTS, and STATUS to point to the dashboard first.

## Completed Tasks

- [x] Create `analysis/notebooks/03_identity_aliases.py` to inspect institution
  and programme identity drift, alias patterns, abbreviation handling, campus
  suffixes, and candidate fuzzy-matching rules before production cleaning
  changes.
- [x] Add reusable identity-alias helpers under `analysis/src/kozi_analysis`.
- [x] Generate `analysis/reports/latest/identity-aliases.md`.
- [x] Generate machine-readable identity-alias output under
  `analysis/reports/latest/`.
- [x] Add focused tests/checks for alias logic.

- [x] Create `analysis/notebooks/04_feature_readiness.py` to inspect field
  coverage for search, eligibility, location, contact, application, and
  institution-card workflows before production export replacement.
- [x] Add reusable feature-readiness helpers under `analysis/src/kozi_analysis`.
- [x] Generate `analysis/reports/latest/feature-readiness.md`.
- [x] Generate machine-readable feature-readiness output under
  `analysis/reports/latest/`.
- [x] Add focused tests/checks for feature-readiness logic.

- [x] Create `analysis/notebooks/05_cleanup_plan.py` to turn the current
  evidence into a prioritized cleanup and enrichment plan before production
  export replacement.
- [x] Add reusable cleanup-plan helpers under `analysis/src/kozi_analysis`.
- [x] Generate `analysis/reports/latest/cleanup-plan.md`.
- [x] Generate machine-readable cleanup-plan output under
  `analysis/reports/latest/`.
- [x] Add focused tests/checks for cleanup-plan logic.

- [x] Create `analysis/notebooks/06_p0_cleanup_design.py` to design
  deterministic code, manual review files, and tests for the P0 cleanup
  blockers without mutating processed data.
- [x] Add reusable P0 cleanup-design helpers under `analysis/src/kozi_analysis`.
- [x] Generate `analysis/reports/latest/p0-cleanup-design.md`.
- [x] Generate machine-readable P0 cleanup-design output under
  `analysis/reports/latest/`.
- [x] Add focused tests/checks for P0 cleanup-design logic.

- [x] Create `analysis/notebooks/02_source_overlap.py` to compare institution and
  programme identity overlap across canonical raw, fallback raw, enrichment,
  extracted, and processed sources.
- [x] Add reusable source-overlap helpers under `analysis/src/kozi_analysis`.
- [x] Generate `analysis/reports/latest/source-overlap.md`.
- [x] Generate machine-readable source-overlap output under
  `analysis/reports/latest/`.
- [x] Add focused tests/checks for overlap logic.

## Next Candidate Task

Create `analysis/notebooks/07_pipeline_replacement_plan.py` to plan the
production replacement sequence for the current TypeScript data builder without
mutating processed data yet.

## Decision Log

- 2026-04-30: `analysis/` is a production data-analysis workbench, not a throwaway notebook folder.
- 2026-04-30: Milestone tracking lives here instead of `AGENTS.md` so local agent instructions stay stable.
- 2026-04-30: `analysis/reports/latest/` is generated and ignored by git. Selected snapshots can be committed later.
- 2026-04-30: Agents maintain this file as implementation progresses so the project has a clear spectator view of what is done, next, and why.
- 2026-04-30: `analysis/` will be its own Python project with its own `pyproject.toml` and `uv.lock`, separate from the Bun/TypeScript app root.
- 2026-04-30: Initial Python dependency set is `marimo`, `pydantic`, `polars`, `pytest`, `ruff`, and `ty`. Add heavier analysis libraries only when the analysis needs them.
- 2026-04-30: Production analysis notebooks should have a CLI report-writing mode while still being useful interactively in Marimo.
- 2026-04-30: `analysis/STATUS.md` is the single human-facing dashboard. `analysis/MILESTONE.md` is the agent execution ledger.
- 2026-04-30: Replaced `STATUS.md` as the primary spectator view with
  `analysis/notebooks/00_status.py`. `STATUS.md` remains a short text fallback.
- 2026-05-01: Candidate processed exports will be generated under
  `analysis/build/candidate-processed/` and ignored by git until parity is
  proven.
- 2026-05-01: The parity gate blocks unexplained differences, not all
  differences. Candidate-vs-current comparison reports must explain row-count
  and review-flag changes before `bun run data:build` can delegate to Python.
- 2026-05-01: The first candidate exporter will be copy-through from current
  `data/processed/*` into `analysis/build/candidate-processed/` before any
  transforms are reimplemented.
- 2026-05-01: Candidate-vs-current comparison scope includes file presence,
  byte hashes, JSONL record counts, field sets, key identity coverage,
  review-flag distributions, source dataset distributions, Applicant Pathway
  flag coverage, requirement-rule parse-status distribution, and changed-record
  samples when differences exist.
