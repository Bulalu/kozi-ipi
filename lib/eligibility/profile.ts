import { countCseePasses, summarizeAcseeSubjectGrades } from "./grades"
import {
  normalizeSubjectGradeEntries,
  normalizeSubjectList,
} from "./subjects"
import type { NormalizedStudentProfile, StudentEligibilityProfile } from "./types"

export function normalizeStudentProfile(
  profile: StudentEligibilityProfile
): NormalizedStudentProfile {
  const cseeSubjectGrades = profile.csee
    ? normalizeSubjectGradeEntries(profile.csee.subjects)
    : undefined
  const acseeSubjectGrades = profile.acsee
    ? normalizeSubjectGradeEntries(profile.acsee.subjects)
    : undefined

  const normalizedSubjects = normalizeSubjectList([
    ...Object.keys(cseeSubjectGrades ?? {}),
    ...Object.keys(acseeSubjectGrades ?? {}),
  ])

  const acseeGradeSummary = acseeSubjectGrades
    ? summarizeAcseeSubjectGrades(acseeSubjectGrades)
    : undefined

  return {
    ...profile,
    cseeSummary: cseeSubjectGrades
      ? {
          division: profile.csee?.division,
          passCount: countCseePasses(Object.values(cseeSubjectGrades)),
          subjectGrades: cseeSubjectGrades,
        }
      : undefined,
    acseeSummary:
      acseeSubjectGrades && acseeGradeSummary
        ? {
            division: profile.acsee?.division,
            principalPassCount: acseeGradeSummary.principalPassCount,
            subsidiaryPassCount: acseeGradeSummary.subsidiaryPassCount,
            points: acseeGradeSummary.points,
            subjectGrades: acseeSubjectGrades,
          }
        : undefined,
    normalizedSubjects,
  }
}

