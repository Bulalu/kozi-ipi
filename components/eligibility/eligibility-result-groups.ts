import type { EligibilityStatus } from "@/lib/eligibility"

export type EligibilityStatusResult = {
  eligibility: {
    missingClauses: string[]
    status: EligibilityStatus
  }
}

export function groupEligibilityResults<T extends EligibilityStatusResult>(
  results: T[]
) {
  const emptyGroups: Record<EligibilityStatus, T[]> = {
    eligible: [],
    likely_eligible_but_verify: [],
    cannot_determine: [],
    interest_match_only: [],
    not_eligible: [],
  }

  return results.reduce((groups, result) => {
    groups[result.eligibility.status].push(result)
    return groups
  }, emptyGroups)
}

export function countOLevelBlockedResults<T extends EligibilityStatusResult>(
  results: T[]
) {
  return results.filter(
    (result) =>
      result.eligibility.status === "cannot_determine" &&
      result.eligibility.missingClauses.some(isOLevelMissingClause)
  ).length
}

function isOLevelMissingClause(clause: string) {
  return /\b(O-Level|CSEE)\b/i.test(clause)
}
