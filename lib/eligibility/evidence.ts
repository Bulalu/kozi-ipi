import type { EligibilityEvaluation, EligibilityStatus } from "./types"
import type {
  ApplicationRoute,
  ApplicantPathwayFlagRecord,
} from "../domain/applicant-pathways"
import { applicantPathwayFlagValue } from "../domain/applicant-pathways"
import { compatibleInstitutionIdentityKeys } from "../domain/institution-identity"

export type EligibilityBucketCounts = {
  eligible: number
  likelyEligibleButVerify: number
  cannotDetermine: number
  interestMatchOnly: number
  notEligible: number
}

export function compareEligibilityEvaluations(
  left: EligibilityEvaluation,
  right: EligibilityEvaluation
) {
  const statusDifference =
    eligibilityStatusRank(right.status) - eligibilityStatusRank(left.status)
  if (statusDifference !== 0) {
    return statusDifference
  }

  return confidenceRank(right.confidence) - confidenceRank(left.confidence)
}

export function eligibilityStatusRank(status: EligibilityStatus) {
  if (status === "eligible") {
    return 5
  }
  if (status === "likely_eligible_but_verify") {
    return 4
  }
  if (status === "cannot_determine") {
    return 3
  }
  if (status === "interest_match_only") {
    return 2
  }
  return 1
}

function confidenceRank(confidence: EligibilityEvaluation["confidence"]) {
  if (confidence === "high") {
    return 3
  }
  if (confidence === "medium") {
    return 2
  }
  return 1
}

export function countEligibilityBuckets(
  evaluations: EligibilityEvaluation[]
): EligibilityBucketCounts {
  const buckets: EligibilityBucketCounts = {
    eligible: 0,
    likelyEligibleButVerify: 0,
    cannotDetermine: 0,
    interestMatchOnly: 0,
    notEligible: 0,
  }

  for (const evaluation of evaluations) {
    if (evaluation.status === "eligible") {
      buckets.eligible += 1
    } else if (evaluation.status === "likely_eligible_but_verify") {
      buckets.likelyEligibleButVerify += 1
    } else if (evaluation.status === "cannot_determine") {
      buckets.cannotDetermine += 1
    } else if (evaluation.status === "interest_match_only") {
      buckets.interestMatchOnly += 1
    } else {
      buckets.notEligible += 1
    }
  }

  return buckets
}

export function fallbackEligibilityFromApplicantPathwayFlag(
  programme: ApplicantPathwayFlagRecord & {
    confidenceLevel: "high" | "medium" | "low"
    officialSourceUrl: string
    minimumEntryRequirements?: string
  },
  route: ApplicationRoute
): EligibilityEvaluation {
  const routeFlag = applicantPathwayFlagValue(programme, route)

  if (routeFlag === "yes") {
    return {
      status: "likely_eligible_but_verify",
      confidence: programme.confidenceLevel,
      matchedRoute: route,
      matchedClauses: [
        "This programme has an entry route matching the selected applicant pathway.",
      ],
      missingClauses: [],
      warnings: [
        "Full subject, GPA, and points rules are not evaluated until parsed requirement rules are available.",
      ],
      sourceUrl: programme.officialSourceUrl,
      rawRequirementText: programme.minimumEntryRequirements ?? "",
    }
  }

  if (routeFlag === "unknown") {
    return {
      status: "cannot_determine",
      confidence: "low",
      matchedRoute: route,
      matchedClauses: [],
      missingClauses: [],
      warnings: [
        "Available data does not clearly state whether this pathway is accepted.",
      ],
      sourceUrl: programme.officialSourceUrl,
      rawRequirementText: programme.minimumEntryRequirements ?? "",
    }
  }

  return {
    status: "interest_match_only",
    confidence: programme.confidenceLevel,
    matchedRoute: route,
    matchedClauses: [],
    missingClauses: [],
    warnings: [
      "This result matches the search, but the selected applicant pathway is not marked as accepted.",
    ],
    sourceUrl: programme.officialSourceUrl,
    rawRequirementText: programme.minimumEntryRequirements ?? "",
  }
}

export function compatibleRequirementRuleInstitutionKeys(
  left: string,
  right: string
) {
  return compatibleInstitutionIdentityKeys(left, right)
}
