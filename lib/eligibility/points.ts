import type { AcseeGrade } from "./types"

const ACSEE_POINTS: Record<AcseeGrade, number> = {
  A: 5,
  B: 4,
  C: 3,
  D: 2,
  E: 1,
  S: 0.5,
  F: 0,
}

export function getAcseeGradePoints(grade: AcseeGrade): number {
  return ACSEE_POINTS[grade]
}

export function calculateAcseePoints(grades: Iterable<AcseeGrade>): number {
  return Array.from(grades).reduce(
    (total, grade) => total + getAcseeGradePoints(grade),
    0
  )
}

