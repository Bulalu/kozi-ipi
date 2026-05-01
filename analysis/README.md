# Kozi Ipi Analysis

This directory is the production data-analysis workbench for Kozi Ipi.

Use it to understand raw, enrichment, extracted, and processed data before changing the production data export pipeline.

## Start Here

Open the Marimo dashboard first:

```sh
uv run marimo edit notebooks/00_status.py
```

It is the primary spectator view for what is going on, what we have learned,
and what question comes next.

`STATUS.md` is the short text fallback.

## Setup

Run commands from this directory:

```sh
cd analysis
uv sync
```

## Interactive Notebooks

Open the first inventory notebook with:

```sh
uv run marimo edit notebooks/01_inventory.py
```

Open the source-overlap notebook with:

```sh
uv run marimo edit notebooks/02_source_overlap.py
```

Open the identity-alias notebook with:

```sh
uv run marimo edit notebooks/03_identity_aliases.py
```

Open the feature-readiness notebook with:

```sh
uv run marimo edit notebooks/04_feature_readiness.py
```

Open the cleanup-plan notebook with:

```sh
uv run marimo edit notebooks/05_cleanup_plan.py
```

Open the P0 cleanup-design notebook with:

```sh
uv run marimo edit notebooks/06_p0_cleanup_design.py
```

Open the candidate export comparison notebook with:

```sh
uv run marimo edit notebooks/07_candidate_export.py
```

Open the candidate export gate notebook with:

```sh
uv run marimo edit notebooks/08_candidate_gate.py
```

Open the identity transform slice notebook with:

```sh
uv run marimo edit notebooks/09_transform_slice_identity.py
```

## CLI Reports

Regenerate the inventory report with:

```sh
uv run notebooks/01_inventory.py --write-report true
```

Regenerate the source-overlap report with:

```sh
uv run notebooks/02_source_overlap.py --write-report true
```

Regenerate the identity-alias report with:

```sh
uv run notebooks/03_identity_aliases.py --write-report true
```

Regenerate the feature-readiness report with:

```sh
uv run notebooks/04_feature_readiness.py --write-report true
```

Regenerate the cleanup-plan report with:

```sh
uv run notebooks/05_cleanup_plan.py --write-report true
```

Regenerate the P0 cleanup-design report with:

```sh
uv run notebooks/06_p0_cleanup_design.py --write-report true
```

Regenerate the candidate export comparison report with:

```sh
uv run notebooks/07_candidate_export.py --copy-current true --write-report true
```

Regenerate the candidate export gate report with:

```sh
uv run notebooks/08_candidate_gate.py --copy-current true --write-report true --fail-on-blockers true
```

Regenerate the identity transform slice report with:

```sh
uv run notebooks/09_transform_slice_identity.py --copy-current true --write-report true --fail-on-blockers true
```

Generated reports are written to:

```text
analysis/reports/latest/
```

`reports/latest/` is ignored by git. Commit selected snapshots later only when a report is stable and useful for project history.

## Verification

Run checks from `analysis/`:

```sh
uv run ruff check .
uv run ruff format --check .
uv run ty check .
uv run pytest
```

## Current Milestone

Track current work in `MILESTONE.md`. Agents should update that file as implementation progresses.
