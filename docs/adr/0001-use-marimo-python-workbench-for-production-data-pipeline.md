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

Before replacement, candidate processed outputs from the Marimo/Python pipeline
will be written under `analysis/build/candidate-processed/`. That directory is a
generated build artifact, ignored by git, and must be compared against the
current `data/processed/*` contract before `bun run data:build` delegates to the
new exporter.

The replacement gate is contract-compatible and regression-controlled parity,
not byte-for-byte equality. Candidate outputs must contain the same output files,
validate against expected schemas, preserve Convex import table names, explain
row-count differences in `analysis/reports/latest/candidate-vs-current.*`, keep
known data/search/eligibility contract tests passing, account for P0
identity/equivalent-pathway decisions, and avoid unexplained `needsReview`
spikes.

The first candidate exporter will be copy-through: it will copy the current
`data/processed/*` files into `analysis/build/candidate-processed/` and generate
candidate-vs-current reports before any transforms are reimplemented. This
proves the export path, ignored build artifact path, and comparison machinery
before pipeline behavior changes.

The candidate-vs-current comparison must inspect file presence, byte hashes,
JSONL record counts, top-level field sets, key identity coverage, `needsReview`
and `reviewReasons` distributions, `sourceDatasets` distributions, Applicant
Pathway flag coverage, requirement-rule parse-status distribution, and sample
changed records when differences exist. Copy-through exports should have equal
hashes and zero changed-record samples.
