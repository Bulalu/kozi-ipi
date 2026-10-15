import processedDataContract from "./processed-data-contract.json"
import type { ApplicantPathwayFlagField } from "../domain/applicant-pathways"

export type ProcessedFileKind = "json" | "jsonl"
export type ProcessedConvexTable =
  | "institutions"
  | "programmes"
  | "entryRequirements"
  | "requirementRules"

export type ProcessedFileSpec = {
  name: string
  kind: ProcessedFileKind
  convexTable?: ProcessedConvexTable
  keyFields: string[]
}

export const processedFileSpecs =
  processedDataContract.files as readonly ProcessedFileSpec[]

export const processedApplicantPathwayFields =
  processedDataContract.applicantPathwayFields as readonly ApplicantPathwayFlagField[]

export function processedRecordIdentity(
  record: Record<string, unknown>,
  keyFields: readonly string[]
) {
  if (keyFields.length === 0) {
    return JSON.stringify(record)
  }

  return keyFields.map((field) => String(record[field] ?? "")).join(" :: ")
}
