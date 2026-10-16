// Turns the clauses of one requirement variant into short, student-facing
// lines checked against the student's own results. Swahili first, with the
// English admission terms students see on their result slip and guidebooks.

import {
  assessSubjectGroup,
  clauseContextForVariant,
  evaluateRequirementClause,
  subsidiaryOrBetterPassCount,
  type ClauseContext,
} from "./evaluate"
import {
  normalizeSubjectName,
  resolveAcseeRequirementSubjects,
} from "./subjects"
import type {
  AcseeGrade,
  NormalizedStudentProfile,
  RequirementClause,
  RequirementVariant,
} from "./types"

export type ClauseEvidenceState = "pass" | "fail" | "unknown"

export type ClauseEvidence = {
  state: ClauseEvidenceState
  text: string
  // The line can only be checked with Form Four (CSEE / O-Level) results.
  needsCsee?: boolean
}

const SUBJECT_LABELS: Record<string, string> = {
  advanced_mathematics: "Advanced Mathematics",
  basic_applied_mathematics: "Basic Applied Mathematics",
  computer_science: "Computer Science",
  english: "English",
  fine_arts: "Fine Arts",
  general_studies: "General Studies",
  mathematics: "Mathematics",
  nutrition: "Nutrition",
  engineering_science: "Engineering Science",
}

const LIST_PREVIEW = 5

export function acseeSubjectLabel(subject: string) {
  const key = normalizeSubjectName(subject)
  return (
    SUBJECT_LABELS[key] ??
    key
      .split("_")
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ")
  )
}

export function describeRequirementVariant(
  variant: RequirementVariant,
  profile: NormalizedStudentProfile
): ClauseEvidence[] {
  const context = clauseContextForVariant(variant)
  return variant.clauses.flatMap((clause) =>
    describeClause(clause, profile, context)
  )
}

function describeClause(
  clause: RequirementClause,
  profile: NormalizedStudentProfile,
  context: ClauseContext
): ClauseEvidence[] {
  const result = evaluateRequirementClause(clause, profile, context)
  const state: ClauseEvidenceState = result.passed
    ? "pass"
    : result.unknown
      ? "unknown"
      : "fail"
  const acsee = profile.acseeSummary

  switch (clause.kind) {
    case "min_acsee_principal_passes": {
      const have = acsee?.principalPassCount ?? 0
      return [
        {
          state,
          text: result.passed
            ? `Principal passes ${have} (zinahitajika ${clause.count})`
            : `Inahitaji principal passes ${clause.count} — una ${have}`,
        },
      ]
    }
    case "min_acsee_subsidiary_passes": {
      const have = subsidiaryOrBetterPassCount(profile, context) ?? 0
      const coveredByPrincipal =
        result.passed && (acsee?.subsidiaryPassCount ?? 0) < clause.count
      return [
        {
          state,
          text: coveredByPrincipal
            ? `Subsidiary pass ${clause.count} — principal pass yako ya ziada inatosha`
            : result.passed
              ? `Subsidiary pass ${have} (inahitajika ${clause.count})`
              : `Inahitaji subsidiary pass ${clause.count} (S au zaidi katika somo kuu) — una ${have}`,
        },
      ]
    }
    case "min_acsee_points": {
      const have = acsee?.points ?? 0
      return [
        {
          state,
          text: result.passed
            ? `Pointi ${formatPoints(have)} (kiwango cha chini ${formatPoints(clause.points)})`
            : `Inahitaji pointi ${formatPoints(clause.points)} — una ${formatPoints(have)}`,
        },
      ]
    }
    case "min_acsee_division": {
      const have = acsee?.division
      return [
        {
          state,
          text: have
            ? result.passed
              ? `Division ${have} (inahitajika ${clause.division} au bora zaidi)`
              : `Inahitaji Division ${clause.division} au bora zaidi — una ${have}`
            : `Inahitaji Division ${clause.division} au bora zaidi`,
        },
      ]
    }
    case "acsee_subject_grade": {
      const [key] = resolveAcseeRequirementSubjects([clause.subject]).subjects
      if (!key) {
        return [
          {
            state: "unknown",
            text: "Somo moja la sharti halikusomeka — soma sharti rasmi",
          },
        ]
      }
      const subject = acseeSubjectLabel(key)
      const grade = acsee?.subjectGrades[key]
      return [
        {
          state,
          text: result.passed
            ? `${subject} ${grade} (angalau ${clause.minGrade})`
            : grade
              ? `${subject} ${grade} — inahitaji angalau ${clause.minGrade}`
              : `Inahitaji ${subject} (angalau ${clause.minGrade})`,
        },
      ]
    }
    case "subject_group":
      return clause.level === "acsee"
        ? describeAcseeSubjectGroup(clause, profile)
        : [
            {
              state,
              needsCsee: true,
              text: `Form Four: ${groupSummary(clause)}`,
            },
          ]
    case "o_level_subject_grade":
      return [
        {
          state,
          needsCsee: true,
          text: `Form Four: ${acseeSubjectLabel(clause.subject)} angalau ${clause.minGrade} (O-Level)`,
        },
      ]
    case "min_csee_passes":
      return [
        {
          state,
          needsCsee: true,
          text: `Form Four: angalau pass ${clause.count} za CSEE`,
        },
      ]
    case "min_csee_division":
      return [
        {
          state,
          needsCsee: true,
          text: `Form Four: Division ${clause.division} au bora zaidi`,
        },
      ]
    case "prior_award":
      return [
        {
          state,
          text: "Inahitaji cheti au diploma ya awali inayohusiana",
        },
      ]
  }
}

