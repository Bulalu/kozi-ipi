import { normalizeSubjectList, normalizeSubjectName } from "./subjects"
import {
  applicantPathways,
  type ApplicantPathwayFlagField,
  type Suitability,
} from "../domain/applicant-pathways"
import type {
  AcseeGrade,
  ApplicationRoute,
  ConfidenceLevel,
  CseeGrade,
  RequirementClause,
  RequirementRuleSet,
  RequirementVariant,
} from "./types"

const PARSE_VERSION = "requirement-parser-v2"

type RouteFlags = Record<ApplicantPathwayFlagField, Suitability>

type RequirementSource = RouteFlags & {
  programmeKey: string
  institutionKey: string
  rawRequirementText: string
  sourceUrl: string
  confidence: ConfidenceLevel
  requiredSubjects?: string
  requiredSubjectGradesIfAvailable?: string
  requiredPriorFieldIfAvailable?: string
  minimumCseeDivisionIfAvailable?: string
  minimumAcseePrincipalPassesIfAvailable?: string
  minimumPointsIfAvailable?: string
}

export function parseRequirementRuleSet(
  source: RequirementSource
): RequirementRuleSet {
  return {
    programmeKey: source.programmeKey,
    institutionKey: source.institutionKey,
    rawRequirementText: source.rawRequirementText,
    sourceUrl: source.sourceUrl,
    confidence: source.confidence,
    parseVersion: PARSE_VERSION,
    variants: routesForSource(source).map((route) =>
      parseRequirementVariant(source, route)
    ),
  }
}

function parseRequirementVariant(
  source: RequirementSource,
  route: ApplicationRoute
): RequirementVariant {
  const clauses = buildClauses(source, route)
  const parseStatus = classifyParseStatus(source.rawRequirementText, clauses)

  return {
    route,
    clauses,
    parseStatus,
  }
}

function routesForSource(source: RouteFlags): ApplicationRoute[] {
  return applicantPathways
    .filter((pathway) => source[pathway.flagField] === "yes")
    .map((pathway) => pathway.route)
}

function buildClauses(
  source: RequirementSource,
  route: ApplicationRoute
): RequirementClause[] {
  if (route === "form_four") {
    return buildFormFourClauses(source)
  }
  if (route === "form_six") {
    return buildFormSixClauses(source)
  }
  if (route === "certificate" || route === "diploma") {
    return buildPriorAwardClauses(source, route)
  }
  return []
}

function buildFormFourClauses(source: RequirementSource): RequirementClause[] {
  const clauses: RequirementClause[] = []
  const passCount = parseCseePassCount(source.rawRequirementText)
  if (passCount) {
    clauses.push({ kind: "min_csee_passes", count: passCount })
  }

  return mergeClauses([
    ...clauses,
    ...parseCseeSubjectClauses(source.rawRequirementText),
  ])
}

function buildFormSixClauses(source: RequirementSource): RequirementClause[] {
  const clauses: RequirementClause[] = []
  const principalPasses =
    parseNumber(source.minimumAcseePrincipalPassesIfAvailable) ??
    parseAcseePrincipalPasses(source.rawRequirementText)
  if (principalPasses) {
    clauses.push({
      kind: "min_acsee_principal_passes",
      count: principalPasses,
    })
  }

  const subsidiaryPasses = parseAcseeSubsidiaryPasses(source.rawRequirementText)
  if (subsidiaryPasses) {
    clauses.push({
      kind: "min_acsee_subsidiary_passes",
      count: subsidiaryPasses,
    })
  }

  const points =
    parseNumber(source.minimumPointsIfAvailable) ??
    parseAcseePoints(source.rawRequirementText)
  if (points) {
    clauses.push({ kind: "min_acsee_points", points })
  }

  const subjects = parseSubjectList(source.requiredSubjects)
  const hasPerSubjectAcseeGrades =
    parseSubjectGradeClauses(source.rawRequirementText, "acsee").length > 0
  if (subjects.length > 0 && principalPasses) {
    clauses.push({
      kind: "subject_group",
      level: "acsee",
      mode: subjects.length > principalPasses ? "at_least_n_of" : "all_of",
      count: subjects.length > principalPasses ? principalPasses : undefined,
      subjects,
      minGrade: hasPerSubjectAcseeGrades
        ? undefined
        : parseMinimumAcseeGrade(source.rawRequirementText),
    })
  }

  return mergeClauses([
    ...clauses,
    ...parseAcseeSubjectClauses(source.rawRequirementText, principalPasses),
    ...parseOLevelSubjectClauses(source.rawRequirementText),
  ])
}

