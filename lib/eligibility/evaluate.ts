import { normalizeSubjectName } from "./subjects"
import type {
  AcseeDivision,
  AcseeGrade,
  ApplicationRoute,
  ConfidenceLevel,
  CseeDivision,
  CseeGrade,
  EligibilityEvaluation,
  EligibilityStatus,
  NormalizedStudentProfile,
  RequirementClause,
  RequirementRuleSet,
  RequirementVariant,
} from "./types"

type ClauseEvaluation = {
  passed: boolean
  matchedClauses: string[]
  missingClauses: string[]
  warnings: string[]
}

const STATUS_RANK: Record<EligibilityStatus, number> = {
  eligible: 5,
  likely_eligible_but_verify: 4,
  cannot_determine: 3,
  interest_match_only: 2,
  not_eligible: 1,
}

const DIVISION_RANK: Record<CseeDivision | AcseeDivision, number> = {
  I: 1,
  II: 2,
  III: 3,
  IV: 4,
  "0": 5,
}

const CSEE_GRADE_RANK: Record<CseeGrade, number> = {
  A: 1,
  B: 2,
  C: 3,
  D: 4,
  E: 5,
  F: 6,
}

const ACSEE_GRADE_RANK: Record<AcseeGrade, number> = {
  A: 1,
  B: 2,
  C: 3,
  D: 4,
  E: 5,
  S: 6,
  F: 7,
}

export function evaluateRequirementRuleSet(
  ruleSet: RequirementRuleSet,
  profile: NormalizedStudentProfile
): EligibilityEvaluation {
  const routeVariants = ruleSet.variants.filter(
    (variant) => variant.route === profile.applicationRoute
  )

  if (routeVariants.length === 0) {
    return baseEvaluation(ruleSet, {
      status: "interest_match_only",
      confidence: ruleSet.confidence,
      warnings: [
        `No parsed requirement variant exists for ${profile.applicationRoute}.`,
      ],
    })
  }

  return routeVariants
    .map((variant, index) =>
      evaluateRequirementVariant(ruleSet, variant, profile, index)
    )
    .sort(compareEvaluations)[0]!
}

export function evaluateRequirementVariant(
  ruleSet: RequirementRuleSet,
  variant: RequirementVariant,
  profile: NormalizedStudentProfile,
  variantIndex = 0
): EligibilityEvaluation {
  if (variant.parseStatus === "unparsed") {
    return baseEvaluation(ruleSet, {
      status: "cannot_determine",
      matchedRoute: variant.route,
      matchedVariantIndex: variantIndex,
      confidence: lowerConfidence(ruleSet.confidence),
      warnings: ["Requirement text is not structured enough to evaluate."],
    })
  }

  const clauseResults = variant.clauses.map((clause) =>
    evaluateClause(clause, profile)
  )
  const matchedClauses = clauseResults.flatMap((result) => result.matchedClauses)
  const missingClauses = clauseResults.flatMap((result) => result.missingClauses)
  const warnings = clauseResults.flatMap((result) => result.warnings)
  const allClausesPassed = clauseResults.every((result) => result.passed)

  if (allClausesPassed && variant.parseStatus === "structured") {
    return baseEvaluation(ruleSet, {
      status:
        ruleSet.confidence === "high"
          ? "eligible"
          : "likely_eligible_but_verify",
      matchedRoute: variant.route,
      matchedVariantIndex: variantIndex,
      confidence: ruleSet.confidence,
      matchedClauses,
      missingClauses,
      warnings,
    })
  }

  if (allClausesPassed && variant.parseStatus === "partial") {
    return baseEvaluation(ruleSet, {
      status: "likely_eligible_but_verify",
      matchedRoute: variant.route,
      matchedVariantIndex: variantIndex,
      confidence: lowerConfidence(ruleSet.confidence),
      matchedClauses,
      missingClauses,
      warnings: [
        ...warnings,
        "Requirement parse is partial, so the result needs verification.",
      ],
    })
  }

  return baseEvaluation(ruleSet, {
    status:
      variant.parseStatus === "structured" && ruleSet.confidence === "high"
        ? "not_eligible"
        : "cannot_determine",
    matchedRoute: variant.route,
    matchedVariantIndex: variantIndex,
    confidence:
      variant.parseStatus === "structured"
        ? ruleSet.confidence
        : lowerConfidence(ruleSet.confidence),
    matchedClauses,
    missingClauses,
    warnings,
  })
}

