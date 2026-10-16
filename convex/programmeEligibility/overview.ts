import {
  compareEligibilityEvaluations,
  describeRequirementVariant,
  eligibilityStatusRank,
  evaluateRequirementRuleSet,
  fallbackEligibilityFromApplicantPathwayFlag,
  normalizeStudentProfile,
} from "../../lib/eligibility"
import type {
  ClauseEvidence,
  EligibilityEvaluation,
  EligibilityStatus,
  NormalizedStudentProfile,
  RequirementRuleSet,
  RequirementVariant,
  StudentEligibilityProfile,
} from "../../lib/eligibility"
import type { Doc, Id } from "../_generated/dataModel"
import type { QueryCtx } from "../_generated/server"
import { formatProgrammeSearchResults } from "../programmeSearch/display"
import { getProgrammeRequirementRuleSets } from "./search"

type FormattedProgramme = ReturnType<
  typeof formatProgrammeSearchResults
>[number]

// How the status was reached: parsed rules for the student's route (fully
// or partly), a rule the parser could not read, or only the route flag.
export type EligibilityBasis =
  | "rules"
  | "partial_rules"
  | "unparsed"
  | "route_flag"

export type EligibilityStatusCounts = Record<EligibilityStatus, number>

// Full evaluation of one programme, shown on a result card.
export type ProgrammeEligibilityDetail = {
  status: EligibilityStatus
  confidence: EligibilityEvaluation["confidence"]
  basis: EligibilityBasis
  evidence: ClauseEvidence[]
  needsCsee: boolean
  // Official wording of the requirement for this route, for the disclosure.
  requirementText: string
  fit: number
}

// Compact row for the overview list. Evidence is loaded per visible card
// (see `eligibilityDetail`) so the overview stays small on a phone.
export type EligibilityOverviewRow = {
  _id: Id<"programmes">
  programmeName: string
  institutionName: string
  regulator: string
  region?: string
  duration?: string
  fieldCategory: string
  status: EligibilityStatus
  basis: EligibilityBasis
  needsCsee: boolean
  // First lines the student does not meet, for programmes they miss.
  missing: string[]
  // Within-status fit, so rows from several award levels can be merged.
  fit: number
}

export function emptyStatusCounts(): EligibilityStatusCounts {
  return {
    eligible: 0,
    likely_eligible_but_verify: 0,
    cannot_determine: 0,
    interest_match_only: 0,
    not_eligible: 0,
  }
}

// Evaluates every candidate (not just a page) so totals are real, then
// orders them by fit: status first, then how strong the match is.
export async function evaluateEligibilityOverview(
  ctx: QueryCtx,
  args: {
    programmes: Doc<"programmes">[]
    profile: StudentEligibilityProfile
  }
) {
  const normalizedProfile = normalizeStudentProfile(args.profile)
  const counts = emptyStatusCounts()
  const rows: EligibilityOverviewRow[] = []

  for (const programme of formatProgrammeSearchResults(args.programmes)) {
    const ruleSets = await getProgrammeRequirementRuleSets(ctx, programme)
    const detail = evaluateProgrammeEligibility(
      programme,
      normalizedProfile,
      ruleSets
    )
    counts[detail.status] += 1
    rows.push(toOverviewRow(programme, detail))
  }

  rows.sort(compareOverviewRows)

  return { counts, rows }
}

export function compareOverviewRows(
  left: Pick<EligibilityOverviewRow, "status" | "fit" | "programmeName">,
  right: Pick<EligibilityOverviewRow, "status" | "fit" | "programmeName">
) {
  return (
    eligibilityStatusRank(right.status) - eligibilityStatusRank(left.status) ||
    right.fit - left.fit ||
    left.programmeName.localeCompare(right.programmeName)
  )
}

export async function getProgrammeEligibilityDetail(
  ctx: QueryCtx,
  programmeDoc: Doc<"programmes">,
  profile: StudentEligibilityProfile
) {
  const [programme] = formatProgrammeSearchResults([programmeDoc])
  const ruleSets = await getProgrammeRequirementRuleSets(ctx, programme)
  return evaluateProgrammeEligibility(
    programme,
    normalizeStudentProfile(profile),
    ruleSets
  )
}