function buildPriorAwardClauses(
  source: RequirementSource,
  route: "certificate" | "diploma"
): RequirementClause[] {
  const minGpa = parseMinimumGpa(source.rawRequirementText)
  const acceptedFields = parsePriorFields(source)
  const clauses: RequirementClause[] = []

  if (
    minGpa ||
    acceptedFields.length > 0 ||
    /related field/i.test(source.rawRequirementText)
  ) {
    clauses.push({
      kind: "prior_award",
      acceptedAwardLevels: [route],
      acceptedFields: acceptedFields.length > 0 ? acceptedFields : undefined,
      relatedFieldRequired:
        acceptedFields.length > 0 ||
        /related field/i.test(source.rawRequirementText),
      minGpa,
    })
  }

  return clauses
}

function classifyParseStatus(
  rawRequirementText: string,
  clauses: RequirementClause[]
): "structured" | "partial" | "unparsed" {
  if (clauses.length === 0) {
    return "unparsed"
  }

  const text = rawRequirementText.toLowerCase()
  const hasComplexBranching =
    /foundation|equivalent|work experience|license/.test(text)
  const hasConditional = /\bif\b|without|unless/.test(text)
  const hasSubjectSpecificity =
    /including|following subjects|from the following/.test(text)
  const hasSubjectGroupClause = clauses.some(
    (clause) => clause.kind === "subject_group"
  )
  const hasSubjectGradeClause = clauses.some(
    (clause) =>
      clause.kind === "acsee_subject_grade" ||
      clause.kind === "o_level_subject_grade"
  )

  if (hasConditional || hasComplexBranching) {
    return "partial"
  }
  if (
    hasSubjectSpecificity &&
    !hasSubjectGroupClause &&
    !hasSubjectGradeClause
  ) {
    return "partial"
  }
  return "structured"
}

function parseCseePassCount(text: string) {
  const normalized = text.toLowerCase()
  const match =
    normalized.match(
      /\bat least\s+(\d+|one|two|three|four|five|six)\s+\(?\d*\)?\s*passes/
    ) ??
    normalized.match(
      /\bminimum\s+(?:pass\s+of\s+)?(\d+|one|two|three|four|five|six)\s+\(?\d*\)?\s*(?:d\s+grades|passes)/
    )
  return parseNumber(match?.[1])
}

function parseAcseePrincipalPasses(text: string) {
  const normalized = text.toLowerCase()
  const match =
    normalized.match(
      /\b(\d+|one|two|three)\s*(?:\(\d+\))?\s+principal(?:\s+level)?\s+passes/
    ) ??
    normalized.match(
      /\bat least\s+(\d+|one|two|three)\s*(?:\(\d+\))?\s+principal(?:\s+level)?\s+pass/
    )
  return parseNumber(match?.[1])
}

function parseAcseeSubsidiaryPasses(text: string) {
  const normalized = text.toLowerCase()
  const match =
    normalized.match(
      /\b(\d+|one|two|three)\s*(?:\(\d+\))?\s+subsidiary\s+passes/
    ) ??
    normalized.match(
      /\bat least\s+(\d+|one|two|three)\s*(?:\(\d+\))?\s+subsidiary\s+pass/
    ) ??
    normalized.match(/\bsubsidiary\s+in\b/)
  return match?.[1] ? parseNumber(match[1]) : match ? 1 : undefined
}

function parseAcseePoints(text: string) {
  const normalized = text.toLowerCase()
  const match =
    normalized.match(/\bminimum(?:\s+of)?\s+(\d+(?:\.\d+)?)\s+points/) ??
    normalized.match(/\bminimum admission points:\s*(\d+(?:\.\d+)?)/)
  return parseNumber(match?.[1])
}

function parseMinimumGpa(text: string) {
  const match = text
    .toLowerCase()
    .match(/\b(?:minimum\s+)?gpa\s+(?:of\s+)?(\d+(?:\.\d+)?)/)
  return parseNumber(match?.[1])
}

function parseMinimumAcseeGrade(text: string) {
  const match = text.match(/\b(?:minimum of |at least )?([ABCDE])\s+grade\b/i)
  return match?.[1]?.toUpperCase() as "A" | "B" | "C" | "D" | "E" | undefined
}

