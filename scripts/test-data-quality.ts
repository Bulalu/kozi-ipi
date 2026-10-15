import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

import { interpretProgrammeQuery } from "../convex/programmeSearch/interpret"
import { rankProgrammes } from "../convex/programmeSearch/ranking"
import {
  processedApplicantPathwayFields,
  processedFileSpecs,
} from "../lib/data/processed-data-contract"
import {
  classifyManualReviewReason,
  summarizeManualReviewQueues,
} from "../lib/data/manual-review-queue"
import {
  applicantPathwayFlagFields,
  summarizeApplicantPathwayCoverage,
  type Suitability,
} from "../lib/domain/applicant-pathways"
import {
  compatibleInstitutionIdentityKeys,
  hasCampusMarker,
} from "../lib/domain/institution-identity"
import { programmeNameContainsRequirementLeak } from "../lib/domain/programme-offering-identity"

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
  acceptsFormFourDirect?: Suitability
  acceptsFormSix?: Suitability
  acceptsCertificate?: Suitability
  acceptsDiploma?: Suitability
  acceptsEquivalent?: Suitability
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

function inferredCourseFamily(query: string) {
  return interpretProgrammeQuery(query).inferredCourseFamily
}

function rankedDegreeSearchResults(query: string) {
  const filtered = programmes.filter(
    (programme) =>
      programme.awardLevel === "degree" &&
      programme.searchText.toLowerCase().includes(query.toLowerCase())
  )

  return rankProgrammes(filtered, query)
}

const programmes = readJsonl<Programme>(
  join(root, "data/processed/programmes.jsonl")
)
const entryRequirements = readJsonl<EntryRequirement>(
  join(root, "data/processed/entry-requirements.jsonl")
)
const packageJson = JSON.parse(
  readFileSync(join(root, "package.json"), "utf8")
) as {
  scripts?: Record<string, string>
}

assert(
  classifyManualReviewReason(
    "programme_name_contains_entry_requirement_fragment"
  ).queue === "programme_offering_identity",
  "Manual Review Queue should route programme title leaks to Programme Offering identity review."
)
assert(
  JSON.stringify(processedApplicantPathwayFields) ===
    JSON.stringify(applicantPathwayFlagFields),
  "Processed-Data Contract Applicant Pathway fields should match the domain model."
)
assert(
  packageJson.scripts?.["data:import"] ===
    "bun scripts/import-processed-data.ts",
  "Convex import command should go through the Processed-Data Contract Adapter."
)
assert(
  hasCampusMarker("College of Business Education Dodoma Campus"),
  "Institution Identity should expose campus-sensitive markers."
)
assert(
  compatibleInstitutionIdentityKeys("Ardhi University (ARU)", "Ardhi ARU"),
  "Institution Identity compatibility should cover safe loose rule matching."
)

for (const spec of processedFileSpecs.filter((file) => file.kind === "jsonl")) {
  const records = readJsonl<Record<string, unknown>>(
    join(root, "data/processed", spec.name)
  )
  assert(records.length > 0, `${spec.name} should contain processed rows.`)
  for (const keyField of spec.keyFields) {
    const blankCount = records.filter(
      (record) => !String(record[keyField] ?? "").trim()
    ).length
    assert(
      blankCount === 0,
      `${spec.name} has ${blankCount} row(s) with blank ${keyField}.`
    )
  }
}

const titleLeaks = programmes.filter((programme) =>
  programmeNameContainsRequirementLeak(programme.programmeName)
)

const programmePathwayCoverage = summarizeApplicantPathwayCoverage(programmes)
assert(
  programmePathwayCoverage.form_six.yes > 0 &&
    programmePathwayCoverage.diploma.yes > 0,
  "Applicant Pathway coverage summary should count accepted programme routes."
)
assert(
  summarizeManualReviewQueues(programmes).needsReview ===
    programmes.filter((programme) => programme.needsReview).length,
  "Manual Review Queue summary should preserve needsReview totals."
)
assert(
  titleLeaks.length === 0,
  [
    `Found ${titleLeaks.length} programme title(s) containing entry requirement text.`,
    ...titleLeaks
      .slice(0, 10)
      .map(
        (programme) =>
          `- ${programme.programmeName} | ${programme.institutionName}`
      ),
  ].join("\n")
)

