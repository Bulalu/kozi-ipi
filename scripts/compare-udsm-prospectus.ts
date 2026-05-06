import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { basename, dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

import { parse } from "csv-parse/sync"

import { normalizeIdentityName } from "../lib/domain/institution-identity"
import { programmeNameFingerprint } from "../lib/domain/programme-offering-identity"

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, "..")
const prospectusCsvPath = join(
  root,
  "data/enrichment/udsm-undergraduate-prospectus-2024-2025-programmes.csv"
)
const tcuGuidebookCsvPath = join(
  root,
  "data/extracted/tcu-secondary-guidebook-2025-2026-programmes.csv"
)
const processedProgrammesPath = join(root, "data/processed/programmes.jsonl")
const outputDir = join(root, "data/extracted")
const outputPath = join(
  outputDir,
  "udsm-undergraduate-prospectus-2024-2025-comparison.json"
)

type Row = Record<string, string>

function readCsv(path: string): Row[] {
  return parse(readFileSync(path, "utf8"), {
    bom: true,
    columns: true,
    skip_empty_lines: true,
  }) as Row[]
}

function readJsonl(path: string): Row[] {
  if (!existsSync(path)) return []

  return readFileSync(path, "utf8")
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line) as Row)
}

function clean(value: string | undefined) {
  return (value ?? "").replace(/\s+/g, " ").trim()
}

function normalizeName(value: string | undefined) {
  return normalizeIdentityName(clean(value).replace(/&/g, " and "))
}

function normalizeInstitutionName(value: string | undefined) {
  return normalizeName(value)
    .replace(
      /^(the\s+)?(university|college|institute|school|academy|centre|center)\s+of\s+/,
      ""
    )
    .replace(
      /^(the\s+)?(university|college|institute|school|academy|centre|center)\s+/,
      ""
    )
    .replace(/\s+campus$/, "")
    .replace(
      /\b(dar\s+es\s+salaam|dodoma|mwanza|zanzibar|mbeya|arusha|morogoro|tabora|kilimanjaro|iringa|pemba|simiyu|geita|mtwara|rukwa|shinyanga|bagamoyo|tanga|singida|mara|musoma|lindi|pwani|kigoma|kagera|njombe|songwe|manyara|katavi|ruvuma|bukoba|songea|moshi|chato)\s*$/,
      ""
    )
    .replace(/\s+/g, " ")
    .trim()
}

function formalProgrammeName(value: string | undefined) {
  return clean(value)
    .replace(/^BSc\b/i, "Bachelor of Science")
    .replace(/^BA\b/i, "Bachelor of Arts")
    .replace(/\bBee Keeping\b/gi, "Beekeeping")
    .replace(/\bArcheology\b/gi, "Archaeology")
    .replace(/\bMechanization\b/gi, "Mechanisation")
    .replace(/\bTelecommunications\b/gi, "Telecommunication")
    .replace(/^Bachelor of Arts of Social Work$/i, "Bachelor of Social Work")
    .replace(/^Bachelor of Arts in Social Work$/i, "Bachelor of Social Work")
    .replace(
      /^Bachelor of Arts of Library and Information Studies$/i,
      "Bachelor of Library and Information Studies"
    )
    .replace(
      /^Bachelor of Arts in Library and Information Studies$/i,
      "Bachelor of Library and Information Studies"
    )
    .replace(/^Bachelor of Arts of\b/i, "Bachelor of Arts in")
    .replace(
      /^Bachelor of Science with Geology$/i,
      "Bachelor of Science in Geology"
    )
    .replace(
      /^Bachelor of Science in Chemistry and Physics$/i,
      "Bachelor of Science in Physics and Chemistry"
    )
    .replace(
      /^Bachelor of Commerce in Tourism and Hospitality Management$/i,
      "Bachelor of Commerce in Tourism Management"
    )
    .replace(
      /^Bachelor of Commerce in Human Resources Management$/i,
      "Bachelor of Commerce in Human Resource Management"
    )
    .replace(
      /^Bachelor of Business Administration \(Evening Programme\)$/i,
      "Bachelor of Business Administration (Evening)"
    )
    .replace(
      /^Bachelor of Education in Physical Education and Sport Sciences$/i,
      "Bachelor of Education in Physical Education and Sports Sciences"
    )
    .replace(
      /^Bachelor of Arts in Film and Television Studies$/i,
      "Bachelor of Arts in Film and Television Arts"
    )
    .replace(
      /^Bachelor of Arts with Education \((CoHU|CoSS)\)$/i,
      "Bachelor of Arts with Education"
    )
    .replace(
      /^Technician Certificate Land and Mine Surveying$/i,
      "Technician Certificate in Land and Mine Surveying"
    )
    .replace(
      /^Basic Certificate Land and Mine Surveying$/i,
      "Basic Certificate in Land and Mine Surveying"
    )
}

function programmeFingerprint(value: string | undefined) {
  return programmeNameFingerprint(formalProgrammeName(value))
}

function normalizedAwardLevel(value: string | undefined) {
  const normalized = normalizeName(value)
  if (normalized.includes("diploma")) return "ordinary diploma"
  if (normalized.includes("certificate")) return "certificate"
  return "degree"
}