function evaluateClause(
  clause: RequirementClause,
  profile: NormalizedStudentProfile
): ClauseEvaluation {
  if (clause.kind === "min_csee_passes") {
    const passCount = profile.cseeSummary?.passCount
    if (passCount === undefined) {
      return missing("CSEE results are required.")
    }
    return passCount >= clause.count
      ? matched(`CSEE pass count ${passCount} meets minimum ${clause.count}.`)
      : missing(`Needs at least ${clause.count} CSEE passes; found ${passCount}.`)
  }

  if (clause.kind === "min_csee_division") {
    return evaluateDivisionClause(
      profile.cseeSummary?.division,
      clause.division,
      "CSEE"
    )
  }

  if (clause.kind === "min_acsee_division") {
    return evaluateDivisionClause(
      profile.acseeSummary?.division,
      clause.division,
      "ACSEE"
    )
  }

  if (clause.kind === "min_acsee_principal_passes") {
    const passCount = profile.acseeSummary?.principalPassCount
    if (passCount === undefined) {
      return missing("ACSEE results are required.")
    }
    return passCount >= clause.count
      ? matched(
          `ACSEE principal pass count ${passCount} meets minimum ${clause.count}.`
        )
      : missing(
          `Needs at least ${clause.count} ACSEE principal passes; found ${passCount}.`
        )
  }

  if (clause.kind === "min_acsee_points") {
    const points = profile.acseeSummary?.points
    if (points === undefined) {
      return missing("ACSEE points are required.")
    }
    return points >= clause.points
      ? matched(`ACSEE points ${points} meet minimum ${clause.points}.`)
      : missing(`Needs at least ${clause.points} ACSEE points; found ${points}.`)
  }

  if (clause.kind === "min_acsee_subsidiary_passes") {
    const passCount = profile.acseeSummary?.subsidiaryPassCount
    if (passCount === undefined) {
      return missing("ACSEE subsidiary pass count is required.")
    }
    return passCount >= clause.count
      ? matched(
          `ACSEE subsidiary pass count ${passCount} meets minimum ${clause.count}.`
        )
      : missing(
          `Needs at least ${clause.count} ACSEE subsidiary pass(es); found ${passCount}.`
        )
  }

  if (clause.kind === "acsee_subject_grade") {
    return evaluateAcseeSubjectGradeClause(clause, profile)
  }

  if (clause.kind === "subject_group") {
    return evaluateSubjectGroupClause(clause, profile)
  }

  if (clause.kind === "prior_award") {
    return evaluatePriorAwardClause(clause, profile)
  }

  return evaluateOLevelSubjectGradeClause(clause, profile)
}

function evaluateDivisionClause(
  actual: CseeDivision | AcseeDivision | undefined,
  required: CseeDivision | AcseeDivision,
  label: "CSEE" | "ACSEE"
): ClauseEvaluation {
  if (!actual) {
    return missing(`${label} division is required.`)
  }
  return DIVISION_RANK[actual] <= DIVISION_RANK[required]
    ? matched(`${label} division ${actual} meets minimum division ${required}.`)
    : missing(`${label} division ${actual} is below minimum division ${required}.`)
}

function evaluateAcseeSubjectGradeClause(
  clause: Extract<RequirementClause, { kind: "acsee_subject_grade" }>,
  profile: NormalizedStudentProfile
): ClauseEvaluation {
  const subject = normalizeSubjectName(clause.subject)
  const grade = profile.acseeSummary?.subjectGrades[subject]
  if (!grade) {
    return missing(`ACSEE ${subject} grade is required.`)
  }

  return gradeMeetsMinimum(grade, clause.minGrade, "acsee")
    ? matched(`ACSEE ${subject} grade ${grade} meets minimum ${clause.minGrade}.`)
    : missing(`ACSEE ${subject} grade ${grade} is below ${clause.minGrade}.`)
}

function evaluateSubjectGroupClause(
  clause: Extract<RequirementClause, { kind: "subject_group" }>,
  profile: NormalizedStudentProfile
): ClauseEvaluation {
  const gradeMap =
    clause.level === "csee"
      ? profile.cseeSummary?.subjectGrades
      : profile.acseeSummary?.subjectGrades

  if (!gradeMap) {
    return missing(`${clause.level.toUpperCase()} subject grades are required.`)
  }

  const subjectResults = clause.subjects.map((subject) => {
    const normalizedSubject = normalizeSubjectName(subject)
    const grade = gradeMap[normalizedSubject]
    const passed =
      grade !== undefined &&
      (!clause.minGrade ||
        gradeMeetsMinimum(grade, clause.minGrade, clause.level))

    return {
      subject: normalizedSubject,
      grade,
      passed,
    }
  })

  const passedSubjects = subjectResults.filter((result) => result.passed)
  const requiredCount =
    clause.mode === "all_of"
      ? subjectResults.length
      : clause.mode === "one_of"
        ? 1
        : (clause.count ?? subjectResults.length)

  const passed = passedSubjects.length >= requiredCount

  if (passed) {
    return matched(
      `Matched ${passedSubjects.length} of ${subjectResults.length} required ${clause.level.toUpperCase()} subjects.`
    )
  }

  const missingSubjects = subjectResults
    .filter((result) => !result.passed)
    .map((result) => result.subject)
    .join(", ")

  return missing(
    `Needs ${requiredCount} matching ${clause.level.toUpperCase()} subject(s); missing or below grade: ${missingSubjects}.`
  )
}

