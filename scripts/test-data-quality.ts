import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, "..")

type Programme = {
  programmeName: string
  normalizedProgrammeName: string
  programmeCode?: string
  institutionName: string
  normalizedInstitutionName: string
  awardLevel: string
  courseFamily?: string
  searchText: string
  sourceDatasets: string[]
  acceptsDiploma?: string
  entryRouteTypes?: string
  minimumEntryRequirements?: string
  needsReview?: boolean
}

type EntryRequirement = {
  programmeName: string
  institutionName: string
  rawRequirementText: string
  acceptsDiploma?: string
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

function programmeNameContainsRequirementLeak(value: string) {
  const text = value.replace(/\s+/g, " ").trim()

  return (
    /\b[A-Z]{2,4}\d{2,3}\b\s+(Diploma|Certificate|Foundation|Holder|Holders|One principal|Two principal|Three principal)/i.test(
      text,
    ) ||
    /\b(applicant must|principal passes|minimum GPA|average of ["'“”]?B|minimum of ["'“”]?D["'“”]? grade)\b/i.test(
      text,
    )
  )
}

const searchIntentTerms = {
  engineering: ["engineering", "engineer", "civil", "mechanical", "electrical"],
  health: ["health", "afya", "nurse", "nursing", "nesi", "hospital", "medical", "clinical"],
  ICT: ["ict", "computer", "kompyuta", "software", "network", "technology"],
  business: ["business", "biashara", "accounting", "procurement", "office", "ofisini"],
  education: ["education", "teacher", "teaching", "ualimu", "mwalimu"],
  tourism_hospitality: ["hotel", "hospitality", "tourism", "utalii"],
  agriculture: ["agriculture", "kilimo"],
}

function includesIntentTerm(query: string, term: string) {
  const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  return new RegExp(`(^|[^\\p{L}\\p{N}])${escapedTerm}($|[^\\p{L}\\p{N}])`, "iu").test(
    query,
  )
}

function inferredCourseFamily(query: string) {
  const normalizedQuery = query.trim().toLowerCase()

  for (const [family, terms] of Object.entries(searchIntentTerms)) {
    if (terms.some((term) => includesIntentTerm(normalizedQuery, term))) {
      return family
    }
  }

  return undefined
}

function programmeNameFingerprint(value: string) {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(
      /^(ordinary diploma|basic technician certificate|technician certificate|certificate|diploma|bachelor degree|bachelor|degree)\s+/,
      "",
    )
    .replace(/^(of|in)\s+/, "")
    .replace(/\s+in\s+/g, " ")
    .replace(/\s+and\s+/g, " ")
    .replace(/\s+with\s+/g, " ")
    .trim()
}

function programmeIdentityKey(programme: Programme) {
  return [
    programmeNameFingerprint(programme.programmeName),
    programme.normalizedInstitutionName,
    programme.awardLevel,
  ].join("|")
}

function programmeSearchScore(programme: Programme, query: string) {
  const normalizedQuery = query.toLowerCase().trim()
  const programmeName = programme.programmeName.toLowerCase()
  const normalizedProgrammeName = programme.normalizedProgrammeName.toLowerCase()
  const institutionName = programme.institutionName.toLowerCase()
  const code = programme.programmeCode?.toLowerCase()
  let score = 0

  if (code && normalizedQuery === code) score += 300
  if (programmeName === normalizedQuery || normalizedProgrammeName === normalizedQuery) score += 220
  if (programmeName.includes(normalizedQuery) || normalizedProgrammeName.includes(normalizedQuery)) {
    score += 140
  }
  for (const token of normalizedQuery.split(/\s+/).filter((part) => part.length > 2)) {
    if (programmeName.includes(token) || normalizedProgrammeName.includes(token)) score += 35
  }
  if (institutionName.includes(normalizedQuery)) score += 20
  if (programme.programmeCode) score += 12
  if (programme.sourceDatasets.includes("tcu_secondary_guidebook_pdf_extraction")) score += 10
  if (programme.sourceDatasets.includes("education_pathways")) score += 5

  return score
}

function rankedDegreeSearchResults(query: string) {
  const ranked = programmes
    .filter(
      (programme) =>
        programme.awardLevel === "degree" &&
        programme.searchText.toLowerCase().includes(query.toLowerCase()),
    )
    .sort((left, right) => programmeSearchScore(right, query) - programmeSearchScore(left, query))
  const seen = new Set<string>()
  const deduped: Programme[] = []

  for (const programme of ranked) {
    const key = programmeIdentityKey(programme)
    if (seen.has(key)) continue
    seen.add(key)
    deduped.push(programme)
  }

  return deduped
}

const programmes = readJsonl<Programme>(join(root, "data/processed/programmes.jsonl"))
const entryRequirements = readJsonl<EntryRequirement>(
  join(root, "data/processed/entry-requirements.jsonl"),
)

const titleLeaks = programmes.filter((programme) =>
  programmeNameContainsRequirementLeak(programme.programmeName),
)
assert(
  titleLeaks.length === 0,
  [
    `Found ${titleLeaks.length} programme title(s) containing entry requirement text.`,
    ...titleLeaks.slice(0, 10).map((programme) =>
      `- ${programme.programmeName} | ${programme.institutionName}`,
    ),
  ].join("\n"),
)

const dirtyMuhasTitle = /Doctor of Medicine\s+MH011\s+Diploma in Clinical Medicine/i
assert(
  !programmes.some((programme) => dirtyMuhasTitle.test(programme.programmeName)),
  "MUHAS Doctor of Medicine diploma-route requirement leaked into programmeName.",
)
assert(
  !entryRequirements.some((requirement) => dirtyMuhasTitle.test(requirement.programmeName)),
  "MUHAS Doctor of Medicine diploma-route requirement leaked into entry requirement programmeName.",
)

const muhasDoctorOfMedicine = programmes.find(
  (programme) =>
    programme.programmeCode === "MH011" &&
    programme.programmeName === "Doctor of Medicine" &&
    /Muhimbili University of Health and Allied Sciences/i.test(programme.institutionName),
)

assert(muhasDoctorOfMedicine, "Missing clean MUHAS Doctor of Medicine programme MH011.")
assert(
  muhasDoctorOfMedicine.acceptsDiploma === "yes",
  "MUHAS Doctor of Medicine MH011 should accept the diploma route.",
)
assert(
  /\bDiploma\b/.test(muhasDoctorOfMedicine.entryRouteTypes ?? ""),
  "MUHAS Doctor of Medicine MH011 entryRouteTypes should include Diploma.",
)
assert(
  /Diploma in Clinical Medicine/i.test(muhasDoctorOfMedicine.minimumEntryRequirements ?? ""),
  "MUHAS Doctor of Medicine MH011 should retain the Clinical Medicine diploma requirement.",
)

const muhasDiplomaRequirement = entryRequirements.find(
  (requirement) =>
    requirement.programmeName === "Doctor of Medicine" &&
    requirement.acceptsDiploma === "yes" &&
    /Muhimbili University of Health and Allied Sciences/i.test(requirement.institutionName),
)

assert(
  muhasDiplomaRequirement,
  "Missing MUHAS Doctor of Medicine diploma entry requirement row.",
)
assert(
  /Diploma in Clinical Medicine/i.test(muhasDiplomaRequirement.rawRequirementText),
  "MUHAS Doctor of Medicine diploma entry requirement should mention Diploma in Clinical Medicine.",
)

assert(
  inferredCourseFamily("biomedical") === undefined,
  'The query "biomedical" must not infer the health/Afya filter from the embedded "medical" substring.',
)
assert(
  inferredCourseFamily("medical") === "health",
  'The exact query "medical" should still infer the health/Afya filter.',
)
assert(
  inferredCourseFamily("civil engineering") === "engineering",
  'The query "civil engineering" should infer engineering.',
)

const biomedicalDegreeResults = rankedDegreeSearchResults("biomedical")
const muhasBiomedicalRank = biomedicalDegreeResults.findIndex(
  (programme) => programme.programmeCode === "MH014",
)
assert(muhasBiomedicalRank >= 0, "Biomedical degree search should include MUHAS MH014.")
assert(
  muhasBiomedicalRank < 3,
  `MUHAS MH014 should rank in the top 3 for biomedical degree search, got rank ${muhasBiomedicalRank + 1}.`,
)
assert(
  biomedicalDegreeResults
    .slice(0, 3)
    .every((programme) => /biomedical/i.test(programme.programmeName)),
  "Top biomedical degree results should match biomedical in the programme title.",
)

console.log(`Data quality checks passed for ${programmes.length} programmes.`)
