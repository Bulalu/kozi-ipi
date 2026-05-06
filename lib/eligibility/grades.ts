import type { AcseeGrade, CseeGrade } from "./types"

const CSEE_PASSING_GRADES = new Set<CseeGrade>(["A", "B", "C", "D"])
const ACSEE_PRINCIPAL_GRADES = new Set<AcseeGrade>(["A", "B", "C", "D", "E"])

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

export function countAcseePrincipalPasses(grades: Iterable<AcseeGrade>): number {
  return Array.from(grades).filter(isAcseePrincipalPass).length
}

export function countAcseeSubsidiaryPasses(grades: Iterable<AcseeGrade>): number {
  return Array.from(grades).filter(isAcseeSubsidiaryPass).length
}