function toOverviewRow(
  programme: FormattedProgramme,
  detail: ProgrammeEligibilityDetail
): EligibilityOverviewRow {
  return {
    _id: programme._id,
    programmeName: programme.programmeName,
    institutionName: programme.institutionName,
    regulator: programme.regulator,
    region: programme.region,
    duration: programme.duration,
    fieldCategory: programme.fieldCategory,
    status: detail.status,
    basis: detail.basis,
    needsCsee: detail.needsCsee,
    missing:
      detail.status === "not_eligible"
        ? detail.evidence
            .filter((line) => line.state === "fail")
            .slice(0, 2)
            .map((line) => line.text)
        : [],
    fit: detail.fit,
  }
}

export function evaluateProgrammeEligibility(
  programme: FormattedProgramme,
  profile: NormalizedStudentProfile,
  ruleSets: RequirementRuleSet[]
): ProgrammeEligibilityDetail {
  const route = profile.applicationRoute
  const best = ruleSets
    .filter((ruleSet) =>
      ruleSet.variants.some((variant) => variant.route === route)
    )
    .map((ruleSet) => {
      const evaluation = evaluateRequirementRuleSet(ruleSet, profile)
      const variant = ruleSet.variants.filter(
        (candidate) => candidate.route === route
      )[evaluation.matchedVariantIndex ?? 0]
      return { evaluation, ruleSet, variant }
    })
    .sort((left, right) =>
      compareEligibilityEvaluations(left.evaluation, right.evaluation)
    )[0]

  if (!best || !best.variant) {
    const evaluation = fallbackEligibilityFromApplicantPathwayFlag(
      programme,
      route
    )
    return {
      status: evaluation.status,
      confidence: evaluation.confidence,
      basis: "route_flag",
      evidence: [],
      needsCsee: false,
      requirementText: programme.minimumEntryRequirements ?? "",
      fit: fitScore(evaluation, "route_flag", [], undefined, profile),
    }
  }

  const basis: EligibilityBasis =
    best.variant.parseStatus === "structured"
      ? "rules"
      : best.variant.parseStatus === "partial"
        ? "partial_rules"
        : "unparsed"
  const evidence =
    basis === "unparsed"
      ? []
      : dedupeEvidence(describeRequirementVariant(best.variant, profile))

  return {
    status: best.evaluation.status,
    confidence: best.evaluation.confidence,
    basis,
    evidence,
    needsCsee: evidence.some((line) => line.needsCsee && line.state !== "pass"),
    requirementText:
      best.ruleSet.rawRequirementText ||
      (programme.minimumEntryRequirements ?? ""),
    fit: fitScore(best.evaluation, basis, evidence, best.variant, profile),
  }
}

// The parser can emit the same subject rule twice (from the subject list and
// from the sentence). Students should see each line once.
function dedupeEvidence(evidence: ClauseEvidence[]) {
  const seen = new Set<string>()
  return evidence.filter((line) => {
    if (seen.has(line.text)) return false
    seen.add(line.text)
    return true
  })
}

// Higher is a better fit within the same status. Parsed rules beat route
// flags, high confidence beats medium, and a wider margin over the minimum
// points or principal passes beats a narrow one. For programmes the student
// does not meet, fewer failed lines means closer.
function fitScore(
  evaluation: EligibilityEvaluation,
  basis: EligibilityBasis,
  evidence: ClauseEvidence[],
  variant: RequirementVariant | undefined,
  profile: NormalizedStudentProfile
) {
  const basisRank = { rules: 4, partial_rules: 3, unparsed: 2, route_flag: 1 }[
    basis
  ]
  const confidenceRank = { high: 3, medium: 2, low: 1 }[evaluation.confidence]
  const failed = evidence.filter((line) => line.state === "fail").length
  const unknown = evidence.filter((line) => line.state === "unknown").length

  return (
    basisRank * 1000 +
    confidenceRank * 100 +
    Math.min(margin(variant, profile), 20) * 4 -
    failed * 10 -
    unknown * 2
  )
}

function margin(
  variant: RequirementVariant | undefined,
  profile: NormalizedStudentProfile
) {
  const summary = profile.acseeSummary
  if (!variant || !summary) return 0

  let best = 0
  for (const clause of variant.clauses) {
    if (clause.kind === "min_acsee_points") {
      best = Math.max(best, summary.points - clause.points)
    }
    if (clause.kind === "min_acsee_principal_passes") {
      best = Math.max(best, summary.principalPassCount - clause.count)
    }
  }
  return Math.max(best, 0)
}
