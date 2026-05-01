# Use Marimo Python Workbench For Production Data Pipeline

Kozi Ipi will move production data analysis and eventually processed-data
generation into the `analysis/` Marimo/Python workbench, while preserving the
existing `data/processed/*` output contract for Convex imports until replacement
is ready. This is a deliberate trade-off: the app remains Bun/TypeScript, but
the data pipeline needs repeatable profiling, review queues, report generation,
and notebook-based analysis that are better served by Python and Marimo.

Replacement means changing the implementation behind the existing project
entrypoint and output contract, not changing the downstream app or Convex
contract. `bun run data:build` should eventually delegate to the Marimo/Python
export job, and `data/processed/*` should remain the stable import boundary
until a separately reviewed contract change is needed.
