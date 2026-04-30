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
