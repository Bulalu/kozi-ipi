import type { EligibilityEvaluation, EligibilityStatus } from "./types"

export const eligibilityStatusLabels: Record<EligibilityStatus, string> = {
  eligible: "Meets published minimum requirements",
  likely_eligible_but_verify: "May meet requirements - verify details",
  cannot_determine: "Could not verify from available data",
  not_eligible: "Does not currently meet the published minimum requirements",
  interest_match_only: "Interest match only",
}

export function summarizeEligibilityEvaluation(
  evaluation: EligibilityEvaluation
): string {
  const label = eligibilityStatusLabels[evaluation.status]
  const firstMissing = evaluation.missingClauses[0]
  const firstWarning = evaluation.warnings[0]

  if (firstMissing) {
    return `${label}. ${firstMissing}`
  }
  if (firstWarning) {
    return `${label}. ${firstWarning}`
  }
  return label
}