function parseCseeSubjectClauses(text: string): RequirementClause[] {
  const clauses: RequirementClause[] = []
  const specificGradeClauses = parseSubjectGradeClauses(text, "csee")
  clauses.push(...specificGradeClauses)

  const includingMatch = text.match(/\bincluding\s+([^.|;]+?)(?:\.|;|\|\||$)/i)
  const subjects = parseRequirementSubjects(includingMatch?.[1])
  if (subjects.length > 0) {
    clauses.push({
      kind: "subject_group",
      level: "csee",
      mode: "all_of",
      subjects,
      minGrade: "D",
    })
  }

  return clauses
}

function parseAcseeSubjectClauses(
  text: string,
  principalPasses: number | undefined
): RequirementClause[] {
  const subjectGradeClauses = parseSubjectGradeClauses(text, "acsee")
  const clauses: RequirementClause[] = [
    ...subjectGradeClauses,
    ...parseSubsidiarySubjectGroups(text),
  ]

  const requiredPlusEitherMatch = text.match(
    /\b(?:principal(?:\s+level)?\s+passes|passes)\s+in\s+(.+?)\s+and\s+either\s+(.+?)(?:\s+with\b|\s+at\b|\s+whereby\b|\.|;|\|\||$)/i
  )
  if (requiredPlusEitherMatch?.[1] && requiredPlusEitherMatch[2]) {
    const requiredSubjects = parseRequirementSubjects(
      requiredPlusEitherMatch[1]
    )
    const oneOfSubjects = parseRequirementSubjects(requiredPlusEitherMatch[2])
    if (requiredSubjects.length > 0) {
      clauses.push({
        kind: "subject_group",
        level: "acsee",
        mode: "all_of",
        subjects: requiredSubjects,
      })
    }
    if (oneOfSubjects.length > 0) {
      clauses.push({
        kind: "subject_group",
        level: "acsee",
        mode: "one_of",
        subjects: oneOfSubjects,
      })
    }
    return clauses
  }

  const followingSubjectsMatch = text.match(
    /\bprincipal(?:\s+level)?\s+passes?\s+in\s+(?:any\s+of\s+)?(?:the\s+following\s+subjects:\s*)?(.+?)(?:\s+with\b|\s+at\b|\s+whereby\b|\s+in\s+addition\b|\.|;|\|\||$)/i
  )
  const subjects = parseRequirementSubjects(followingSubjectsMatch?.[1])
  if (subjects.length > 0) {
    const count =
      principalPasses && subjects.length > principalPasses
        ? principalPasses
        : undefined
    clauses.push({
      kind: "subject_group",
      level: "acsee",
      mode: count ? "at_least_n_of" : "all_of",
      count,
      subjects,
      minGrade:
        subjectGradeClauses.length > 0
          ? undefined
          : parseMinimumAcseeGrade(text),
    })
  }

  return clauses
}

function parseSubsidiarySubjectGroups(text: string): RequirementClause[] {
  const match = text.match(
    /\bsubsidiary\s+in\s+(?:one\s+of\s+)?(?:the\s+following\s+subjects:\s*)?(.+?)(?:\.|;|\|\||$)/i
  )
  const subjects = parseRequirementSubjects(match?.[1])
  if (subjects.length === 0) {
    return []
  }

  return [
    {
      kind: "subject_group",
      level: "acsee",
      mode: subjects.length === 1 ? "all_of" : "one_of",
      subjects,
      minGrade: "S",
    },
  ]
}

function parseOLevelSubjectClauses(text: string): RequirementClause[] {
  return text
    .split(/\.|;|\|\|/)
    .filter((segment) => /o-?level|csee|ordinary level/i.test(segment))
    .flatMap((segment) => parseSubjectGradeClauses(segment, "csee"))
}