const dirtyMuhasTitle =
  /Doctor of Medicine\s+MH011\s+Diploma in Clinical Medicine/i
assert(
  !programmes.some((programme) =>
    dirtyMuhasTitle.test(programme.programmeName)
  ),
  "MUHAS Doctor of Medicine diploma-route requirement leaked into programmeName."
)
assert(
  !entryRequirements.some((requirement) =>
    dirtyMuhasTitle.test(requirement.programmeName)
  ),
  "MUHAS Doctor of Medicine diploma-route requirement leaked into entry requirement programmeName."
)

const muhasDoctorOfMedicine = programmes.find(
  (programme) =>
    programme.programmeCode === "MH011" &&
    programme.programmeName === "Doctor of Medicine" &&
    /Muhimbili University of Health and Allied Sciences/i.test(
      programme.institutionName
    )
)

assert(
  muhasDoctorOfMedicine,
  "Missing clean MUHAS Doctor of Medicine programme MH011."
)
assert(
  muhasDoctorOfMedicine.acceptsDiploma === "yes",
  "MUHAS Doctor of Medicine MH011 should accept the diploma route."
)
assert(
  /\bDiploma\b/.test(muhasDoctorOfMedicine.entryRouteTypes ?? ""),
  "MUHAS Doctor of Medicine MH011 entryRouteTypes should include Diploma."
)
assert(
  /Diploma in Clinical Medicine/i.test(
    muhasDoctorOfMedicine.minimumEntryRequirements ?? ""
  ),
  "MUHAS Doctor of Medicine MH011 should retain the Clinical Medicine diploma requirement."
)

const muhasDiplomaRequirement = entryRequirements.find(
  (requirement) =>
    requirement.programmeName === "Doctor of Medicine" &&
    requirement.acceptsDiploma === "yes" &&
    /Muhimbili University of Health and Allied Sciences/i.test(
      requirement.institutionName
    )
)

assert(
  muhasDiplomaRequirement,
  "Missing MUHAS Doctor of Medicine diploma entry requirement row."
)
assert(
  /Diploma in Clinical Medicine/i.test(
    muhasDiplomaRequirement.rawRequirementText
  ),
  "MUHAS Doctor of Medicine diploma entry requirement should mention Diploma in Clinical Medicine."
)

assert(
  inferredCourseFamily("biomedical") === undefined,
  'The query "biomedical" must not infer the health/Afya filter from the embedded "medical" substring.'
)
assert(
  inferredCourseFamily("medical") === "health",
  'The exact query "medical" should still infer the health/Afya filter.'
)
assert(
  inferredCourseFamily("civil engineering") === "engineering",
  'The query "civil engineering" should infer engineering.'
)

const biomedicalDegreeResults = rankedDegreeSearchResults("biomedical")
const muhasBiomedicalRank = biomedicalDegreeResults.findIndex(
  (programme) => programme.programmeCode === "MH014"
)
const muhasBiomedicalProgramme = programmes.find(
  (programme) => programme.programmeCode === "MH014"
)
assert(
  muhasBiomedicalRank >= 0,
  "Biomedical degree search should include MUHAS MH014."
)
assert(
  muhasBiomedicalProgramme,
  "Missing MUHAS Biomedical Engineering programme MH014."
)
assert(
  muhasBiomedicalRank < 3,
  `MUHAS MH014 should rank in the top 3 for biomedical degree search, got rank ${muhasBiomedicalRank + 1}.`
)
assert(
  biomedicalDegreeResults
    .slice(0, 3)
    .every((programme) => /biomedical/i.test(programme.programmeName)),
  "Top biomedical degree results should match biomedical in the programme title."
)

const dedupedEquivalentProgrammes = rankProgrammes(
  [
    muhasBiomedicalProgramme,
    {
      ...muhasBiomedicalProgramme,
      programmeCode: undefined,
      programmeName: "Bachelor Degree in Biomedical Engineering",
      normalizedProgrammeName: "bachelor degree in biomedical engineering",
      sourceDatasets: ["education_pathways"],
    },
  ],
  "biomedical"
)
assert(
  dedupedEquivalentProgrammes.length === 1,
  "Programme ranking should dedupe equivalent cards so smartSearchCount matches rendered results."
)

console.log(`Data quality checks passed for ${programmes.length} programmes.`)