const mainCampusUnits = new Set([
  "College of Agricultural Sciences and Food Technology (CoAF)",
  "College of Humanities (CoHU)",
  "College of Social Sciences (CoSS)",
  "College of Engineering and Technology (CoET)",
  "College of Natural and Applied Sciences (CoNAS)",
  "College of Information and Communication Technologies (CoICT)",
  "School of Mines and Geosciences (SoMG)",
  "School of Aquatic Sciences and Fisheries Technology (SoAF)",
  "School of Journalism and Mass Communication (SJMC)",
  "University of Dar es Salaam Business School (UDBS)",
  "University of Dar es Salaam School of Economics (UDSE)",
  "School of Education (SoED)",
  "University of Dar es Salaam School of Law (UDSoL)",
  "Institute of Kiswahili Studies (IKS)",
  "Institute of Development Studies (IDS)",
])

function prospectusInstitutionName(row: Row) {
  const academicUnit = clean(row.academic_unit)

  if (mainCampusUnits.has(academicUnit))
    return "University of Dar es Salaam (UDSM)"
  if (/Dar es Salaam University College of Education/i.test(academicUnit)) {
    return "Dar es Salaam University College of Education (DUCE)"
  }
  if (/Mkwawa University College of Education/i.test(academicUnit)) {
    return "Mkwawa University College of Education (MUCE)"
  }
  if (/Mbeya College of Health and Allied Sciences/i.test(academicUnit)) {
    return "Mbeya College of Health and Allied Sciences (MCHAS)"
  }
  if (/Mineral Resources Institute/i.test(academicUnit)) {
    return "MINERAL RESOURCES INSTITUTE (MADINI INSTITUTE) - DODOMA"
  }

  return academicUnit
}

function key(
  programme: string | undefined,
  institution: string | undefined,
  awardLevel: string | undefined
) {
  return [
    programmeFingerprint(programme),
    normalizeInstitutionName(institution),
    normalizedAwardLevel(awardLevel),
  ].join("|")
}

function findMatches(
  row: Row,
  indexedRows: Map<string, Row[]>,
  nameField: string,
  institutionField: string
) {
  const institutionName = prospectusInstitutionName(row)
  const exactKey = key(row.programme_name, institutionName, row.award_level)
  const exact = indexedRows.get(exactKey) ?? []
  if (exact.length > 0) return exact

  const looseProgramme = programmeFingerprint(row.programme_name)
  const looseInstitution = normalizeInstitutionName(institutionName)

  return [...indexedRows.values()]
    .flat()
    .filter((candidate) => {
      const candidateProgramme = programmeFingerprint(candidate[nameField])
      const candidateInstitution = normalizeInstitutionName(
        candidate[institutionField]
      )
      return (
        candidateProgramme === looseProgramme &&
        candidateInstitution === looseInstitution
      )
    })
    .slice(0, 5)
}

if (!existsSync(prospectusCsvPath)) {
  throw new Error(`UDSM prospectus CSV not found: ${prospectusCsvPath}`)
}

const prospectusRows = readCsv(prospectusCsvPath)
const tcuRows = existsSync(tcuGuidebookCsvPath)
  ? readCsv(tcuGuidebookCsvPath)
  : []
const processedRows = readJsonl(processedProgrammesPath)

const tcuByKey = new Map<string, Row[]>()
for (const row of tcuRows) {
  const rowKey = key(row.programmeName, row.institutionName, "Bachelor Degree")
  tcuByKey.set(rowKey, [...(tcuByKey.get(rowKey) ?? []), row])
}

const processedByKey = new Map<string, Row[]>()
for (const row of processedRows) {
  const rowKey = key(row.programmeName, row.institutionName, row.awardLevel)
  processedByKey.set(rowKey, [...(processedByKey.get(rowKey) ?? []), row])
}

const rows = prospectusRows.map((row) => {
  const tcuMatches = findMatches(
    row,
    tcuByKey,
    "programmeName",
    "institutionName"
  )
  const processedMatches = findMatches(
    row,
    processedByKey,
    "programmeName",
    "institutionName"
  )
  return {
    programmeName: clean(row.programme_name),
    formalProgrammeName: formalProgrammeName(row.programme_name),
    awardLevel: clean(row.award_level),
    academicUnit: clean(row.academic_unit),
    mappedInstitutionName: prospectusInstitutionName(row),
    existsInTcuGuidebook: tcuMatches.length > 0,
    existsInProcessedDb: processedMatches.length > 0,
    tcuMatches: tcuMatches.map((match) => ({
      programmeCode: clean(match.programmeCode),
      programmeName: clean(match.programmeName),
      institutionName: clean(match.institutionName),
    })),
    processedMatches: processedMatches.map((match) => ({
      programmeCode: clean(match.programmeCode),
      programmeName: clean(match.programmeName),
      institutionName: clean(match.institutionName),
      sourceDatasets: match.sourceDatasets,
    })),
  }
})

const missingFromTcu = rows.filter((row) => !row.existsInTcuGuidebook)
const missingFromProcessed = rows.filter((row) => !row.existsInProcessedDb)
const report = {
  generatedAt: new Date().toISOString(),
  sourceFile: basename(prospectusCsvPath),
  tcuGuidebookFile: existsSync(tcuGuidebookCsvPath)
    ? basename(tcuGuidebookCsvPath)
    : null,
  processedProgrammesFile: existsSync(processedProgrammesPath)
    ? basename(processedProgrammesPath)
    : null,
  prospectusProgrammeCount: prospectusRows.length,
  missingFromTcuGuidebookCount: missingFromTcu.length,
  missingFromProcessedDbCount: missingFromProcessed.length,
  missingFromTcuGuidebook: missingFromTcu,
  missingFromProcessedDb: missingFromProcessed,
}

mkdirSync(outputDir, { recursive: true })
writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`)
console.log(JSON.stringify({ outputPath, ...report }, null, 2))
