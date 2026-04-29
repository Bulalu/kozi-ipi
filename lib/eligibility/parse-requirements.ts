import { normalizeSubjectList } from "./subjects"
import type {
  ApplicationRoute,
  ConfidenceLevel,
  RequirementClause,
  RequirementRuleSet,
  RequirementVariant,
} from "./types"

const PARSE_VERSION = "requirement-parser-v1"

type RouteFlags = {
  acceptsFormFourDirect: "yes" | "no" | "unknown"
  acceptsFormSix: "yes" | "no" | "unknown"
  acceptsCertificate: "yes" | "no" | "unknown"
  acceptsDiploma: "yes" | "no" | "unknown"
  acceptsEquivalent: "yes" | "no" | "unknown"
}

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
  return [
    source.acceptsFormFourDirect === "yes" ? "form_four" : undefined,
    source.acceptsFormSix === "yes" ? "form_six" : undefined,
    source.acceptsCertificate === "yes" ? "certificate" : undefined,
    source.acceptsDiploma === "yes" ? "diploma" : undefined,
    source.acceptsEquivalent === "yes" ? "equivalent" : undefined,
  ].filter((route): route is ApplicationRoute => Boolean(route))
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

  return clauses
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

  const points =
    parseNumber(source.minimumPointsIfAvailable) ??
    parseAcseePoints(source.rawRequirementText)
  if (points) {
    clauses.push({ kind: "min_acsee_points", points })
  }

  const subjects = parseSubjectList(source.requiredSubjects)
  if (subjects.length > 0 && principalPasses) {
    clauses.push({
      kind: "subject_group",
      level: "acsee",
      mode: subjects.length > principalPasses ? "at_least_n_of" : "all_of",
      count: subjects.length > principalPasses ? principalPasses : undefined,
      subjects,
      minGrade: parseMinimumAcseeGrade(source.rawRequirementText),
    })
  }

  return clauses
}

function buildPriorAwardClauses(
  source: RequirementSource,
  route: "certificate" | "diploma"
): RequirementClause[] {
  const minGpa = parseMinimumGpa(source.rawRequirementText)
  const acceptedFields = parsePriorFields(source)
  const clauses: RequirementClause[] = []

  if (minGpa || acceptedFields.length > 0 || /related field/i.test(source.rawRequirementText)) {
    clauses.push({
      kind: "prior_award",
      acceptedAwardLevels: [route],
      acceptedFields: acceptedFields.length > 0 ? acceptedFields : undefined,
      relatedFieldRequired:
        acceptedFields.length > 0 || /related field/i.test(source.rawRequirementText),
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
  const hasComplexBranching = /\bor\b|\/|foundation|equivalent|work experience|license/.test(text)
  const hasConditional = /\bif\b|without|unless|must have/.test(text)
  const hasSubjectSpecificity = /including|following subjects|from the following/.test(text)
  const hasSubjectGroupClause = clauses.some((clause) => clause.kind === "subject_group")

  if (hasConditional || hasComplexBranching) {
    return "partial"
  }
  if (hasSubjectSpecificity && !hasSubjectGroupClause) {
    return "partial"
  }
  return "structured"
}

function parseCseePassCount(text: string) {
  const normalized = text.toLowerCase()
  const match =
    normalized.match(/\bat least\s+(\d+|one|two|three|four|five|six)\s+\(?\d*\)?\s*passes/) ??
    normalized.match(/\bminimum\s+(?:pass\s+of\s+)?(\d+|one|two|three|four|five|six)\s+\(?\d*\)?\s*(?:d\s+grades|passes)/)
  return parseNumber(match?.[1])
}

function parseAcseePrincipalPasses(text: string) {
  const normalized = text.toLowerCase()
  const match =
    normalized.match(/\b(\d+|one|two|three)\s+principal passes/) ??
    normalized.match(/\bat least\s+(\d+|one|two|three)\s+principal pass/)
  return parseNumber(match?.[1])
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

function parsePriorFields(source: RequirementSource) {
  const explicitFields = parseSubjectList(source.requiredPriorFieldIfAvailable)
  if (explicitFields.length > 0) {
    return explicitFields
  }

  const match = source.rawRequirementText.match(/\bDiploma in ([^.]+?)(?: with| or|,|\.)/i)
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
  return normalizeSubjectList(
    value
      .split(/;|,|\/|\bor\b|\band\b/i)
      .map((subject) => subject.trim())
      .filter(Boolean)
  )
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

