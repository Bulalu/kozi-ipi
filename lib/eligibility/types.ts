import type { ApplicationRoute } from "../domain/applicant-pathways"

export type { ApplicationRoute }

export type CseeDivision = "I" | "II" | "III" | "IV" | "0"
export type AcseeDivision = "I" | "II" | "III" | "IV" | "0"
export type CseeGrade = "A" | "B" | "C" | "D" | "E" | "F"
export type AcseeGrade = "A" | "B" | "C" | "D" | "E" | "S" | "F"
export type ConfidenceLevel = "high" | "medium" | "low"
export type ParseStatus = "structured" | "partial" | "unparsed"

export type StudentEligibilityProfile = {
  applicationRoute: ApplicationRoute
  csee?: {
    division?: CseeDivision
    subjects: Array<{
      subject: string
      grade: CseeGrade
    }>
  }
  acsee?: {
    division?: AcseeDivision
    combination?: string
    subjects: Array<{
      subject: string
      grade: AcseeGrade
    }>
  }
  certificate?: {
    awardName: string
    field?: string
    ntaLevel?: string
    gpa?: number
  }
  diploma?: {
    awardName: string
    field?: string
    ntaLevel?: string
    gpa?: number
  }
  equivalent?: {
    description: string
  }
  preferences?: {
    query?: string
    fieldCategory?: string
    region?: string
    awardLevel?: string
  }
}

export type NormalizedStudentProfile = StudentEligibilityProfile & {
  cseeSummary?: {
    division?: CseeDivision
    passCount: number
    subjectGrades: Record<string, CseeGrade>
  }
  acseeSummary?: {
    division?: AcseeDivision
    principalPassCount: number
    subsidiaryPassCount: number
    points: number
    subjectGrades: Record<string, AcseeGrade>
  }
  normalizedSubjects: string[]
}

export type RequirementRuleSet = {
  programmeKey: string
  institutionKey: string
  variants: RequirementVariant[]
  rawRequirementText: string
  sourceUrl: string
  confidence: ConfidenceLevel
  parseVersion: string
}

export type RequirementVariant = {
  route: ApplicationRoute
  clauses: RequirementClause[]
  parseStatus: ParseStatus
}

export type RequirementClause =
  | { kind: "min_csee_passes"; count: number }
  | { kind: "min_csee_division"; division: CseeDivision }
  | { kind: "min_acsee_division"; division: AcseeDivision }
  | { kind: "min_acsee_principal_passes"; count: number }
  | { kind: "min_acsee_subsidiary_passes"; count: number }
  | { kind: "min_acsee_points"; points: number }
  | {
      kind: "acsee_subject_grade"
      subject: string
      minGrade: AcseeGrade
    }
  | {
      kind: "subject_group"
      level: "csee" | "acsee"
      mode: "all_of" | "one_of" | "at_least_n_of"
      count?: number
      subjects: string[]
      minGrade?: CseeGrade | AcseeGrade
    }
  | {
      kind: "prior_award"
      acceptedAwardLevels?: string[]
      acceptedFields?: string[]
      relatedFieldRequired?: boolean
      minGpa?: number
    }
  | {
      kind: "o_level_subject_grade"
      subject: string
      minGrade: CseeGrade
    }

export type EligibilityStatus =
  | "eligible"
  | "likely_eligible_but_verify"
  | "interest_match_only"
  | "not_eligible"
  | "cannot_determine"

export type EligibilityEvaluation = {
  status: EligibilityStatus
  matchedRoute?: ApplicationRoute
  matchedVariantIndex?: number
  confidence: ConfidenceLevel
  matchedClauses: string[]
  missingClauses: string[]
  warnings: string[]
  sourceUrl: string
  rawRequirementText: string
}
