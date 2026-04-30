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

Can we trust the identity fields that connect institutions and programmes across
the raw, enrichment, extracted, and processed datasets?

Short answer so far: not fully.

Exact matching works well for some canonical-to-processed paths, but it fails
badly for source names that include campus names, abbreviations, suffixes, or
different institution naming styles. That means identity/alias analysis must
happen before deeper production cleaning.

## What Exists Now

- `notebooks/01_inventory.py` answers: what files, rows, and columns do we have?
- `notebooks/02_source_overlap.py` answers: which sources share institution and
  programme identities under exact normalized matching?
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

## Why This Matters

If we clean or merge records before solving identity drift, we risk:

- losing valid fallback institutions
- duplicating the same institution under multiple names
- attaching programmes or logos to the wrong institution
- making search and eligibility coverage look better or worse than it is

So the next correct move is identity analysis, not export replacement.

## Next Question

What institution and programme alias rules are safe enough to propose for the
production pipeline?

The next notebook should be:

```text
notebooks/03_identity_aliases.py
```

It should inspect abbreviation handling, campus suffixes, location suffixes,
programme-code clues, and candidate fuzzy matches. It should not mutate
processed data yet.

## How To Read The Files

Start here:

```text
analysis/notebooks/00_status.py
```

Then read generated reports:

```text
analysis/reports/latest/inventory.md
analysis/reports/latest/source-overlap.md
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
```

Run verification:

```sh
uv run ruff check .
uv run ruff format --check .
uv run ty check .
uv run pytest
```
