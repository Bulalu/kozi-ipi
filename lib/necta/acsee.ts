import { normalizeSubjectName } from "../eligibility/subjects"
import type {
  AcseeDivision,
  AcseeGrade,
  StudentEligibilityProfile,
} from "../eligibility/types"

export const ACSEE_EXAM_TYPE = "ACSEE"
export const ACSEE_EXAM_YEAR = 2026
export const ACSEE_RESULTS_BASE_URL =
  "https://matokeo.necta.go.tz/results/2026/acsee/"

const VALID_ACSEE_GRADES = new Set<AcseeGrade>([
  "A",
  "B",
  "C",
  "D",
  "E",
  "S",
  "F",
])

const VALID_ACSEE_DIVISIONS = new Set<AcseeDivision>([
  "I",
  "II",
  "III",
  "IV",
  "0",
])

const NECTA_SUBJECT_ALIASES: Record<string, string> = {
  "A/MATHS": "Advanced Mathematics",
  "ADV/MATHS": "Advanced Mathematics",
  ACCOUNTANCY: "Accountancy",
  AGRICULTURE: "Agriculture",
  ARABIC: "Arabic",
  BAM: "Basic Applied Mathematics",
  BIOLOGY: "Biology",
  "BOOK-K": "Book Keeping",
  "BOOK/KEEP": "Book Keeping",
  CHEMISTRY: "Chemistry",
  COMMERCE: "Commerce",
  "COMP/SCI": "Computer Science",
  "COMP/SCIENCE": "Computer Science",
  "COMP/STUD": "Computer Studies",
  "COMP STUD": "Computer Studies",
  "C/SCIENCE": "Computer Science",
  DIVINITY: "Divinity",
  ECONOMICS: "Economics",
  EDUCATION: "Education",
  ENGLISH: "English Language",
  "F & HN NUTRITION": "Food and Nutrition",
  "F/NUTRITION": "Food and Nutrition",
  "FINE ART": "Fine Arts",
  FRENCH: "French",
  "G/STUDIES": "General Studies",
  GEOGR: "Geography",
  GEOGRAPHY: "Geography",
  HISTORY: "History",
  "IS/KNOWLEDGE": "Islamic Knowledge",
  KISWAHILI: "Kiswahili",
  PHYSICS: "Physics",
  "PHY EDU": "Physical Education",
  CHINESE: "Chinese",
}

const COMBINATION_CODES: Record<string, string> = {
  accountancy: "A",
  advanced_mathematics: "M",
  agriculture: "A",
  arabic: "A",
  basic_applied_mathematics: "M",
  biology: "B",
  bookkeeping: "B",
  chemistry: "C",
  commerce: "C",
  computer_science: "C",
  economics: "E",
  english: "L",
  food_and_nutrition: "N",
  french: "F",
  geography: "G",
  history: "H",
  kiswahili: "K",
  physics: "P",
}

export type AcseeParsedSubject = {
  rawSubject: string
  subject: string
  normalizedSubject: string
  grade: string
}

export function normalizeAcseeIndexNumber(value: string) {
  const compact = value.toUpperCase().replace(/[^A-Z0-9]/g, "")
  const match = compact.match(/^([A-Z]\d{4})(\d{4})$/)

  return match ? `${match[1]}${match[2]}` : compact
}

export function formatAcseeIndexNumber(value: string) {
  const normalized = normalizeAcseeIndexNumber(value)
  const match = normalized.match(/^([A-Z]\d{4})(\d{4})$/)

  return match ? `${match[1]}/${match[2]}` : value.trim().toUpperCase()
}

export function isPlausibleAcseeIndexNumber(value: string) {
  return /^[A-Z]\d{8}$/.test(normalizeAcseeIndexNumber(value))
}

export function isValidAcseeGrade(value: string): value is AcseeGrade {
  return VALID_ACSEE_GRADES.has(value.trim().toUpperCase() as AcseeGrade)
}

export function isValidAcseeDivision(value: string): value is AcseeDivision {
  return VALID_ACSEE_DIVISIONS.has(value.trim().toUpperCase() as AcseeDivision)
}

export function normalizeNectaSubjectLabel(rawSubject: string) {
  const key = rawSubject.trim().toUpperCase().replace(/\s+/g, " ")
  return NECTA_SUBJECT_ALIASES[key] ?? titleCaseSubject(key)
}

export function parseAcseeSubjectDetails(value: string): AcseeParsedSubject[] {
  const subjects: AcseeParsedSubject[] = []
  const subjectPattern = /([A-Z][A-Z0-9/&.\-\s]*?)\s*-\s*'([A-Z])'/g

  for (const match of value.matchAll(subjectPattern)) {
    const rawSubject = match[1].trim().replace(/\s+/g, " ")
    const subject = normalizeNectaSubjectLabel(rawSubject)
    subjects.push({
      rawSubject,
      subject,
      normalizedSubject: normalizeSubjectName(subject),
      grade: match[2].trim().toUpperCase(),
    })
  }

  return subjects
}

export function inferAcseeCombination(subjects: readonly AcseeParsedSubject[]) {
  const codes = subjects
    .filter((subject) => subject.normalizedSubject !== "general_studies")
    .map((subject) => COMBINATION_CODES[subject.normalizedSubject])
    .filter(Boolean)

  return codes.length > 0 ? codes.join("") : undefined
}

export function buildFormSixProfileFromAcseeResult(result: {
  division: string
  subjects: readonly Pick<AcseeParsedSubject, "grade" | "subject">[]
}): StudentEligibilityProfile | null {
  const acseeSubjects = result.subjects
    .filter((subject) => isValidAcseeGrade(subject.grade))
    .map((subject) => ({
      subject: subject.subject,
      grade: subject.grade as AcseeGrade,
    }))

  if (acseeSubjects.length < 2) {
    return null
  }

  const division = result.division.trim().toUpperCase()

  return {
    applicationRoute: "form_six",
    acsee: {
      ...(isValidAcseeDivision(division) ? { division } : {}),
      combination: inferAcseeCombination(
        result.subjects.map((subject) => ({
          rawSubject: subject.subject,
          subject: subject.subject,
          normalizedSubject: normalizeSubjectName(subject.subject),
          grade: subject.grade,
        }))
      ),
      subjects: acseeSubjects,
    },
  }
}

function titleCaseSubject(value: string) {
  return value
    .toLowerCase()
    .split(/[\s/]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}
