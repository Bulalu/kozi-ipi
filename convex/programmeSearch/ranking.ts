import { programmeNameFingerprint } from "../../lib/domain/programme-offering-identity"
import { isNursingIntentText } from "../../lib/domain/search-vocabulary"

export type RankableProgramme = {
  programmeName: string
  normalizedProgrammeName: string
  programmeCode?: string
  institutionName: string
  normalizedInstitutionName: string
  awardLevel: string
  sourceDatasets: string[]
  careerKeywords?: string[]
  swahiliKeywords?: string[]
}

export function rankProgrammes<T extends RankableProgramme>(
  results: T[],
  query: string
) {
  const ranked = [...results].sort(
    (left, right) => programmeScore(right, query) - programmeScore(left, query)
  )
  const seen = new Set<string>()
  const deduped: T[] = []

  for (const programme of ranked) {
    const key = programmeIdentityKey(programme)
    if (seen.has(key)) continue
    seen.add(key)
    deduped.push(programme)
  }

  return deduped
}

function programmeScore(programme: RankableProgramme, query: string) {
  const normalizedQuery = query.toLowerCase().trim()
  const programmeName = programme.programmeName.toLowerCase()
  const normalizedProgrammeName =
    programme.normalizedProgrammeName.toLowerCase()
  const institutionName = programme.institutionName.toLowerCase()
  const code = programme.programmeCode?.toLowerCase()
  let score = 0

  if (code && normalizedQuery === code) score += 300
  if (
    programmeName === normalizedQuery ||
    normalizedProgrammeName === normalizedQuery
  )
    score += 220
  if (
    programmeName.includes(normalizedQuery) ||
    normalizedProgrammeName.includes(normalizedQuery)
  ) {
    score += 140
  }
  for (const token of normalizedQuery
    .split(/\s+/)
    .filter((part) => part.length > 2)) {
    if (
      programmeName.includes(token) ||
      normalizedProgrammeName.includes(token)
    )
      score += 35
  }
  if (institutionName.includes(normalizedQuery)) score += 20
  if (programme.programmeCode) score += 12
  if (
    programme.sourceDatasets.includes("tcu_secondary_guidebook_pdf_extraction")
  )
    score += 10
  if (programme.sourceDatasets.includes("education_pathways")) score += 5
  if (isNursingIntent(query)) score += nursingScore(programme)

  return score
}

function programmeIdentityKey(programme: RankableProgramme) {
  return [
    programmeNameFingerprint(programme.programmeName),
    programme.normalizedInstitutionName,
    programme.awardLevel,
  ].join("|")
}

export function isNursingIntent(query: string) {
  return isNursingIntentText(query)
}

function nursingScore(programme: RankableProgramme) {
  const text =
    `${programme.programmeName} ${(programme.careerKeywords ?? []).join(" ")} ${(programme.swahiliKeywords ?? []).join(" ")}`.toLowerCase()
  let score = 0
  if (/\bnursing\b|\bnurse\b/.test(text)) score += 100
  if (/\bmidwife\b|\bmidwifery\b/.test(text)) score += 90
  if (/\bdoctor\b|\bmedicine\b|\bpharmacy\b/.test(text)) score -= 25
  return score
}
