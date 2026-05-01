import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

import { matchesField } from "../lib/domain/taxonomy"
import { interpretProgrammeQuery } from "../convex/programmeSearch/interpret"
import { sliceSearchPage } from "../convex/programmeSearch/pagination"

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, "..")

type Institution = {
  normalizedInstitutionName: string
  logoStatus?: string
  logoUrl?: string
  website?: string
}

type Programme = {
  normalizedInstitutionName: string
  institutionLogoUrl?: string
  institutionWebsite?: string
}

function readJsonl<T>(path: string): T[] {
  return readFileSync(path, "utf8")
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line) as T)
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message)
  }
}

const interpretedNursing = interpretProgrammeQuery("nataka kuwa nurse")
assert(
  interpretedNursing.inferredCourseFamily === "health",
  'Expected "nataka kuwa nurse" to infer the health course family.'
)

const interpretedIT = interpretProgrammeQuery("information technology")
assert(
  interpretedIT.inferredCourseFamily === "ICT",
  'Expected "information technology" to infer the ICT course family.'
)

const interpretedTourism = interpretProgrammeQuery("hotel management")
assert(
  interpretedTourism.inferredCourseFamily === "tourism_hospitality",
  'Expected "hotel management" to infer the tourism_hospitality course family.'
)

const interpretedEngineering = interpretProgrammeQuery("civil engineering")
assert(
  interpretedEngineering.inferredCourseFamily === "engineering",
  'Expected "civil engineering" to infer the engineering course family.'
)

assert(
  matchesField("technical automotive engineering", "Engineering"),
  "Engineering field taxonomy should match technical/automotive text."
)
assert(
  !matchesField("technical automotive engineering", "Business"),
  "Business field taxonomy must not match engineering-only text."
)

const pagedFixtures = Array.from({ length: 45 }, (_, index) => ({
  id: `programme-${index + 1}`,
}))
const firstSearchPage = sliceSearchPage(pagedFixtures, {
  cursor: null,
  pageSize: 20,
})
assert(
  firstSearchPage.total === 45,
  "Search pagination should expose the full total."
)
assert(
  firstSearchPage.results.length === 20,
  "First search page should respect page size."
)
assert(firstSearchPage.hasMore, "First search page should report more results.")
assert(
  firstSearchPage.nextCursor === "20",
  "First search page should continue from offset 20."
)

const secondSearchPage = sliceSearchPage(pagedFixtures, {
  cursor: firstSearchPage.nextCursor,
  pageSize: 20,
})
assert(
  secondSearchPage.results[0]?.id === "programme-21",
  "Second search page should start after the first page."
)
assert(
  !firstSearchPage.results.some((result) =>
    secondSearchPage.results.some((nextResult) => nextResult.id === result.id)
  ),
  "Search pagination pages must not overlap."
)
assert(
  secondSearchPage.hasMore,
  "Second search page should report a final page."
)

const finalSearchPage = sliceSearchPage(pagedFixtures, {
  cursor: secondSearchPage.nextCursor,
  pageSize: 20,
})
assert(
  finalSearchPage.results.length === 5,
  "Final search page should return remaining results."
)
assert(!finalSearchPage.hasMore, "Final search page should be exhausted.")
assert(
  finalSearchPage.nextCursor === null,
  "Final search page should not return a cursor."
)

const institutions = readJsonl<Institution>(
  join(root, "data/processed/institutions.jsonl")
)
const programmes = readJsonl<Programme>(
  join(root, "data/processed/programmes.jsonl")
)
const institutionsByName = new Map(
  institutions.map((institution) => [
    institution.normalizedInstitutionName,
    institution,
  ])
)

const programmesWithLogo = programmes.filter(
  (programme) => programme.institutionLogoUrl
)
assert(
  programmesWithLogo.length > 0,
  "Expected at least one processed programme to carry a denormalized institution logo URL."
)

for (const programme of programmesWithLogo) {
  const institution = institutionsByName.get(
    programme.normalizedInstitutionName
  )
  assert(
    institution,
    `Missing processed institution for programme ${programme.normalizedInstitutionName}.`
  )
  assert(
    institution.logoStatus === "verified",
    `Programme logo should only be denormalized from verified institutions: ${programme.normalizedInstitutionName}.`
  )
  assert(
    programme.institutionLogoUrl === institution.logoUrl,
    `Programme logo URL drifted from institution logo URL for ${programme.normalizedInstitutionName}.`
  )
}

const programmesWithWebsite = programmes.filter(
  (programme) => programme.institutionWebsite
)
assert(
  programmesWithWebsite.length > 0,
  "Expected at least one processed programme to carry a denormalized institution website."
)

console.log(
  `Search contract checks passed for ${programmesWithLogo.length} logo-bearing programmes and ${programmesWithWebsite.length} programmes with websites.`
)
