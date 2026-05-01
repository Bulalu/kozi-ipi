# AGENTS.md

Use the Marimo skills for notebook work, especially `marimo-batch` for notebooks that must run both interactively and from the CLI. Before changing Marimo notebooks, check the current Marimo docs, starting with:

- https://docs.marimo.io/getting_started/quickstart/
- https://docs.marimo.io/getting_started/key_concepts/
- https://docs.marimo.io/guides/package_management/using_uv/
- https://docs.marimo.io/api/cli_args/

## Purpose

This directory is the production data-analysis workbench for Kozi Ipi. It should help us understand raw, enrichment, and processed data before changing production transforms.

Use `analysis/notebooks/00_status.py` as the primary spectator dashboard.
Track current milestone goals, task status, and next execution steps in `analysis/MILESTONE.md`.
Update `analysis/MILESTONE.md` as work happens. Keep checklist state, next steps, and decision notes current in the same change set as the implementation.
Maintain `analysis/STATUS.md` as a short text fallback for the dashboard. It should explain the current goal, current question, latest findings, why they matter, and the next question in plain language.
Keep spectator-facing notebook sections concise: current goal, current question, short answer, what changed, what we learned, why it matters, evidence, and next question.

## Verification Loop

Work in this order:

```text
question -> notebook -> reusable code -> report -> tests/checks -> decision
```

Each analysis task should make the spectator view clear:

- State the question being answered.
- Put reusable logic in `analysis/src/kozi_analysis`, not only in notebook cells.
- Write human-readable reports to `analysis/reports/latest/*.md`.
- Write machine-readable summaries to `analysis/reports/latest/summary.json` or task-specific JSON.
- Add focused tests or checks when logic moves into `analysis/src/kozi_analysis`.
- Use the report to decide the next data-cleaning or product-planning step.

## Marimo Rules

- Keep notebooks repeatable from the CLI.
- Use Pydantic parameter models for batch notebooks that accept CLI or UI inputs.
- Use `mo.cli_args()` for script-mode parameters and UI forms for interactive mode.
- Remember Marimo execution is reactive and dependency-driven, not top-to-bottom.
- Avoid hidden-state assumptions. Minimize cross-cell mutation; if a dataframe is mutated, define and mutate it in the same cell.
- Start notebooks with `import marimo as mo`.
- Use `uv run marimo edit analysis/notebooks/<name>.py` for interactive work.
- Use `uv run analysis/notebooks/<name>.py ...` for script execution.

## Data Rules

- Do not manually edit raw CSV files.
- Prefer read-only analysis unless `analysis/MILESTONE.md` or the current task explicitly asks for export or mutation.
- Preserve the existing processed output contract unless explicitly changing it:

```text
data/processed/institutions.jsonl
data/processed/programmes.jsonl
data/processed/entry-requirements.jsonl
data/processed/requirement-rules.jsonl
data/processed/data-quality-report.json
```

- Write candidate processed exports to `analysis/build/candidate-processed/`
  until parity is proven and the production build entrypoint is switched.
- Treat unexplained differences between candidate and current processed outputs
  as blockers. Parity is contract-compatible and regression-controlled, not
  byte-for-byte identical.

- Treat Form Four, Form Six, certificate, diploma, and equivalent applicants as first-class pathways.
- Do not make AI or semantic search the source of eligibility decisions.

## Python Tooling

- Use `uv` for Python environments, dependency management, and command execution.
- Use `ruff` for Python linting and formatting.
- Use `ty` for Python type checking.
- Prefer commands shaped like:

```sh
uv run ruff check analysis
uv run ruff format analysis
uv run ty check analysis
uv run pytest analysis/tests
```

Do not add dependencies casually. Add them only when the analysis needs them and keep them declared in the Python project configuration.
