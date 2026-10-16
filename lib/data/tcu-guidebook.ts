import {
  institutionNameCandidates,
  normalizeIdentityName,
} from "../domain/institution-identity"
import { programmeNameContainsRequirementLeak } from "../domain/programme-offering-identity"
import { textContainsTcuProgrammeCode } from "../domain/tcu-programme-code"

// Helpers for the TCU Bachelor's degree layer, which is keyed by the
// programme codes printed in the TCU admission guidebook.

export type GuidebookHeading = {
  heading: string
  baseName: string
  abbreviation?: string
  location?: string
}

export type InstitutionIdentityRecord = {
  institutionName: string
  normalizedInstitutionName: string
  regulator: string
}

export type GuidebookInstitutionResolution<
  T extends InstitutionIdentityRecord,
> = {
  heading: GuidebookHeading
  isBranch: boolean
  institution?: T
  score: number
}

const genericNameTokens = new Set([
  "the",
  "of",
  "and",
  "in",
  "for",
  "university",
  "college",
  "institute",
  "academy",
  "centre",
  "center",
  "school",
  "tanzania",
  "campus",
])

const branchLocationNoise = /\b(campus|centre|center|college|main)\b/gi

export function parseGuidebookHeading(heading: string): GuidebookHeading {
  const text = heading.replace(/\s+/g, " ").trim()
  const parenthetical = text.match(/\(([^)]+)\)/)

  if (parenthetical) {
    const before = text.slice(0, parenthetical.index).trim()
    const after = text
      .slice((parenthetical.index ?? 0) + parenthetical[0].length)
      .replace(/^[\s,–-]+/, "")
      .trim()
    return {
      heading: text,
      baseName: before,
      abbreviation: parenthetical[1].trim(),
      location: after || undefined,
    }
  }

  const comma = text.lastIndexOf(",")
  if (comma > 0) {
    return {
      heading: text,
      baseName: text.slice(0, comma).trim(),
      location: text.slice(comma + 1).trim() || undefined,
    }
  }

  return { heading: text, baseName: text }
}

function significantTokens(value: string | undefined) {
  return new Set(
    normalizeIdentityName(value)
      .split(" ")
      .filter((token) => token.length > 1 && !genericNameTokens.has(token))
  )
}

// "Kisangara Campus, Kilimanjaro" -> ["kisangara"]; "Dar es Salaam Campus"
// -> ["dar", "es", "salaam"].
function locationTokens(location: string | undefined) {
  const primary = (location ?? "").split(",")[0] ?? ""
  return normalizeIdentityName(primary.replace(branchLocationNoise, " "))
    .split(" ")
    .filter(Boolean)
}

export function institutionHasBranchMarker(name: string) {
  return (
    /\bcampus\b/i.test(name) ||
    /\s[-–]\s?\S/.test(name.replace(/\([^)]*\)/g, "")) ||
    /\)\s*[-–]/.test(name) ||
    /\)\s+\w+(\s+\w+)?\s+cent(re|er)\b/i.test(name) ||
    /\bcampus college\b/i.test(name)
  )
}

function nameWithoutParenthetical(name: string) {
  return name.replace(/\([^)]*\)/g, " ")
}

// Checks the branch location against the part of the candidate's name that
// is not the shared base name ("Mbeya University ..." must not make every
// MUST campus look like the Mbeya one).
function nameMatchesLocation(
  name: string,
  location: string | undefined,
  baseName: string
) {
  const tokens = locationTokens(location)
  if (tokens.length === 0) return false
  const baseTokens = new Set(normalizeIdentityName(baseName).split(" "))
  const remainder = normalizeIdentityName(nameWithoutParenthetical(name))
    .split(" ")
    .filter((token) => !baseTokens.has(token))
  const normalized = ` ${remainder.join(" ")} `
  return tokens.every((token) => normalized.includes(` ${token} `))
}

function stripLeadingArticle(name: string) {
  return name.replace(/^\s*the\s+/i, "")
}

function headingGroupKey(heading: GuidebookHeading) {
  return normalizeIdentityName(heading.baseName)
}

function scoreCandidate<T extends InstitutionIdentityRecord>(
  heading: GuidebookHeading,
  candidate: T
) {
  const headingCandidates = new Set(
    institutionNameCandidates(heading.baseName).concat(
      institutionNameCandidates(
        `${heading.baseName} (${heading.abbreviation ?? ""})`
      )
    )
  )
  const candidateFull = stripLeadingArticle(
    nameWithoutParenthetical(candidate.institutionName)
  ).trim()
  const candidateBase = candidateFull.replace(/\s[-–].*$/, "").trim()
  const baseMatch = [
    ...institutionNameCandidates(candidateBase),
    ...institutionNameCandidates(candidateFull),
  ].some((name) => headingCandidates.has(name))
  const abbreviation = normalizeIdentityName(heading.abbreviation)
  const candidateTokens = ` ${normalizeIdentityName(candidate.institutionName)} `
  const abbreviationMatch =
    abbreviation.length >= 2 && candidateTokens.includes(` ${abbreviation} `)
  const headingTokens = significantTokens(heading.baseName)
  const overlap = [...significantTokens(candidateBase)].filter((token) =>
    headingTokens.has(token)
  ).length
  const overlapRatio = headingTokens.size > 0 ? overlap / headingTokens.size : 0

  if (!baseMatch && !(abbreviationMatch && overlapRatio >= 0.5)) {
    return 0
  }

  return (
    (baseMatch ? 10 : 0) +
    (abbreviationMatch ? 6 : 0) +
    overlapRatio * 4 +
    (candidate.regulator === "TCU" ? 2 : 0)
  )
}

