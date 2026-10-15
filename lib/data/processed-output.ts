import { mkdirSync, writeFileSync } from "node:fs"
import { join } from "node:path"

import { processedFileSpecs } from "./processed-data-contract"

export type ProcessedDataOutputs = {
  institutions: unknown[]
  programmes: unknown[]
  entryRequirements: unknown[]
  requirementRules: unknown[]
  dataQualityReport: unknown
}

const tableRows = {
  institutions: (outputs: ProcessedDataOutputs) => outputs.institutions,
  programmes: (outputs: ProcessedDataOutputs) => outputs.programmes,
  entryRequirements: (outputs: ProcessedDataOutputs) =>
    outputs.entryRequirements,
  requirementRules: (outputs: ProcessedDataOutputs) => outputs.requirementRules,
} as const

const companionJsonFiles = {
  institutions: "institutions.json",
  programmes: "programmes.json",
  entryRequirements: "entry-requirements.json",
  requirementRules: "requirement-rules.json",
} as const

export function writeProcessedDataOutputs(
  outputDir: string,
  outputs: ProcessedDataOutputs
) {
  mkdirSync(outputDir, { recursive: true })

  for (const [table, rowsForTable] of Object.entries(tableRows)) {
    const rows = rowsForTable(outputs)
    writeFileSync(
      join(outputDir, companionJsonFiles[table as keyof typeof tableRows]),
      JSON.stringify(rows, null, 2)
    )
  }

  for (const spec of processedFileSpecs) {
    if (spec.kind === "json") {
      writeFileSync(
        join(outputDir, spec.name),
        JSON.stringify(outputs.dataQualityReport, null, 2)
      )
      continue
    }

    if (!spec.convexTable) {
      throw new Error(`Missing Convex table for JSONL output ${spec.name}.`)
    }

    const rowsForTable = tableRows[spec.convexTable]
    writeJsonl(join(outputDir, spec.name), rowsForTable(outputs))
  }
}

function writeJsonl(path: string, rows: unknown[]) {
  writeFileSync(path, rows.map((row) => JSON.stringify(row)).join("\n") + "\n")
}