function parseSubjectGradeClauses(
  text: string,
  level: "acsee" | "csee"
): RequirementClause[] {
  const clauses: RequirementClause[] = []
  const gradePattern =
    /(?:minimum\s+of\s+|minimum\s+|at\s+least\s+)?["“”']?\s*([ABCDE])\s*["“”']?\s+grade\s+in\s+(.+?)(?=,\s*(?:and\s+)?(?:at\s+least\s+)?["“”']?\s*[ABCDE]\s*["“”']?\s+grade|\s+and\s+(?:at\s+least\s+)?["“”']?\s*[ABCDE]\s*["“”']?\s+grade|\s+or\s+(?:at\s+least\s+)?["“”']?\s*[ABCDE]\s*["“”']?\s+grade|\.|;|\|\||$)/gi

  for (const match of text.matchAll(gradePattern)) {
    const grade = match[1]?.toUpperCase()
    const subjectText = cleanGradeSubjectText(match[2] ?? "")
    if (level === "acsee" && referencesOLevel(match[2] ?? "")) {
      continue
    }
    const subjects = parseRequirementSubjects(subjectText)
    if (!grade || subjects.length === 0) {
      continue
    }

    if (/\bor\b|\//i.test(subjectText)) {
      clauses.push({
        kind: "subject_group",
        level,
        mode: "one_of",
        subjects,
        minGrade: grade as AcseeGrade | CseeGrade,
      })
      continue
    }

    for (const subject of subjects) {
      if (level === "acsee") {
        clauses.push({
          kind: "acsee_subject_grade",
          subject,
          minGrade: grade as AcseeGrade,
        })
      } else {
        clauses.push({
          kind: "o_level_subject_grade",
          subject,
          minGrade: grade as CseeGrade,
        })
      }
    }
  }

  return clauses
}

function cleanGradeSubjectText(value: string) {
  return value
    .replace(/\b(?:at|a)\s+o-?\s*level\b/gi, " ")
    .replace(/\bo-?\s*level\b/gi, " ")
    .replace(/\bordinary\s+level\b/gi, " ")
    .replace(/\bcsee\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function referencesOLevel(value: string) {
  return /\b(?:at|a)\s+o-?\s*level\b|\bo-?\s*level\b|\bordinary\s+level\b|\bcsee\b/i.test(
    value
  )
}

function parsePriorFields(source: RequirementSource) {
  const explicitFields = parseSubjectList(source.requiredPriorFieldIfAvailable)
  if (explicitFields.length > 0) {
    return explicitFields
  }

  const match = source.rawRequirementText.match(
    /\bDiploma in ([^.]+?)(?: with| or|,|\.)/i
  )
  if (!match?.[1]) {
    return []
  }
  return normalizeSubjectList(
    match[1]
      .split(/,|\/|\bor\b|\band\b/i)
      .map((field) => field.trim())
      .filter(Boolean)
  )
}

function parseSubjectList(value: string | undefined) {
  if (!value) {
    return []
  }
  return parseRequirementSubjects(value)
}

function parseRequirementSubjects(value: string | undefined) {
  if (!value) {
    return []
  }

  const cleaned = value
    .replace(/\([^)]*\)/g, " ")
    .replace(/\b(?:any\s+of\s+)?(?:the\s+)?following\s+subjects?:/gi, " ")
    .replace(/\bwith\b.*$/i, " ")
    .replace(/\bminimum\b.*$/i, " ")
    .replace(/\bwhereby\b.*$/i, " ")
    .replace(/\bin addition\b.*$/i, " ")

  return normalizeSubjectList(
    cleaned
      .split(/;|,|\/|\bor\b|\band\b/i)
      .map((subject) => subject.trim())
      .map((subject) => subject.replace(/\s+subjects?$/i, ""))
      .filter(isParseableSubjectToken)
  )
}

function isParseableSubjectToken(value: string) {
  const normalized = normalizeSubjectName(value)
  if (!normalized || normalized.length < 3) {
    return false
  }

  return ![
    "principal",
    "principals",
    "principal_subject",
    "principal_subjects",
    "following",
    "following_subjects",
    "non_religious",
    "non_religious_subjects",
    "related_field",
    "related_fields",
  ].includes(normalized)
}

function mergeClauses(clauses: RequirementClause[]) {
  const seen = new Set<string>()
  const merged: RequirementClause[] = []
  for (const clause of clauses) {
    const key = JSON.stringify(clause)
    if (!seen.has(key)) {
      seen.add(key)
      merged.push(clause)
    }
  }
  return merged
}

function parseNumber(value: string | undefined) {
  if (!value) {
    return undefined
  }

  const normalized = value.toLowerCase().trim()
  const wordNumber: Record<string, number> = {
    one: 1,
    two: 2,
    three: 3,
    four: 4,
    five: 5,
    six: 6,
  }
  if (wordNumber[normalized]) {
    return wordNumber[normalized]
  }

  const number = Number.parseFloat(normalized)
  return Number.isFinite(number) ? number : undefined
}