function describeAcseeSubjectGroup(
  clause: Extract<RequirementClause, { kind: "subject_group" }>,
  profile: NormalizedStudentProfile
): ClauseEvidence[] {
  const assessment = assessSubjectGroup(
    clause,
    profile.acseeSummary?.subjectGrades ?? {}
  )
  const requirement = gradeRequirementLabel(assessment.minGrade as AcseeGrade)
  const subjects = assessment.subjects.map((subject) => ({
    ...subject,
    label: acseeSubjectLabel(subject.subject),
  }))
  const unreadable: ClauseEvidence[] =
    assessment.unresolved.length > 0 && assessment.outcome !== "pass"
      ? [
          {
            state: "unknown",
            text: "Sehemu ya orodha ya masomo haikusomeka — soma sharti rasmi",
          },
        ]
      : []

  if (clause.mode === "all_of") {
    return [
      ...subjects.map(
        (subject): ClauseEvidence => ({
          state: subject.passed ? "pass" : "fail",
          text: subject.passed
            ? `${subject.label} ${subject.grade} (${requirement})`
            : subject.grade
              ? `${subject.label} ${subject.grade} — inahitaji ${requirement}`
              : `Inahitaji ${subject.label} (${requirement})`,
        })
      ),
      ...unreadable,
    ]
  }

  const needed = assessment.requiredCount
  // Best grades first, so the same subjects always read the same way.
  const matched = subjects
    .filter((subject) => subject.passed)
    .sort(
      (left, right) =>
        (left.grade ?? "").localeCompare(right.grade ?? "") ||
        left.label.localeCompare(right.label)
    )
  const matchedText = matched
    .map((subject) => `${subject.label} ${subject.grade}`)
    .join(", ")
  const options = previewList(subjects.map((subject) => subject.label))

  if (assessment.outcome === "pass") {
    return [
      {
        state: "pass",
        text:
          needed === 1
            ? `${matchedText} — moja kati ya masomo yanayokubalika`
            : `${matchedText} — ${needed} kati ya masomo yanayokubalika`,
      },
    ]
  }

  if (assessment.outcome === "unknown") {
    return [
      {
        state: "unknown",
        text: `Inahitaji ${needed} kati ya masomo yaliyoorodheshwa; una ${matched.length} tunayoweza kukagua${matchedText ? ` (${matchedText})` : ""} — sehemu ya orodha haikusomeka`,
      },
    ]
  }

  return [
    {
      state: "fail",
      text:
        needed === 1
          ? `Inahitaji moja kati ya: ${options} (${requirement})`
          : `Inahitaji ${needed} kati ya: ${options} (${requirement}) — una ${matched.length}`,
    },
  ]
}

function groupSummary(
  clause: Extract<RequirementClause, { kind: "subject_group" }>
) {
  const subjects = previewList(clause.subjects.map(acseeSubjectLabel))
  const grade = clause.minGrade ? ` angalau ${clause.minGrade}` : ""
  if (clause.mode === "all_of") return `${subjects}${grade}`
  if (clause.mode === "one_of") return `moja kati ya ${subjects}${grade}`
  return `${clause.count ?? 1} kati ya ${subjects}${grade}`
}

function gradeRequirementLabel(minGrade: AcseeGrade) {
  if (minGrade === "E") return "principal pass"
  if (minGrade === "S") return "angalau subsidiary"
  return `angalau ${minGrade}`
}

function previewList(items: string[]) {
  if (items.length <= LIST_PREVIEW) return items.join(", ")
  return `${items.slice(0, LIST_PREVIEW).join(", ")} na ${items.length - LIST_PREVIEW} mengine`
}

function formatPoints(points: number) {
  return Number.isInteger(points) ? String(points) : points.toFixed(1)
}
