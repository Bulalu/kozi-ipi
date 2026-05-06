import {
  evaluateRequirementRuleSet,
  compareEligibilityEvaluations,
  compatibleRequirementRuleInstitutionKeys,
  countEligibilityBuckets,
  fallbackEligibilityFromApplicantPathwayFlag,
  normalizeStudentProfile,
} from "../../lib/eligibility"
import type {
  EligibilityEvaluation,
  RequirementRuleSet,
  StudentEligibilityProfile,
} from "../../lib/eligibility"
import type { Doc } from "../_generated/dataModel"
import type { QueryCtx } from "../_generated/server"
import { formatProgrammeSearchResults } from "../programmeSearch/display"

type EligibilityProfile = Pick<StudentEligibilityProfile, "applicationRoute">
type FormattedProgramme = ReturnType<
  typeof formatProgrammeSearchResults
>[number]

export async function evaluateEligibilityPage(
  ctx: QueryCtx,
  args: {
    programmes: Doc<"programmes">[]
    profile: StudentEligibilityProfile
  }
) {
  const normalizedProfile = normalizeStudentProfile(args.profile)
  const formattedProgrammes = formatProgrammeSearchResults(args.programmes)
  const page = []

  for (const programme of formattedProgrammes) {
    const ruleSets = await getProgrammeRequirementRuleSets(ctx, programme)
    page.push({
      ...programme,
      eligibility: getProgrammeEligibility(
        programme,
        args.profile,
        normalizedProfile,
        ruleSets
      ),
    })
  }

  return {
    page,
    buckets: countEligibilityBuckets(
      page.map((programme) => programme.eligibility)
    ),
  }
}

async function getProgrammeRequirementRuleSets(
  ctx: QueryCtx,
  programme: Pick<
    Doc<"programmes">,
    "normalizedProgrammeName" | "normalizedInstitutionName"
  >
): Promise<RequirementRuleSet[]> {
  const ruleDocs = await ctx.db
    .query("requirementRules")
    .withIndex(
      "by_normalizedProgrammeName_and_normalizedInstitutionName",
      (q) =>
        q
          .eq("normalizedProgrammeName", programme.normalizedProgrammeName)
          .eq("normalizedInstitutionName", programme.normalizedInstitutionName)
    )
    .take(20)

  if (ruleDocs.length > 0) {
    return ruleDocs.map(toRequirementRuleSet)
  }

  const programmeRuleDocs = await ctx.db
    .query("requirementRules")
    .withIndex("by_normalizedProgrammeName", (q) =>
      q.eq("normalizedProgrammeName", programme.normalizedProgrammeName)
    )
    .take(50)

  return programmeRuleDocs
    .filter((ruleDoc) =>
      compatibleRequirementRuleInstitutionKeys(
        ruleDoc.normalizedInstitutionName,
        programme.normalizedInstitutionName
      )
    )
    .map(toRequirementRuleSet)
}

function toRequirementRuleSet(
  ruleDoc: Doc<"requirementRules">
): RequirementRuleSet {
  return {
    programmeKey: ruleDoc.programmeKey,
    institutionKey: ruleDoc.institutionKey,
    variants: ruleDoc.variants as RequirementRuleSet["variants"],
    rawRequirementText: ruleDoc.rawRequirementText,
    sourceUrl: ruleDoc.sourceUrl,
    confidence: ruleDoc.confidence,
    parseVersion: ruleDoc.parseVersion,
  }
}

function getProgrammeEligibility(
  programme: FormattedProgramme,
  profile: EligibilityProfile,
  normalizedProfile: ReturnType<typeof normalizeStudentProfile>,
  ruleSets: RequirementRuleSet[]
): EligibilityEvaluation {
  const routeMatchingRuleSets = ruleSets.filter((ruleSet) =>
    ruleSet.variants.some(
      (variant) => variant.route === profile.applicationRoute
    )
  )

  if (routeMatchingRuleSets.length === 0) {
    return fallbackEligibilityFromApplicantPathwayFlag(
      programme,
      profile.applicationRoute
    )
  }

  return routeMatchingRuleSets
    .map((ruleSet) => evaluateRequirementRuleSet(ruleSet, normalizedProfile))
    .sort(compareEligibilityEvaluations)[0]!
}
