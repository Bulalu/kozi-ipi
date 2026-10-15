import { spawnSync } from "node:child_process"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

import { processedFileSpecs } from "../lib/data/processed-data-contract"

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, "..")
const useProd = process.argv.includes("--prod")

for (const spec of processedFileSpecs) {
  if (spec.kind !== "jsonl" || !spec.convexTable) continue

  const args = [
    "import",
    ...(useProd ? ["--prod"] : []),
    "--replace",
    "--yes",
    "--table",
    spec.convexTable,
    join("data/processed", spec.name),
  ]
  const result = spawnSync("convex", args, {
    cwd: root,
    stdio: "inherit",
  })

  if (result.status !== 0) {
    process.exit(result.status ?? 1)
  }
}
