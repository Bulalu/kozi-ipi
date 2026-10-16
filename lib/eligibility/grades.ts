import { getAcseeGradePoints } from "./points"
import type { AcseeGrade, CseeGrade } from "./types"

const CSEE_PASSING_GRADES = new Set<CseeGrade>(["A", "B", "C", "D"])
const ACSEE_PRINCIPAL_GRADES = new Set<AcseeGrade>(["A", "B", "C", "D", "E"])

// General Studies and Basic Applied Mathematics are subsidiary subjects at
// A-Level. Their letter grades never count as principal passes or towards
// admission points, even when NECTA prints them as A-E.
const ACSEE_SUBSIDIARY_SUBJECTS = new Set([
  "general_studies",
  "basic_applied_mathematics",
])

// TCU and NACTVET admission points use the three best principal subjects.
const ACSEE_POINT_SUBJECT_COUNT = 3

export function isCseePass(grade: CseeGrade): boolean {
  return CSEE_PASSING_GRADES.has(grade)
}

export function countCseePasses(grades: Iterable<CseeGrade>): number {
  return Array.from(grades).filter(isCseePass).length
}

export function isAcseePrincipalPass(grade: AcseeGrade): boolean {
  return ACSEE_PRINCIPAL_GRADES.has(grade)
}

export function isAcseeSubsidiaryPass(grade: AcseeGrade): boolean {
  return grade === "S"
}

export function countAcseePrincipalPasses(
  grades: Iterable<AcseeGrade>
): number {
  return Array.from(grades).filter(isAcseePrincipalPass).length
}

export function countAcseeSubsidiaryPasses(
  grades: Iterable<AcseeGrade>
): number {
  return Array.from(grades).filter(isAcseeSubsidiaryPass).length
}

export function isAcseeSubsidiarySubject(normalizedSubject: string): boolean {
  return ACSEE_SUBSIDIARY_SUBJECTS.has(normalizedSubject)
}

export type AcseeSubjectRole =
  | "principal_pass"
  | "subsidiary_pass"
  | "fail"
  | "subsidiary_subject"

// Classifies one A-Level subject the way admission guidebooks read it.
export function classifyAcseeSubject(
  normalizedSubject: string,
  grade: AcseeGrade
): AcseeSubjectRole {
  if (isAcseeSubsidiarySubject(normalizedSubject)) return "subsidiary_subject"
  if (isAcseePrincipalPass(grade)) return "principal_pass"
  if (isAcseeSubsidiaryPass(grade)) return "subsidiary_pass"
  return "fail"
}

export type AcseeGradeSummary = {
  principalPassCount: number
  subsidiaryPassCount: number
  points: number
  pointSubjects: string[]
}

// Principal passes, subsidiary passes and admission points from normalized
// subject grades. Points are the sum of the best three principal subjects
// (A=5 ... E=1, S=0.5), so higher is better. General Studies and Basic
// Applied Mathematics are left out of all three numbers.
export function summarizeAcseeSubjectGrades(
  subjectGrades: Record<string, AcseeGrade>
): AcseeGradeSummary {
  const principalSubjects = Object.entries(subjectGrades).filter(
    ([subject]) => !isAcseeSubsidiarySubject(subject)
  )
  const grades = principalSubjects.map(([, grade]) => grade)
  const best = [...principalSubjects]
    .sort(
      ([, left], [, right]) =>
        getAcseeGradePoints(right) - getAcseeGradePoints(left)
    )
    .slice(0, ACSEE_POINT_SUBJECT_COUNT)
    .filter(([, grade]) => getAcseeGradePoints(grade) > 0)

  return {
    principalPassCount: countAcseePrincipalPasses(grades),
    subsidiaryPassCount: countAcseeSubsidiaryPasses(grades),
    points: best.reduce(
      (total, [, grade]) => total + getAcseeGradePoints(grade),
      0
    ),
    pointSubjects: best.map(([subject]) => subject),
  }
}