function evaluatePriorAwardClause(
  clause: Extract<RequirementClause, { kind: "prior_award" }>,
  profile: NormalizedStudentProfile
): ClauseEvaluation {
  const award =
    profile.applicationRoute === "certificate"
      ? profile.certificate
      : profile.applicationRoute === "diploma"
        ? profile.diploma
        : undefined

  if (!award) {
    return missing("Prior certificate or diploma details are required.")
  }

  if (clause.minGpa !== undefined && (award.gpa ?? 0) < clause.minGpa) {
    return missing(
      `Needs prior award GPA of at least ${clause.minGpa}; found ${award.gpa ?? "unknown"}.`
    )
  }

  if (clause.relatedFieldRequired && !award.field) {
    return missing("Prior award field is required for related-field matching.")
  }

  if (
    clause.acceptedFields?.length &&
    award.field &&
    !clause.acceptedFields
      .map((field) => field.toLowerCase())
      .includes(award.field.toLowerCase())
  ) {
    return missing(
      `Prior award field ${award.field} is not one of ${clause.acceptedFields.join(", ")}.`
    )
  }

  return matched("Prior award details meet the parsed requirement.")
}

function evaluateOLevelSubjectGradeClause(
  clause: Extract<RequirementClause, { kind: "o_level_subject_grade" }>,
  profile: NormalizedStudentProfile
): ClauseEvaluation {
  const subject = normalizeSubjectName(clause.subject)
  const grade = profile.cseeSummary?.subjectGrades[subject]
  if (!grade) {
    return missing(`O-Level ${subject} grade is required.`)
  }

  return gradeMeetsMinimum(grade, clause.minGrade, "csee")
    ? matched(`O-Level ${subject} grade ${grade} meets minimum ${clause.minGrade}.`)
    : missing(`O-Level ${subject} grade ${grade} is below ${clause.minGrade}.`)
}

function gradeMeetsMinimum(
  grade: CseeGrade | AcseeGrade,
  minimum: CseeGrade | AcseeGrade,
  level: "csee" | "acsee"
): boolean {
  if (level === "csee") {
    return CSEE_GRADE_RANK[grade as CseeGrade] <= CSEE_GRADE_RANK[minimum as CseeGrade]
  }
  return ACSEE_GRADE_RANK[grade as AcseeGrade] <= ACSEE_GRADE_RANK[minimum as AcseeGrade]
}

function matched(message: string): ClauseEvaluation {
  return {
    passed: true,
    matchedClauses: [message],
    missingClauses: [],
    warnings: [],
  }
}

function missing(message: string): ClauseEvaluation {
  return {
    passed: false,
    matchedClauses: [],
    missingClauses: [message],
    warnings: [],
  }
}

function baseEvaluation(
  ruleSet: RequirementRuleSet,
  overrides: {
    status: EligibilityStatus
    confidence?: ConfidenceLevel
    matchedRoute?: ApplicationRoute
    matchedVariantIndex?: number
    matchedClauses?: string[]
    missingClauses?: string[]
    warnings?: string[]
  }
): EligibilityEvaluation {
  return {
    status: overrides.status,
    confidence: overrides.confidence ?? ruleSet.confidence,
    matchedRoute: overrides.matchedRoute,
    matchedVariantIndex: overrides.matchedVariantIndex,
    matchedClauses: overrides.matchedClauses ?? [],
    missingClauses: overrides.missingClauses ?? [],
    warnings: overrides.warnings ?? [],
    sourceUrl: ruleSet.sourceUrl,
    rawRequirementText: ruleSet.rawRequirementText,
  }
}

function compareEvaluations(
  left: EligibilityEvaluation,
  right: EligibilityEvaluation
): number {
  const statusDifference = STATUS_RANK[right.status] - STATUS_RANK[left.status]
  if (statusDifference !== 0) {
    return statusDifference
  }
  return confidenceRank(right.confidence) - confidenceRank(left.confidence)
}

function confidenceRank(confidence: ConfidenceLevel): number {
  if (confidence === "high") {
    return 3
  }
  if (confidence === "medium") {
    return 2
  }
  return 1
}

function lowerConfidence(confidence: ConfidenceLevel): ConfidenceLevel {
  if (confidence === "high") {
    return "medium"
  }
  return "low"
}