// Maps each guidebook institution heading to an existing processed
// institution. The first heading of a group sharing the same base name is the
// main campus; later headings are branches and only map to an institution
// whose name carries the branch location. Unresolved headings are returned
// without an institution so the caller can create a campus record.
export function resolveGuidebookInstitutions<
  T extends InstitutionIdentityRecord,
>(headings: string[], institutions: T[]) {
  const results = new Map<string, GuidebookInstitutionResolution<T>>()
  const groupsSeen = new Set<string>()
  const claimed = new Set<string>()

  for (const rawHeading of headings) {
    if (results.has(rawHeading)) continue
    const heading = parseGuidebookHeading(rawHeading)
    const groupKey = headingGroupKey(heading)
    const isBranch = groupsSeen.has(groupKey)
    groupsSeen.add(groupKey)
    // Headings such as "SUA - Mizengo Pinda Campus College" name a campus
    // college as its own admission unit.
    const headingIsCampus = institutionHasBranchMarker(heading.heading)

    const scored = institutions
      .map((candidate) => ({
        candidate,
        score: scoreCandidate(heading, candidate),
      }))
      .filter(({ candidate, score }) => {
        if (score <= 0) return false
        if (claimed.has(candidate.normalizedInstitutionName)) return false
        const branchName = institutionHasBranchMarker(candidate.institutionName)
        if (isBranch) {
          return nameMatchesLocation(
            candidate.institutionName,
            heading.location,
            heading.baseName
          )
        }
        return (
          !branchName ||
          headingIsCampus ||
          nameMatchesLocation(
            candidate.institutionName,
            heading.location,
            heading.baseName
          )
        )
      })
      .map(({ candidate, score }) => ({
        candidate,
        score:
          score +
          (isBranch || institutionHasBranchMarker(candidate.institutionName)
            ? 0
            : 3),
      }))
      .sort(
        (a, b) =>
          b.score - a.score ||
          a.candidate.institutionName.localeCompare(b.candidate.institutionName)
      )

    const best = scored[0]
    if (best) claimed.add(best.candidate.normalizedInstitutionName)
    results.set(rawHeading, {
      heading,
      isBranch,
      institution: best?.candidate,
      score: best?.score ?? 0,
    })
  }

  return results
}

// Institution names that are really fragments of guidebook prose, e.g.
// "Open University of Tanzania (OUT) are advised not to apply".
export function isProseInstitutionName(name: string | undefined) {
  const text = (name ?? "").trim()
  if (!text) return true
  if (/^[a-z]/.test(text)) return true
  return /\b(are advised|advised not|not to apply|shall be|responsibility of|applicants?\s+(must|should|are)|qualifications$)\b/i.test(
    text
  )
}

export function looksLikeDegreeTitle(name: string | undefined) {
  return /^(Bachelor|Doctor|Shahada)\b/i.test((name ?? "").trim())
}

// Reasons a programme title is not clean enough to show as a title.
export function programmeTitleQualityIssues(name: string | undefined) {
  const text = (name ?? "").replace(/\s+/g, " ").trim()
  const issues: string[] = []
  if (textContainsTcuProgrammeCode(text)) issues.push("contains_programme_code")
  if (
    programmeNameContainsRequirementLeak(text) ||
    /\b(principal passes?|subsidiary pass|subjects?:|O[-‘’' ]?Level|A[-‘’' ]?Level|minimum of|an applicant)\b/i.test(
      text
    )
  ) {
    issues.push("contains_requirement_prose")
  }
  if (/[’'"“”]\s*$/.test(text) || /\s[,.;:]\s*$/.test(text)) {
    issues.push("dangling_punctuation")
  }
  if (/\b(in|of|and|with)$/i.test(text)) issues.push("ends_with_connector")
  return issues
}

// Rejoins words that PDF text extraction split without a hyphen
// ("Telecommunicati on", "Environment al"): two adjacent tokens are joined
// when the joined word is known and one fragment is not a known word.
export function createSplitWordRepairer(corpus: Iterable<string>) {
  const vocabulary = new Map<string, number>()
  for (const text of corpus) {
    for (const token of text.match(/[A-Za-z]+/g) ?? []) {
      const key = token.toLowerCase()
      vocabulary.set(key, (vocabulary.get(key) ?? 0) + 1)
    }
  }

  return (value: string) =>
    value.replace(
      /\b([A-Za-z]{2,})\s([a-z]{1,})\b/g,
      (match, left: string, right: string) => {
        const joined = `${left}${right}`.toLowerCase()
        const leftCount = vocabulary.get(left.toLowerCase()) ?? 0
        const rightCount = vocabulary.get(right.toLowerCase()) ?? 0
        if (
          (vocabulary.get(joined) ?? 0) >= 2 &&
          Math.min(leftCount, rightCount) <= 2
        ) {
          return `${left}${right}`
        }
        return match
      }
    )
}
