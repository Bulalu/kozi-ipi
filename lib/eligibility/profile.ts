import {
  countAcseePrincipalPasses,
  countAcseeSubsidiaryPasses,
  countCseePasses,
} from "./grades"
import { calculateAcseePoints } from "./points"
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

  return {
    ...profile,
    cseeSummary: cseeSubjectGrades
      ? {
          division: profile.csee?.division,
          passCount: countCseePasses(Object.values(cseeSubjectGrades)),
          subjectGrades: cseeSubjectGrades,
        }
      : undefined,
    acseeSummary: acseeSubjectGrades
      ? {
          division: profile.acsee?.division,
          principalPassCount: countAcseePrincipalPasses(
            Object.values(acseeSubjectGrades)
          ),
          subsidiaryPassCount: countAcseeSubsidiaryPasses(
            Object.values(acseeSubjectGrades)
          ),
          points: calculateAcseePoints(Object.values(acseeSubjectGrades)),
          subjectGrades: acseeSubjectGrades,
        }
      : undefined,
    normalizedSubjects,
  }
}

