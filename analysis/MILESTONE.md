# Analysis Milestone

## Current Milestone

Read-only production data profiling.

The goal is to understand the current raw, enrichment, and processed data before replacing or changing the production export pipeline.

## Guardrails

- Do not replace `data/processed/*` exports during this milestone.
- Do not manually edit raw CSV files.
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

## Completed Task

- [x] Create `analysis/notebooks/02_source_overlap.py` to compare institution and
programme identity overlap across canonical raw, fallback raw, enrichment,
extracted, and processed sources.
- [x] Add reusable source-overlap helpers under `analysis/src/kozi_analysis`.
- [x] Generate `analysis/reports/latest/source-overlap.md`.
- [x] Generate machine-readable source-overlap output under
  `analysis/reports/latest/`.
- [x] Add focused tests/checks for overlap logic.

## Next Candidate Task

Create `analysis/notebooks/03_identity_aliases.py` to inspect institution and
programme identity drift, alias patterns, abbreviation handling, campus suffixes,
and candidate fuzzy-matching rules before production cleaning changes.

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
