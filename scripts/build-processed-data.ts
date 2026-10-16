import { existsSync, readFileSync, writeFileSync } from "node:fs"
import { dirname, isAbsolute, join } from "node:path"
import { fileURLToPath } from "node:url"

import { parse } from "csv-parse/sync"

import {
  mergeReviewReasons,
  needsManualReview,
  summarizeManualReviewQueues,
} from "../lib/data/manual-review-queue"
import { writeProcessedDataOutputs } from "../lib/data/processed-output"
import {
  createSplitWordRepairer,
  isProseInstitutionName,
  parseGuidebookHeading,
  programmeTitleQualityIssues,
  resolveGuidebookInstitutions,
} from "../lib/data/tcu-guidebook"
import {
  acceptedApplicantPathwayLabels,
  summarizeApplicantPathwayCoverage,
} from "../lib/domain/applicant-pathways"
import {
  compatibleInstitutionIdentityKeys,
  institutionAliases,
  institutionNameCandidates,
  normalizeIdentityName as normalizeName,
} from "../lib/domain/institution-identity"
import {
  programmeNameContainsRequirementLeak,
  programmeOfferingIdentityKey,
  requirementIdentityKey,
} from "../lib/domain/programme-offering-identity"
import { buildProgrammeKeywordPack } from "../lib/domain/search-vocabulary"
import {
  findEmbeddedTcuProgrammeCodes,
  normalizeTcuProgrammeCode,
} from "../lib/domain/tcu-programme-code"
import { parseRequirementRuleSet } from "../lib/eligibility/parse-requirements"
import type { RequirementRuleSet } from "../lib/eligibility/types"

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, "..")

const legacyBaseDir = join(root, "data/raw/tanzania-post-form-four-dataset")
const nactvetEnrichmentDir = join(root, "data/raw/tanzania-education-dataset")
const pathwaysDir = join(root, "data/raw/tanzania-education-pathways-dataset")
const logoEnrichmentPath = join(
  root,
  "data/enrichment/institution-logos.seed.csv"
)
const tcuSecondaryExtractedProgrammesPath = join(
  root,
  "data/extracted/tcu-secondary-guidebook-2025-2026-programmes.csv"
)
const udsmProspectusProgrammesPath = join(
  root,
  "data/enrichment/udsm-undergraduate-prospectus-2024-2025-programmes.csv"
)
const outputDir = resolveOutputDir()
const tcuCoverageReportPath = join(outputDir, "tcu-coverage-report.json")
const tcuSecondaryGuidebookUrl =
  "https://tcu.go.tz/sites/default/files/public_notices/2025-07/Admission%20Guidebook%20for%20Holders%20of%20Secondary%20School%20Qualifications_2025_2026.pdf"
const udsmUndergraduateProspectusSource =
  "Undergraduate Prospectus 2024-2025 (1).pdf"

type Row = Record<string, string>
type Suitability = "yes" | "no" | "unknown"
type ConfidenceLevel = "high" | "medium" | "low"
type LogoStatus = "verified" | "missing" | "needs_review"

function resolveOutputDir() {
  const override = process.env.KOZI_PROCESSED_OUTPUT_DIR?.trim()
  if (!override) {
    return join(root, "data/processed")
  }

  return isAbsolute(override) ? override : join(root, override)
}

type ProcessedInstitution = {
  institutionName: string
  normalizedInstitutionName: string
  registrationNumber?: string
  registrationNumberAsShown?: string
  regulator: string
  accreditationStatus?: string
  ownershipType: string
  institutionType: string
  institutionCategory?: string
  region?: string
  districtOrCouncil?: string
  physicalLocation?: string
  mainlandOrZanzibar?: string
  website?: string
  logoUrl?: string
  logoSourceUrl?: string
  logoStatus?: LogoStatus
  logoVerifiedAt?: string
  phoneNumbers?: string
  email?: string
  applicationMethod?: string
  admissionsUrl?: string
  applicationUrl?: string
  hasFormFourDirectProgramme: Suitability
  programmeCount?: number
  awardLevels?: string[]
  fieldCategories?: string[]
  courseFamilies?: string[]
  browseSearchText?: string
  officialSourceUrl: string
  sourceType: string
  sourceDatasets: string[]
  confidenceLevel: ConfidenceLevel
  lastVerifiedDate: string
  notes?: string
  needsReview: boolean
  reviewReasons: string[]
  searchText: string
}

type ProcessedProgramme = {
  programmeName: string
  normalizedProgrammeName: string
  programmeCode?: string
  awardLevel: string
  qualificationLevel?: string
  pathwayType?: string
  fieldCategory: string
  courseFamily?: string
  institutionName: string
  normalizedInstitutionName: string
  institutionRegistrationNumber?: string
  regulator: string
  institutionType?: string
  ownershipType?: string
  region?: string
  districtOrCouncil?: string
  institutionLogoUrl?: string
  institutionLogoSourceUrl?: string
  institutionWebsite?: string
  minimumEntryRequirements?: string
  requiredSubjects?: string
  suitableForFormFourLeaver: Suitability
  acceptsFormSix: Suitability
  acceptsCertificate: Suitability
  acceptsDiploma: Suitability
  acceptsEquivalent: Suitability
  duration?: string
  feesIfAvailable?: string
  feeBand?: string
  studyMode?: string
  campusLocation?: string
  admissionCapacity?: string
  minimumAdmissionPoints?: number
  minimumAdmissionPointsSubjectCount?: number
  entryRouteTypes?: string
  acceptsFormFourDirect: Suitability
  accreditationStatusIfAvailable?: string
  applicationLink?: string
  officialSourceUrl: string
  sourceType: string
  sourceDatasets: string[]
  confidenceLevel: ConfidenceLevel
  lastVerifiedDate: string
  notes?: string
  needsReview: boolean
  reviewReasons: string[]
  careerKeywords: string[]
  swahiliKeywords: string[]
  searchText: string
  // Build-only: requirement keys of every source row merged into this
  // programme. Stripped before the processed files are written.
  sourceRequirementKeys?: string[]
}

type ProcessedEntryRequirement = {
  programmeName: string
  normalizedProgrammeName: string
  institutionName: string
  normalizedInstitutionName: string
  rawRequirementText: string
  acceptsFormFourDirect: Suitability
  acceptsFormSix: Suitability
  acceptsCertificate: Suitability
  acceptsDiploma: Suitability
  acceptsEquivalent: Suitability
  minimumCseeDivisionIfAvailable?: string
  minimumAcseePrincipalPassesIfAvailable?: string
  minimumPointsIfAvailable?: string
  requiredSubjects?: string
  requiredSubjectGradesIfAvailable?: string
  requiredPriorFieldIfAvailable?: string
  bridgeOrFoundationRequired: Suitability
  eligibilityConfidence: ConfidenceLevel
  officialSourceUrl: string
  notes?: string
  searchText: string
}

type ProcessedRequirementRule = RequirementRuleSet & {
  programmeName: string
  normalizedProgrammeName: string
  institutionName: string
  normalizedInstitutionName: string
  programmeCode?: string
  minimumAdmissionPoints?: number
  minimumAdmissionPointsSubjectCount?: number
  searchText: string
}

function readCsv(path: string): Row[] {
  return parse(readFileSync(path, "utf8"), {
    bom: true,
    columns: true,
    skip_empty_lines: true,
  }) as Row[]
}

function readCsvIfExists(path: string): Row[] {
  return existsSync(path) ? readCsv(path) : []
}

function blankToUndefined(value: string | undefined) {
  const trimmed = value?.trim()
  return trimmed ? trimmed : undefined
}

function cleanDataArtifactText(value: string | undefined) {
  return (value ?? "")
    .replace(/\.{5,}\s*\d*/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function cleanDataArtifactValue(value: string | undefined) {
  return blankToUndefined(cleanDataArtifactText(value))
}

function cleanProgrammeNameArtifact(value: string | undefined) {
  return blankToUndefined(
    cleanDataArtifactText(value)
      .replace(/\s+subjects?:.*$/i, "")
      .replace(/\s+\d+\s+\d+\s+duration\s*\(yrs\).*$/i, "")
  )
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function isTcuOrdinaryDiplomaEquivalentRoute(row: Row) {
  const sourceText = [
    row.regulator,
    row.source_type,
    row.notes,
    row.official_source_url,
  ].join(" ")

  return (
    /TCU|tcu\.go\.tz/i.test(sourceText) &&
    (/ordinary diploma\/equivalent/i.test(sourceText) ||
      /ordinary diploma\/equivalent route/i.test(sourceText) ||
      /Holders%20of%20Diploma/i.test(sourceText))
  )
}

function embeddedTcuProgrammeCode(row: Row) {
  if (!isTcuOrdinaryDiplomaEquivalentRoute(row)) return undefined

  const match = cleanDataArtifactText(row.programme_name).match(
    /\b([A-Z]{2,4}\d{2,3})\b/
  )
  return match?.[1]
}

function programmeCodeForRow(row: Row) {
  return blankToUndefined(row.programme_code) ?? embeddedTcuProgrammeCode(row)
}

function cleanProgrammeNameForRow(row: Row) {
  const programmeName = cleanProgrammeNameArtifact(row.programme_name) ?? ""
  const code = embeddedTcuProgrammeCode(row)

  if (code) {
    const [beforeCode] = programmeName.split(
      new RegExp(`\\b${escapeRegExp(code)}\\b`)
    )
    const cleanName = blankToUndefined(beforeCode)
    if (cleanName) return cleanName
  }

  return programmeName
}

function normalizedProgrammeNameForRow(row: Row, programmeName: string) {
  const rawProgrammeName = cleanProgrammeNameArtifact(row.programme_name) ?? ""
  const rawNormalizedProgrammeName = blankToUndefined(
    row.normalized_programme_name
  )

  if (programmeName !== rawProgrammeName) {
    return normalizeName(programmeName)
  }

  return rawNormalizedProgrammeName ?? normalizeName(programmeName)
}

function embeddedTcuRequirementPrefix(row: Row) {
  const code = embeddedTcuProgrammeCode(row)
  if (!code) return undefined

  const rawProgrammeName = cleanDataArtifactText(row.programme_name)
  const afterCode = rawProgrammeName
    .replace(new RegExp(`^.*?\\b${escapeRegExp(code)}\\b\\s*`), "")
    .trim()

  if (/^(Diploma|Certificate|Foundation|Holder|Holders?)\b/i.test(afterCode)) {
    return afterCode
  }

  return undefined
}

function cleanRequirementTextForRow(row: Row) {
  const rawRequirementText = cleanDataArtifactText(row.raw_requirement_text)
  const prefix = embeddedTcuRequirementPrefix(row)

  if (prefix && rawRequirementText && !rawRequirementText.startsWith(prefix)) {
    return cleanDataArtifactText(`${prefix} ${rawRequirementText}`)
  }

  return rawRequirementText
}

function dataArtifactReviewReasons(label: string, value: string | undefined) {
  const text = value ?? ""
  const reasons: string[] = []
  if (/\.{5,}\s*\d*/.test(text)) {
    reasons.push(`${label}_contains_dotted_filler`)
  }
  if (label === "programme_name" && /\bsubjects?:\b/i.test(text)) {
    reasons.push("programme_name_contains_entry_requirement_fragment")
  }
  return reasons
}

function normalizeAwardLevel(value: string | undefined) {
  const normalized = normalizeName(value)
  if (!normalized || normalized === "unknown") return "unknown"
  if (normalized.includes("short")) return "short course"
  if (normalized.includes("diploma")) return "ordinary diploma"
  if (normalized.includes("vocational")) return "vocational certificate"
  if (normalized.includes("certificate")) return "certificate"
  if (
    normalized.includes("degree") ||
    normalized.includes("bachelor") ||
    normalized === "doctor of medicine"
  )
    return "degree"
  return normalized
}

function normalizeFieldCategory(value: string | undefined) {
  const normalized = normalizeName(value)
  if (!normalized) return "other"
  if (normalized.includes("ict") || normalized.includes("comput")) return "ICT"
  return normalized
}

function inferFieldCategoryFromProgrammeName(value: string | undefined) {
  const normalized = normalizeName(value)
  if (!normalized) return "other"
  if (/\b(education|teaching|teacher|ualimu|elimu)\b/.test(normalized))
    return "education"
  if (
    /\b(account|finance|business|commerce|procurement|marketing|economics|insurance|banking|tax|logistics|entrepreneurship|human resource|management)\b/.test(
      normalized
    )
  ) {
    return "business finance management"
  }
  if (
    /\b(computer|information technology|ict|data science|cyber|software|networks?)\b/.test(
      normalized
    )
  ) {
    return "ICT"
  }
  if (
    /\b(engineering|architecture|construction|geomatics|surveying|land|urban|planning|property|real estate|environmental)\b/.test(
      normalized
    )
  ) {
    return "engineering technology"
  }
  if (
    /\b(medicine|medical|nursing|pharmacy|health|laboratory|clinical|dentistry)\b/.test(
      normalized
    )
  ) {
    return "health"
  }
  if (
    /\b(agriculture|veterinary|animal|forestry|wildlife|nutrition)\b/.test(
      normalized
    )
  ) {
    return "agriculture"
  }
  if (
    /\b(law|public administration|community development|social work|governance)\b/.test(
      normalized
    )
  ) {
    return "law public administration"
  }
  if (/\b(tourism|hospitality|hotel)\b/.test(normalized))
    return "tourism hospitality"
  return "other"
}

function normalizeSuitability(value: string | undefined): Suitability {
  const normalized = value?.trim().toLowerCase()
  if (normalized === "yes" || normalized === "no") {
    return normalized
  }
  return "unknown"
}

function normalizeDiplomaSuitability(row: Row): Suitability {
  const explicitValue = normalizeSuitability(row.accepts_diploma)
  if (explicitValue !== "unknown") return explicitValue
  if (isTcuOrdinaryDiplomaEquivalentRoute(row)) return "yes"

  return "unknown"
}

function normalizeConfidence(value: string | undefined): ConfidenceLevel {
  const normalized = value?.trim().toLowerCase()
  if (
    normalized === "high" ||
    normalized === "medium" ||
    normalized === "low"
  ) {
    return normalized
  }
  return "low"
}

function normalizeBoolean(value: string | undefined) {
  const normalized = value?.trim().toLowerCase()
  return normalized === "yes" || normalized === "true"
}

function normalizeLogoStatus(
  value: string | undefined
): LogoStatus | undefined {
  const normalized = value?.trim().toLowerCase()
  if (
    normalized === "verified" ||
    normalized === "missing" ||
    normalized === "needs_review"
  ) {
    return normalized
  }
  return undefined
}

function firstValue(...values: Array<string | undefined>) {
  return values.map(cleanDataArtifactValue).find(Boolean)
}

function uniqueValues(values: Array<string | undefined>) {
  return [
    ...new Set(values.map(cleanDataArtifactValue).filter(Boolean) as string[]),
  ]
}

function uniqueDelimitedValues(values: Array<string | undefined>) {
  return uniqueValues(values.flatMap((value) => value?.split(/\s*;\s*/)))
}

function mergeSuitability(left: Suitability, right: Suitability): Suitability {
  if (left === "yes" || right === "yes") return "yes"
  if (left === "no" || right === "no") return "no"
  return "unknown"
}

function makeProgrammeKey(
  programme: string | undefined,
  institution: string | undefined,
  awardLevel: string | undefined
) {
  return programmeOfferingIdentityKey({
    programmeName: programme,
    institutionName: institution,
    awardLevel: normalizeAwardLevel(awardLevel),
  })
}

function makeRequirementKey(
  programme: string | undefined,
  institution: string | undefined
) {
  return requirementIdentityKey({
    programmeName: programme,
    institutionName: institution,
  })
}

function makeProcessedProgrammeKey(programme: ProcessedProgramme) {
  if (programme.regulator === "TCU" && programme.programmeCode) {
    return ["tcu_code", programme.programmeCode].join("|")
  }

  return makeProgrammeKey(
    programme.normalizedProgrammeName,
    programme.normalizedInstitutionName,
    programme.awardLevel
  )
}

function detectProgrammeReviewReasons(row: Row) {
  const reasons: string[] = []
  const name = row.programme_name ?? ""

  if (/\b(in|of|and|with)$/i.test(name.trim())) {
    reasons.push("programme_name_looks_incomplete")
  }
  if (/\(in-?$/i.test(name.trim())) {
    reasons.push("programme_name_looks_incomplete")
  }
  if (/Bachelor (Degree )?of\s*$/i.test(name.trim())) {
    reasons.push("programme_name_looks_incomplete")
  }
  reasons.push(
    ...dataArtifactReviewReasons("programme_name", row.programme_name),
    ...dataArtifactReviewReasons(
      "minimum_entry_requirements",
      row.minimum_entry_requirements
    ),
    ...dataArtifactReviewReasons(
      "raw_requirement_text",
      row.raw_requirement_text
    )
  )
  if ((row.award_level ?? "").trim().toLowerCase() === "unknown") {
    reasons.push("unknown_award_level")
  }
  if (
    !blankToUndefined(row.minimum_entry_requirements) &&
    !blankToUndefined(row.raw_requirement_text)
  ) {
    reasons.push("missing_entry_requirements")
  }
  if (!blankToUndefined(row.duration)) {
    reasons.push("missing_duration")
  }

  return reasons
}

function detectInstitutionReviewReasons(row: Row) {
  const reasons: string[] = []

  if (!blankToUndefined(row.region)) {
    reasons.push("missing_region")
  }
  if (!blankToUndefined(row.registration_number)) {
    reasons.push("missing_registration_number")
  }
  if (normalizeConfidence(row.confidence_level) !== "high") {
    reasons.push("not_high_confidence")
  }
  reasons.push(
    ...dataArtifactReviewReasons("institution_name", row.institution_name),
    ...dataArtifactReviewReasons("region", row.region)
  )

  return reasons
}

function requirementRouteSummary(requirements: ProcessedEntryRequirement[]) {
  const summarize = (
    selector: (requirement: ProcessedEntryRequirement) => Suitability
  ): Suitability => {
    if (requirements.some((requirement) => selector(requirement) === "yes"))
      return "yes"
    if (
      requirements.length > 0 &&
      requirements.every((requirement) => selector(requirement) === "no")
    )
      return "no"
    return "unknown"
  }

  const routeFlags = {
    acceptsFormFourDirect: summarize(
      (requirement) => requirement.acceptsFormFourDirect
    ),
    acceptsFormSix: summarize((requirement) => requirement.acceptsFormSix),
    acceptsCertificate: summarize(
      (requirement) => requirement.acceptsCertificate
    ),
    acceptsDiploma: summarize((requirement) => requirement.acceptsDiploma),
    acceptsEquivalent: summarize(
      (requirement) => requirement.acceptsEquivalent
    ),
  }
  const routeTypes = acceptedApplicantPathwayLabels(routeFlags)

  return {
    ...routeFlags,
    rawRequirementText: uniqueValues(
      requirements.map((requirement) => requirement.rawRequirementText)
    )
      .slice(0, 5)
      .join(" || "),
    requiredSubjects: uniqueDelimitedValues(
      requirements.map((requirement) => requirement.requiredSubjects)
    ).join("; "),
    entryRouteTypes: routeTypes.join("; "),
  }
}

// One programme row from the TCU secondary-qualifications guidebook, with its
// institution heading resolved to a processed institution record.
type GuidebookProgramme = {
  row: Row
  programmeCode?: string
  programmeCodeSource: "guidebook" | "pathways_dataset" | "missing"
  programmeName: string
  normalizedProgrammeName: string
  heading: string
  institutionName: string
  normalizedInstitutionName: string
  campusLocation?: string
  rawRequirementText: string
  minimumAdmissionPoints?: number
  minimumAdmissionPointsSubjectCount?: number
}

function parseOptionalNumber(value: string | undefined) {
  const text = blankToUndefined(value)
  if (!text) return undefined
  const parsed = Number(text)
  return Number.isFinite(parsed) ? parsed : undefined
}

function guidebookPointsNote(guidebook: GuidebookProgramme) {
  if (guidebook.minimumAdmissionPoints === undefined) return undefined
  return guidebook.minimumAdmissionPointsSubjectCount
    ? `TCU minimum admission points: ${guidebook.minimumAdmissionPoints} from ${guidebook.minimumAdmissionPointsSubjectCount} subjects.`
    : `TCU minimum admission points: ${guidebook.minimumAdmissionPoints}.`
}

function buildTcuExtractedProgrammeRow(guidebook: GuidebookProgramme): Row {
  const { row } = guidebook
  const reviewReasons = mergeReviewReasons([
    row.reviewReasons,
    row.needsReview === "yes" ? "pdf_extraction_needs_review" : undefined,
    guidebook.programmeCodeSource === "pathways_dataset"
      ? "tcu_programme_code_from_pathways_dataset"
      : undefined,
  ])

  return {
    programme_name: guidebook.programmeName,
    normalized_programme_name: guidebook.normalizedProgrammeName,
    programme_code: guidebook.programmeCode ?? "",
    award_level: "Bachelor Degree",
    qualification_level: "Bachelor Degree",
    pathway_type: "degree",
    field_category: inferFieldCategoryFromProgrammeName(
      guidebook.programmeName
    ),
    course_family: "",
    institution_name: guidebook.institutionName,
    normalized_institution_name: guidebook.normalizedInstitutionName,
    regulator: "TCU",
    institution_type: "Higher Education Institution",
    duration: cleanDataArtifactText(row.durationYears),
    study_mode: "full-time",
    campus_location: guidebook.campusLocation ?? "",
    admission_capacity: cleanDataArtifactText(row.admissionCapacity),
    minimum_admission_points: cleanDataArtifactText(row.minimumAdmissionPoints),
    minimum_admission_points_subjects: cleanDataArtifactText(
      row.minimumAdmissionPointsSubjects
    ),
    application_method:
      "Apply through TCU or the institution admissions system.",
    official_source_url: tcuSecondaryGuidebookUrl,
    source_type:
      "TCU 2025/2026 Bachelor degree admission guidebook - secondary school qualifications",
    confidence_level: row.needsReview === "yes" ? "medium" : "high",
    last_verified_date: "2026-04-28",
    notes: uniqueValues([
      `Direct PDF extraction from page ${row.page} (${guidebook.heading}).`,
      guidebookPointsNote(guidebook),
    ]).join(" "),
    needs_review: reviewReasons.length > 0 ? "yes" : "no",
    review_reasons: reviewReasons.join("; "),
    minimum_entry_requirements: guidebook.rawRequirementText,
  }
}

function buildTcuExtractedEntryRequirement(
  guidebook: GuidebookProgramme
): ProcessedEntryRequirement {
  const { row } = guidebook
  const rawRequirementText = guidebook.rawRequirementText
  const principalPassMatch = rawRequirementText.match(
    /\b(One|Two|Three|\d+)\s+principal\s+passes?/i
  )

  return {
    programmeName: guidebook.programmeName,
    normalizedProgrammeName: guidebook.normalizedProgrammeName,
    institutionName: guidebook.institutionName,
    normalizedInstitutionName: guidebook.normalizedInstitutionName,
    rawRequirementText,
    acceptsFormFourDirect: "no",
    acceptsFormSix: "yes",
    acceptsCertificate: "no",
    acceptsDiploma: "no",
    acceptsEquivalent: "unknown",
    minimumAcseePrincipalPassesIfAvailable: principalPassMatch?.[1],
    minimumPointsIfAvailable: blankToUndefined(row.minimumAdmissionPoints),
    bridgeOrFoundationRequired: "unknown",
    eligibilityConfidence: row.needsReview === "yes" ? "medium" : "high",
    officialSourceUrl: tcuSecondaryGuidebookUrl,
    notes: uniqueValues([
      `Direct PDF extraction from page ${row.page} (${guidebook.heading}).`,
      guidebook.programmeCode
        ? `Programme code: ${guidebook.programmeCode}.`
        : undefined,
      guidebookPointsNote(guidebook),
    ]).join(" "),
    searchText: [
      guidebook.programmeName,
      guidebook.normalizedProgrammeName,
      guidebook.institutionName,
      guidebook.normalizedInstitutionName,
      rawRequirementText,
      guidebook.programmeCode,
    ]
      .filter(Boolean)
      .join(" "),
  }
}

const udsmMainCampusUnits = new Set([
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

const udsmProspectusSupplementProgrammes = new Set([
  "University of Dar es Salaam (UDSM)|BA in History and Political Science",
  "University of Dar es Salaam (UDSM)|BA with Education (Chinese and English)",
  "University of Dar es Salaam (UDSM)|BA in Statistics",
  "University of Dar es Salaam (UDSM)|Bachelor of Education in Adult and Community Education",
  "University of Dar es Salaam (UDSM)|Bachelor of Education in Commerce",
  "University of Dar es Salaam (UDSM)|Bachelor of Education in Psychology",
  "Dar es Salaam University College of Education (DUCE)|Bachelor of Education in Arts",
  "Dar es Salaam University College of Education (DUCE)|Bachelor of Education in Science",
  "Dar es Salaam University College of Education (DUCE)|Bachelor of Arts with Education",
  "Dar es Salaam University College of Education (DUCE)|Bachelor of Science with Education",
  "Dar es Salaam University College of Education (DUCE)|Bachelor of Arts in Disaster Risk Management",
  "Mkwawa University College of Education (MUCE)|Bachelor of Education in Arts",
  "Mkwawa University College of Education (MUCE)|Bachelor of Education in Science",
  "Mbeya College of Health and Allied Sciences (MCHAS)|Doctor of Medicine",
  "Mbeya College of Health and Allied Sciences (MCHAS)|Doctor of Dental Surgery",
  "MINERAL RESOURCES INSTITUTE (MADINI INSTITUTE) - DODOMA|Technician Certificate in Geology and Mineral Exploration",
  "MINERAL RESOURCES INSTITUTE (MADINI INSTITUTE) - DODOMA|Technician Certificate in Petroleum Geosciences",
  "MINERAL RESOURCES INSTITUTE (MADINI INSTITUTE) - DODOMA|Technician Certificate in Mining Engineering",
  "MINERAL RESOURCES INSTITUTE (MADINI INSTITUTE) - DODOMA|Technician Certificate in Mineral Processing Engineering",
  "MINERAL RESOURCES INSTITUTE (MADINI INSTITUTE) - DODOMA|Technician Certificate in Environmental Engineering and Management in Mines",
  "MINERAL RESOURCES INSTITUTE (MADINI INSTITUTE) - DODOMA|Technician Certificate Land and Mine Surveying",
  "MINERAL RESOURCES INSTITUTE (MADINI INSTITUTE) - DODOMA|Basic Certificate in Geology and Mineral Exploration",
  "MINERAL RESOURCES INSTITUTE (MADINI INSTITUTE) - DODOMA|Basic Certificate in Petroleum Geosciences",
  "MINERAL RESOURCES INSTITUTE (MADINI INSTITUTE) - DODOMA|Basic Certificate in Mining Engineering",
  "MINERAL RESOURCES INSTITUTE (MADINI INSTITUTE) - DODOMA|Basic Certificate in Mineral Processing Engineering",
  "MINERAL RESOURCES INSTITUTE (MADINI INSTITUTE) - DODOMA|Basic Certificate in Environmental Engineering and Management in Mines",
  "MINERAL RESOURCES INSTITUTE (MADINI INSTITUTE) - DODOMA|Basic Certificate Land and Mine Surveying",
])

function udsmProspectusInstitutionName(row: Row) {
  const academicUnit = cleanDataArtifactText(row.academic_unit)

  if (udsmMainCampusUnits.has(academicUnit))
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

function isUdsmProspectusSupplementRow(row: Row) {
  return udsmProspectusSupplementProgrammes.has(
    `${udsmProspectusInstitutionName(row)}|${cleanDataArtifactText(row.programme_name)}`
  )
}

function normalizeUdsmProspectusAwardLevel(row: Row) {
  const awardLevel = cleanDataArtifactText(row.award_level)
  if (/diploma/i.test(awardLevel)) return "Ordinary Diploma"
  if (/certificate/i.test(awardLevel)) return "Certificate"
  return "Bachelor Degree"
}

function buildUdsmProspectusProgrammeRow(row: Row): Row {
  const programmeName = cleanDataArtifactText(row.programme_name)
  const institutionName = udsmProspectusInstitutionName(row)
  const awardLevel = normalizeUdsmProspectusAwardLevel(row)
  const academicUnit = cleanDataArtifactText(row.academic_unit)
  const reviewReasons = uniqueValues([
    "udsm_prospectus_supplement",
    "missing_tcu_programme_code",
    "entry_requirements_not_extracted_from_prospectus",
    institutionName.includes("DUCE")
      ? "tcu_pdf_extraction_misassigned_duce_row"
      : undefined,
  ])

  return {
    programme_name: programmeName,
    normalized_programme_name: normalizeName(programmeName),
    award_level: awardLevel,
    qualification_level: awardLevel,
    pathway_type: cleanDataArtifactText(row.pathway_type) || "degree",
    field_category: inferFieldCategoryFromProgrammeName(programmeName),
    course_family: "",
    institution_name: institutionName,
    normalized_institution_name: normalizeName(institutionName),
    regulator: awardLevel === "Bachelor Degree" ? "TCU" : "NACTVET",
    institution_type:
      awardLevel === "Bachelor Degree"
        ? "Higher Education Institution"
        : "Technical Institution",
    study_mode: "full-time",
    campus_location: academicUnit,
    official_source_url: udsmUndergraduateProspectusSource,
    source_type: "UDSM Undergraduate Prospectus 2024/2025 programme list",
    confidence_level: "medium",
    last_verified_date: "2026-04-28",
    notes: uniqueValues([
      `Extracted from UDSM undergraduate prospectus page ${cleanDataArtifactText(row.printed_page)}.`,
      academicUnit ? `Academic unit: ${academicUnit}.` : undefined,
      cleanDataArtifactText(row.notes),
    ]).join(" "),
    needs_review: "yes",
    review_reasons: reviewReasons.join("; "),
  }
}

const legacyInstitutions = readCsv(join(legacyBaseDir, "institutions.csv"))
const legacyProgrammes = readCsv(join(legacyBaseDir, "programmes.csv"))
const nactvetInstitutions = readCsv(
  join(nactvetEnrichmentDir, "institutions.csv")
)
const nactvetProgrammes = readCsv(join(nactvetEnrichmentDir, "programmes.csv"))
const pathwayInstitutions = readCsvIfExists(
  join(pathwaysDir, "institutions.csv")
)
const pathwayProgrammes = readCsvIfExists(join(pathwaysDir, "programmes.csv"))
const pathwayEntryRequirements = readCsvIfExists(
  join(pathwaysDir, "entry_requirements.csv")
)
const pathwayInstitutionEnrichment = readCsvIfExists(
  join(pathwaysDir, "institution_enrichment.csv")
)
const logoEnrichment = existsSync(logoEnrichmentPath)
  ? readCsv(logoEnrichmentPath)
  : []
const tcuSecondaryExtractedProgrammes = readCsvIfExists(
  tcuSecondaryExtractedProgrammesPath
)
const udsmProspectusProgrammes = readCsvIfExists(udsmProspectusProgrammesPath)
const tcuGuidebookRows = tcuSecondaryExtractedProgrammes.filter(
  (row) =>
    blankToUndefined(row.programmeName) && blankToUndefined(row.institutionName)
)
const udsmProspectusSupplementRows = udsmProspectusProgrammes.filter(
  isUdsmProspectusSupplementRow
)

const nactvetInstitutionsByName = new Map(
  nactvetInstitutions.map((row) => [normalizeName(row.institution_name), row])
)
const nactvetProgrammesByKey = new Map(
  nactvetProgrammes.map((row) => [
    makeProgrammeKey(
      row.normalized_programme_name,
      row.institution_name,
      row.award_level
    ),
    row,
  ])
)
const pathwayEnrichmentByName = new Map(
  pathwayInstitutionEnrichment.map((row) => [
    normalizeName(row.normalized_institution_name),
    row,
  ])
)
const verifiedLogoByName = new Map(
  logoEnrichment
    .filter(
      (row) =>
        normalizeLogoStatus(row.logo_status) === "verified" &&
        blankToUndefined(row.logo_url)
    )
    .map((row) => [normalizeName(row.normalized_institution_name), row])
)
const verifiedLogoByCandidate = new Map<string, Row>()
for (const row of logoEnrichment.filter(
  (entry) =>
    normalizeLogoStatus(entry.logo_status) === "verified" &&
    blankToUndefined(entry.logo_url)
)) {
  for (const candidate of institutionNameCandidates(
    firstValue(row.normalized_institution_name, row.institution_name)
  )) {
    if (!verifiedLogoByCandidate.has(candidate)) {
      verifiedLogoByCandidate.set(candidate, row)
    }
  }
}

function findVerifiedLogo(
  normalizedInstitutionName: string,
  institutionName: string
) {
  return (
    verifiedLogoByName.get(normalizedInstitutionName) ??
    institutionNameCandidates(institutionName)
      .map((candidate) => verifiedLogoByCandidate.get(candidate))
      .find(Boolean)
  )
}

const pathwayProcessedEntryRequirements: ProcessedEntryRequirement[] =
  pathwayEntryRequirements.map((row) => {
    const programmeName = cleanProgrammeNameForRow(row)
    const institutionName = cleanDataArtifactText(row.institution_name)
    const normalizedProgrammeName = normalizedProgrammeNameForRow(
      row,
      programmeName
    )
    const normalizedInstitutionName =
      blankToUndefined(row.normalized_institution_name) ??
      normalizeName(institutionName)

    return {
      programmeName,
      normalizedProgrammeName,
      institutionName,
      normalizedInstitutionName,
      rawRequirementText: cleanRequirementTextForRow(row),
      acceptsFormFourDirect: normalizeSuitability(row.accepts_form_four_direct),
      acceptsFormSix: normalizeSuitability(row.accepts_form_six),
      acceptsCertificate: normalizeSuitability(row.accepts_certificate),
      acceptsDiploma: normalizeDiplomaSuitability(row),
      acceptsEquivalent: normalizeSuitability(row.accepts_equivalent),
      minimumCseeDivisionIfAvailable: blankToUndefined(
        row.minimum_csee_division_if_available
      ),
      minimumAcseePrincipalPassesIfAvailable: blankToUndefined(
        row.minimum_acsee_principal_passes_if_available
      ),
      minimumPointsIfAvailable: blankToUndefined(
        row.minimum_points_if_available
      ),
      requiredSubjects: cleanDataArtifactValue(row.required_subjects),
      requiredSubjectGradesIfAvailable: cleanDataArtifactValue(
        row.required_subject_grades_if_available
      ),
      requiredPriorFieldIfAvailable: cleanDataArtifactValue(
        row.required_prior_field_if_available
      ),
      bridgeOrFoundationRequired: normalizeSuitability(
        row.bridge_or_foundation_required
      ),
      eligibilityConfidence: normalizeConfidence(row.eligibility_confidence),
      officialSourceUrl: cleanDataArtifactText(row.official_source_url),
      notes: cleanDataArtifactValue(row.notes),
      searchText: [
        programmeName,
        normalizedProgrammeName,
        institutionName,
        normalizedInstitutionName,
        cleanRequirementTextForRow(row),
        cleanDataArtifactText(row.required_subjects),
        cleanDataArtifactText(row.required_prior_field_if_available),
      ]
        .filter(Boolean)
        .join(" "),
    }
  })

function requirementRuleKey(
  normalizedProgrammeName: string | undefined,
  normalizedInstitutionName: string | undefined
) {
  return [
    normalizeName(normalizedProgrammeName),
    normalizeName(normalizedInstitutionName),
  ].join("||")
}

function buildRequirementRuleFromEntryRequirement(
  requirement: ProcessedEntryRequirement
): ProcessedRequirementRule {
  return buildRequirementRule({
    programmeName: requirement.programmeName,
    normalizedProgrammeName: requirement.normalizedProgrammeName,
    institutionName: requirement.institutionName,
    normalizedInstitutionName: requirement.normalizedInstitutionName,
    rawRequirementText: requirement.rawRequirementText,
    sourceUrl: requirement.officialSourceUrl,
    confidence: requirement.eligibilityConfidence,
    requiredSubjects: requirement.requiredSubjects,
    requiredSubjectGradesIfAvailable:
      requirement.requiredSubjectGradesIfAvailable,
    requiredPriorFieldIfAvailable: requirement.requiredPriorFieldIfAvailable,
    minimumCseeDivisionIfAvailable: requirement.minimumCseeDivisionIfAvailable,
    minimumAcseePrincipalPassesIfAvailable:
      requirement.minimumAcseePrincipalPassesIfAvailable,
    minimumPointsIfAvailable: requirement.minimumPointsIfAvailable,
    acceptsFormFourDirect: requirement.acceptsFormFourDirect,
    acceptsFormSix: requirement.acceptsFormSix,
    acceptsCertificate: requirement.acceptsCertificate,
    acceptsDiploma: requirement.acceptsDiploma,
    acceptsEquivalent: requirement.acceptsEquivalent,
  })
}

function buildRequirementRuleFromProgramme(
  programme: ProcessedProgramme
): ProcessedRequirementRule {
  const routeFlags = inferProgrammeRequirementRouteFlags(programme)

  return buildRequirementRule({
    programmeName: programme.programmeName,
    normalizedProgrammeName: programme.normalizedProgrammeName,
    institutionName: programme.institutionName,
    normalizedInstitutionName: programme.normalizedInstitutionName,
    rawRequirementText: programme.minimumEntryRequirements ?? "",
    sourceUrl: programme.officialSourceUrl,
    confidence: programme.confidenceLevel,
    requiredSubjects: programme.requiredSubjects,
    acceptsFormFourDirect: routeFlags.acceptsFormFourDirect,
    acceptsFormSix: routeFlags.acceptsFormSix,
    acceptsCertificate: routeFlags.acceptsCertificate,
    acceptsDiploma: routeFlags.acceptsDiploma,
    acceptsEquivalent: routeFlags.acceptsEquivalent,
  })
}

function buildRequirementRule(input: {
  programmeName: string
  normalizedProgrammeName: string
  institutionName: string
  normalizedInstitutionName: string
  rawRequirementText: string
  sourceUrl: string
  confidence: ConfidenceLevel
  requiredSubjects?: string
  requiredSubjectGradesIfAvailable?: string
  requiredPriorFieldIfAvailable?: string
  minimumCseeDivisionIfAvailable?: string
  minimumAcseePrincipalPassesIfAvailable?: string
  minimumPointsIfAvailable?: string
  acceptsFormFourDirect: Suitability
  acceptsFormSix: Suitability
  acceptsCertificate: Suitability
  acceptsDiploma: Suitability
  acceptsEquivalent: Suitability
}): ProcessedRequirementRule {
  const ruleSet = parseRequirementRuleSet({
    programmeKey: input.normalizedProgrammeName,
    institutionKey: input.normalizedInstitutionName,
    rawRequirementText: input.rawRequirementText,
    sourceUrl: input.sourceUrl,
    confidence: input.confidence,
    requiredSubjects: input.requiredSubjects,
    requiredSubjectGradesIfAvailable: input.requiredSubjectGradesIfAvailable,
    requiredPriorFieldIfAvailable: input.requiredPriorFieldIfAvailable,
    minimumCseeDivisionIfAvailable: input.minimumCseeDivisionIfAvailable,
    minimumAcseePrincipalPassesIfAvailable:
      input.minimumAcseePrincipalPassesIfAvailable,
    minimumPointsIfAvailable: input.minimumPointsIfAvailable,
    acceptsFormFourDirect: input.acceptsFormFourDirect,
    acceptsFormSix: input.acceptsFormSix,
    acceptsCertificate: input.acceptsCertificate,
    acceptsDiploma: input.acceptsDiploma,
    acceptsEquivalent: input.acceptsEquivalent,
  })

  return {
    ...ruleSet,
    programmeName: input.programmeName,
    normalizedProgrammeName: input.normalizedProgrammeName,
    institutionName: input.institutionName,
    normalizedInstitutionName: input.normalizedInstitutionName,
    searchText: [
      input.programmeName,
      input.normalizedProgrammeName,
      input.institutionName,
      input.normalizedInstitutionName,
      input.rawRequirementText,
      input.requiredSubjects,
      input.requiredPriorFieldIfAvailable,
      ruleSet.variants.map((variant) => variant.route).join(" "),
      ruleSet.variants.map((variant) => variant.parseStatus).join(" "),
    ]
      .filter(Boolean)
      .join(" "),
  }
}

function inferProgrammeRequirementRouteFlags(programme: ProcessedProgramme) {
  const requirementText = normalizeName(programme.minimumEntryRequirements)
  const entryRouteTypes = normalizeName(programme.entryRouteTypes)
  const combined = `${requirementText} ${entryRouteTypes}`
  const inferFromText = (
    current: Suitability,
    pattern: RegExp
  ): Suitability => {
    if (current !== "unknown") return current
    return pattern.test(combined) ? "yes" : "unknown"
  }

  return {
    acceptsFormFourDirect: inferFromText(
      programme.acceptsFormFourDirect,
      /\b(csee|certificate of secondary education|form four|ordinary level|o level)\b.*\b(at least|minimum|passes?)\b|\b(at least|minimum)\b.*\b(csee|certificate of secondary education|form four|ordinary level|o level)\b/
    ),
    acceptsFormSix: inferFromText(
      programme.acceptsFormSix,
      /\b(acsee|advanced certificate|form six|principal passes?)\b/
    ),
    acceptsCertificate: inferFromText(
      programme.acceptsCertificate,
      /\b(basic technician certificate|technician certificate|certificate nta level|holders? of certificate)\b/
    ),
    acceptsDiploma: inferFromText(
      programme.acceptsDiploma,
      /\b(diploma|nta level 6)\b/
    ),
    acceptsEquivalent: inferFromText(
      programme.acceptsEquivalent,
      /\b(equivalent|foundation certificate|full technician certificate|ftc)\b/
    ),
  }
}

function buildInstitution(
  row: Row,
  sourceDataset: string
): ProcessedInstitution {
  const enrichment = firstValue(row.normalized_institution_name)
    ? pathwayEnrichmentByName.get(
        normalizeName(row.normalized_institution_name)
      )
    : undefined
  const nactvetEnrichment = nactvetInstitutionsByName.get(
    normalizeName(row.institution_name)
  )
  const reviewReasons = mergeReviewReasons([
    ...detectInstitutionReviewReasons(row),
    row.review_reasons,
  ])

  const institutionName = cleanDataArtifactText(row.institution_name)
  const normalizedInstitutionName =
    blankToUndefined(row.normalized_institution_name) ??
    normalizeName(institutionName)
  const logoEnrichment = findVerifiedLogo(
    normalizedInstitutionName,
    institutionName
  )
  const region = firstValue(
    row.region,
    enrichment?.region,
    nactvetEnrichment?.region
  )
  const institutionType =
    firstValue(row.institution_type, nactvetEnrichment?.institution_category) ??
    "unknown"
  const ownershipType =
    firstValue(row.ownership_type, nactvetEnrichment?.ownership_type) ??
    "unknown"
  const aliases = institutionAliases(
    institutionName,
    row.registration_number,
    row.abbreviation_or_aliases
  )

  return {
    institutionName,
    normalizedInstitutionName,
    registrationNumber: firstValue(
      row.registration_number,
      nactvetEnrichment?.registration_number
    ),
    registrationNumberAsShown: firstValue(
      nactvetEnrichment?.registration_number_as_shown
    ),
    regulator:
      firstValue(row.regulator, nactvetEnrichment?.regulator) ?? "unknown",
    accreditationStatus: cleanDataArtifactValue(row.accreditation_status),
    ownershipType,
    institutionType,
    institutionCategory: firstValue(
      row.institution_category,
      nactvetEnrichment?.institution_category
    ),
    region,
    districtOrCouncil: firstValue(
      row.district_or_council,
      row["district/council"],
      nactvetEnrichment?.["district/council"]
    ),
    physicalLocation: firstValue(
      row.physical_location,
      nactvetEnrichment?.physical_location
    ),
    mainlandOrZanzibar: cleanDataArtifactValue(row.mainland_or_zanzibar),
    website: firstValue(
      row.website,
      enrichment?.website,
      nactvetEnrichment?.website,
      logoEnrichment?.website
    ),
    admissionsUrl: firstValue(row.admissions_url, enrichment?.admissions_url),
    applicationUrl: firstValue(
      row.application_url,
      enrichment?.application_url
    ),
    logoUrl: cleanDataArtifactValue(logoEnrichment?.logo_url),
    logoSourceUrl: cleanDataArtifactValue(logoEnrichment?.logo_source_url),
    logoStatus: normalizeLogoStatus(logoEnrichment?.logo_status),
    logoVerifiedAt: cleanDataArtifactValue(logoEnrichment?.last_checked_date),
    phoneNumbers: firstValue(
      row.phone_numbers,
      enrichment?.phone_numbers,
      nactvetEnrichment?.phone_numbers
    ),
    email: firstValue(row.email, enrichment?.email, nactvetEnrichment?.email),
    applicationMethod: firstValue(
      row.application_method,
      nactvetEnrichment?.application_method
    ),
    hasFormFourDirectProgramme: normalizeSuitability(
      nactvetEnrichment?.has_form_four_direct_programme
    ),
    officialSourceUrl:
      firstValue(
        row.official_source_url,
        nactvetEnrichment?.official_source_url
      ) ?? "",
    sourceType:
      firstValue(row.source_type, nactvetEnrichment?.source_type) ?? "unknown",
    sourceDatasets: [sourceDataset],
    confidenceLevel: normalizeConfidence(row.confidence_level),
    lastVerifiedDate:
      firstValue(
        row.last_verified_date,
        nactvetEnrichment?.last_verified_date
      ) ?? "",
    notes: firstValue(row.notes, enrichment?.notes, nactvetEnrichment?.notes),
    needsReview:
      normalizeBoolean(row.needs_review) || needsManualReview(reviewReasons),
    reviewReasons,
    searchText: [
      institutionName,
      normalizedInstitutionName,
      row.abbreviation_or_aliases,
      row.registration_number,
      row.regulator,
      institutionType,
      ownershipType,
      region,
      row.district_or_council,
      row.mainland_or_zanzibar,
      ...aliases,
    ]
      .filter(Boolean)
      .join(" "),
  }
}

function mergeInstitution(
  left: ProcessedInstitution,
  right: ProcessedInstitution
): ProcessedInstitution {
  return {
    ...left,
    registrationNumber: firstValue(
      left.registrationNumber,
      right.registrationNumber
    ),
    registrationNumberAsShown: firstValue(
      left.registrationNumberAsShown,
      right.registrationNumberAsShown
    ),
    accreditationStatus: firstValue(
      left.accreditationStatus,
      right.accreditationStatus
    ),
    ownershipType:
      firstValue(left.ownershipType, right.ownershipType) ?? "unknown",
    institutionType:
      firstValue(left.institutionType, right.institutionType) ?? "unknown",
    institutionCategory: firstValue(
      left.institutionCategory,
      right.institutionCategory
    ),
    region: firstValue(left.region, right.region),
    districtOrCouncil: firstValue(
      left.districtOrCouncil,
      right.districtOrCouncil
    ),
    physicalLocation: firstValue(left.physicalLocation, right.physicalLocation),
    mainlandOrZanzibar: firstValue(
      left.mainlandOrZanzibar,
      right.mainlandOrZanzibar
    ),
    website: firstValue(left.website, right.website),
    admissionsUrl: firstValue(left.admissionsUrl, right.admissionsUrl),
    applicationUrl: firstValue(left.applicationUrl, right.applicationUrl),
    logoUrl: firstValue(left.logoUrl, right.logoUrl),
    logoSourceUrl: firstValue(left.logoSourceUrl, right.logoSourceUrl),
    logoStatus: left.logoStatus ?? right.logoStatus,
    logoVerifiedAt: firstValue(left.logoVerifiedAt, right.logoVerifiedAt),
    phoneNumbers: firstValue(left.phoneNumbers, right.phoneNumbers),
    email: firstValue(left.email, right.email),
    applicationMethod: firstValue(
      left.applicationMethod,
      right.applicationMethod
    ),
    hasFormFourDirectProgramme: mergeSuitability(
      left.hasFormFourDirectProgramme,
      right.hasFormFourDirectProgramme
    ),
    officialSourceUrl:
      firstValue(left.officialSourceUrl, right.officialSourceUrl) ?? "",
    sourceDatasets: uniqueValues([
      ...left.sourceDatasets,
      ...right.sourceDatasets,
    ]),
    confidenceLevel:
      left.confidenceLevel === "high"
        ? left.confidenceLevel
        : right.confidenceLevel,
    lastVerifiedDate:
      firstValue(left.lastVerifiedDate, right.lastVerifiedDate) ?? "",
    notes: uniqueValues([left.notes, right.notes]).join(" || ") || undefined,
    needsReview: left.needsReview || right.needsReview,
    reviewReasons: mergeReviewReasons([
      ...left.reviewReasons,
      ...right.reviewReasons,
    ]),
    searchText: uniqueValues([left.searchText, right.searchText]).join(" "),
  }
}

const institutionsByName = new Map<string, ProcessedInstitution>()
const institutionCandidateToPrimaryName = new Map<string, string>()

function registerInstitutionCandidates(institution: ProcessedInstitution) {
  for (const candidate of institutionNameCandidates(
    institution.institutionName
  )) {
    const existing = institutionCandidateToPrimaryName.get(candidate)
    if (existing && existing !== institution.normalizedInstitutionName) {
      institutionCandidateToPrimaryName.delete(candidate)
    } else if (!existing) {
      institutionCandidateToPrimaryName.set(
        candidate,
        institution.normalizedInstitutionName
      )
    }
  }
}

// Institution rows whose "name" is a fragment of guidebook prose, e.g.
// "Open University of Tanzania (OUT) are advised not to apply".
const droppedProseInstitutions = [
  ...pathwayInstitutions,
  ...legacyInstitutions,
].filter((row) => isProseInstitutionName(row.institution_name))
// Alias names of duplicate institution records that were merged into a
// primary record, so programmes that still use the alias resolve to it.
const institutionAliasNames = new Map<string, Set<string>>()
const mergedDuplicateInstitutions: Array<{
  duplicate: string
  mergedInto: string
}> = []

function institutionAbbreviation(name: string) {
  return normalizeName(name.match(/\(([^)]+)\)/)?.[1])
}

function significantInstitutionTokens(name: string) {
  return new Set(
    normalizeName(name.replace(/\([^)]*\)/g, " ").replace(/(\w)-(\w)/g, "$1$2"))
      .split(" ")
      .filter(
        (token) =>
          token.length > 2 &&
          !/^(the|and|for|university|college|institute|centre|center|tanzania)$/.test(
            token
          )
      )
  )
}

// Legacy rows sometimes repeat a TCU institution under a variant name
// ("College of African Wildlife Management Mweka (CAWM)", "Center for
// Foreign Relations (CFR)"). Merge them into the record that carries the same
// abbreviation when neither name is a campus/branch.
function findAbbreviationDuplicate(institution: ProcessedInstitution) {
  const abbreviation = institutionAbbreviation(institution.institutionName)
  if (abbreviation.length < 2) return undefined
  if (institution.regulator !== "TCU") return undefined
  if (/\bcampus\b|\)\s*[-–]|\s-\s/i.test(institution.institutionName))
    return undefined

  const tokens = significantInstitutionTokens(institution.institutionName)
  const candidates = [...institutionsByName.entries()].sort(
    ([, a], [, b]) =>
      Number(b.regulator === "TCU") - Number(a.regulator === "TCU")
  )
  return candidates.find(([, existing]) => {
    if (
      existing.normalizedInstitutionName ===
      institution.normalizedInstitutionName
    )
      return false
    if (institutionAbbreviation(existing.institutionName) !== abbreviation)
      return false
    if (/\bcampus\b|\)\s*[-–]|\s-\s/i.test(existing.institutionName))
      return false
    const shared = [
      ...significantInstitutionTokens(existing.institutionName),
    ].filter((token) => tokens.has(token)).length
    const compatible = compatibleInstitutionIdentityKeys(
      existing.institutionName.replace(/\([^)]*\)/g, " "),
      institution.institutionName.replace(/\([^)]*\)/g, " ")
    )
    return compatible || (existing.regulator === "TCU" && shared >= 2)
  })?.[0]
}

for (const institution of [
  ...pathwayInstitutions
    .filter((row) => !isProseInstitutionName(row.institution_name))
    .map((row) => buildInstitution(row, "education_pathways")),
  ...legacyInstitutions
    .filter((row) => !isProseInstitutionName(row.institution_name))
    .map((row) => buildInstitution(row, "post_form_four")),
]) {
  const candidateKey =
    institutionCandidateToPrimaryName.get(
      institution.normalizedInstitutionName
    ) ??
    institutionNameCandidates(institution.institutionName)
      .map((candidate) => institutionCandidateToPrimaryName.get(candidate))
      .find(Boolean)
  const duplicateKey = candidateKey
    ? undefined
    : findAbbreviationDuplicate(institution)
  if (duplicateKey) {
    mergedDuplicateInstitutions.push({
      duplicate: institution.institutionName,
      mergedInto: institutionsByName.get(duplicateKey)!.institutionName,
    })
    const aliases = institutionAliasNames.get(duplicateKey) ?? new Set()
    aliases.add(institution.institutionName)
    institutionAliasNames.set(duplicateKey, aliases)
  }
  const existingKey =
    candidateKey ?? duplicateKey ?? institution.normalizedInstitutionName
  const existing = institutionsByName.get(existingKey)
  institutionsByName.set(
    existingKey,
    existing ? mergeInstitution(existing, institution) : institution
  )
  registerInstitutionCandidates(institutionsByName.get(existingKey)!)
}

const processedInstitutions = [...institutionsByName.values()]

// Resolve every guidebook institution heading to a processed institution.
// Branch campuses without their own record get one built from the heading.
const guidebookHeadings = uniqueValues(
  tcuGuidebookRows.map((row) => row.institutionName)
)
const guidebookInstitutionResolutions = resolveGuidebookInstitutions(
  guidebookHeadings,
  processedInstitutions
)
const createdGuidebookInstitutions: ProcessedInstitution[] = []

function buildGuidebookCampusInstitution(
  heading: string,
  sibling: ProcessedInstitution | undefined
): ProcessedInstitution {
  const parsed = parseGuidebookHeading(heading)
  const institutionName = heading
  const normalizedInstitutionName = normalizeName(institutionName)
  const region = cleanDataArtifactValue(
    parsed.location?.replace(/\b(campus|centre|center|college)\b/gi, " ")
  )
  const reviewReasons = [
    "institution_created_from_tcu_guidebook_heading",
    "missing_registration_number",
  ]

  return {
    institutionName,
    normalizedInstitutionName,
    regulator: "TCU",
    ownershipType: sibling?.ownershipType ?? "unknown",
    institutionType: "Higher Education Institution",
    region,
    physicalLocation: parsed.location,
    mainlandOrZanzibar: sibling?.mainlandOrZanzibar,
    website: sibling?.website,
    hasFormFourDirectProgramme: "unknown",
    officialSourceUrl: tcuSecondaryGuidebookUrl,
    sourceType:
      "TCU 2025/2026 Bachelor degree admission guidebook - secondary school qualifications",
    sourceDatasets: ["tcu_secondary_guidebook_pdf_extraction"],
    confidenceLevel: "medium",
    lastVerifiedDate: "2026-04-28",
    needsReview: true,
    reviewReasons,
    searchText: [
      institutionName,
      normalizedInstitutionName,
      parsed.abbreviation,
      "TCU",
      region,
    ]
      .filter(Boolean)
      .join(" "),
  }
}

for (const [heading, resolution] of guidebookInstitutionResolutions) {
  if (resolution.institution) continue
  const sibling = [...guidebookInstitutionResolutions.values()].find(
    (other) =>
      other.institution &&
      !other.isBranch &&
      normalizeName(other.heading.baseName) ===
        normalizeName(resolution.heading.baseName)
  )?.institution
  const created = buildGuidebookCampusInstitution(heading, sibling)
  createdGuidebookInstitutions.push(created)
  processedInstitutions.push(created)
  resolution.institution = created
}

const institutionByName = new Map<string, ProcessedInstitution>()
for (const institution of processedInstitutions) {
  const candidates = [
    institution.normalizedInstitutionName,
    ...institutionNameCandidates(institution.institutionName),
  ]

  for (const candidate of candidates) {
    if (!institutionByName.has(candidate)) {
      institutionByName.set(candidate, institution)
    }
  }
}
for (const [primaryKey, aliases] of institutionAliasNames) {
  const institution = institutionsByName.get(primaryKey)
  if (!institution) continue
  for (const alias of aliases) {
    for (const candidate of [
      normalizeName(alias),
      ...institutionNameCandidates(alias),
    ]) {
      if (!institutionByName.has(candidate)) {
        institutionByName.set(candidate, institution)
      }
    }
  }
}

function resolveInstitutionForRow(row: Row) {
  return uniqueValues([
    firstValue(row.normalized_institution_name, row.institution_name),
    row.institution_name,
  ])
    .flatMap((name) => institutionNameCandidates(name))
    .map((candidate) => institutionByName.get(candidate))
    .find(Boolean)
}

function isTcuDegreeRow(row: Row) {
  return (
    /TCU/i.test(row.regulator ?? "") &&
    normalizeAwardLevel(row.award_level) === "degree"
  )
}

// Pathway rows carry TCU programme codes for some programmes whose guidebook
// row prints no code (e.g. MWECAU "Bachelor of Arts in Social Work and Human
// Rights", MW015).
const guidebookPrintedCodes = new Set(
  tcuGuidebookRows
    .map((row) => normalizeTcuProgrammeCode(row.programmeCode))
    .filter(Boolean) as string[]
)
const pathwayCodesByIdentity = new Map<string, Set<string>>()
for (const row of pathwayProgrammes) {
  const code = normalizeTcuProgrammeCode(row.programme_code)
  if (!code || guidebookPrintedCodes.has(code) || !isTcuDegreeRow(row)) continue
  const institution = resolveInstitutionForRow(row)
  if (!institution) continue
  const key = makeRequirementKey(
    cleanProgrammeNameForRow(row),
    institution.normalizedInstitutionName
  )
  pathwayCodesByIdentity.set(
    key,
    (pathwayCodesByIdentity.get(key) ?? new Set()).add(code)
  )
}

const guidebookTitleRepair = createSplitWordRepairer(
  tcuGuidebookRows.flatMap((row) => [
    row.programmeName,
    row.admissionRequirements,
  ])
)

// Titles of TCU degree rows from other datasets: rejoin split words using the
// guidebook vocabulary and drop dangling punctuation ("... Forwarding.").
function tidyTcuProgrammeTitle(name: string) {
  return guidebookTitleRepair(name)
    .replace(/[\s.,;:'’"]+$/g, "")
    .replace(/\s+/g, " ")
    .trim()
}

const guidebookProgrammes: GuidebookProgramme[] = tcuGuidebookRows.map(
  (row) => {
    const resolution = guidebookInstitutionResolutions.get(row.institutionName)!
    const institution = resolution.institution!
    const programmeName = cleanDataArtifactText(row.programmeName)
    const printedCode = normalizeTcuProgrammeCode(row.programmeCode)
    const pathwayCodes = printedCode
      ? undefined
      : pathwayCodesByIdentity.get(
          makeRequirementKey(
            programmeName,
            institution.normalizedInstitutionName
          )
        )
    const pathwayCode =
      pathwayCodes && pathwayCodes.size === 1 ? [...pathwayCodes][0] : undefined

    return {
      row,
      programmeCode: printedCode ?? pathwayCode,
      programmeCodeSource: printedCode
        ? "guidebook"
        : pathwayCode
          ? "pathways_dataset"
          : "missing",
      programmeName,
      normalizedProgrammeName: normalizeName(programmeName),
      heading: row.institutionName,
      institutionName: institution.institutionName,
      normalizedInstitutionName: institution.normalizedInstitutionName,
      campusLocation: resolution.isBranch
        ? resolution.heading.location
        : undefined,
      rawRequirementText: cleanDataArtifactText(row.admissionRequirements),
      minimumAdmissionPoints: parseOptionalNumber(row.minimumAdmissionPoints),
      minimumAdmissionPointsSubjectCount: parseOptionalNumber(
        row.minimumAdmissionPointsSubjects
      ),
    }
  }
)
const titleLeakRecoveries: Array<{
  programmeCode: string
  sourceTitle: string
}> = []
const guidebookProgrammesByCode = new Map(
  guidebookProgrammes
    .filter((programme) => programme.programmeCode)
    .map((programme) => [programme.programmeCode!, programme])
)
// Coded guidebook rows indexed by programme identity, used to give uncoded
// TCU degree rows from other sources their guidebook code.
const guidebookCodesByIdentity = new Map<string, Set<string>>()
for (const programme of guidebookProgrammes) {
  if (!programme.programmeCode) continue
  const key = makeRequirementKey(
    programme.programmeName,
    programme.normalizedInstitutionName
  )
  guidebookCodesByIdentity.set(
    key,
    (guidebookCodesByIdentity.get(key) ?? new Set()).add(
      programme.programmeCode
    )
  )
}

const guidebookEntryRequirements = guidebookProgrammes
  .filter(
    (programme) => programme.programmeCode && programme.rawRequirementText
  )
  .map(buildTcuExtractedEntryRequirement)
const guidebookEntryRequirementSet = new Set(guidebookEntryRequirements)
let processedEntryRequirements: ProcessedEntryRequirement[] = [
  ...pathwayProcessedEntryRequirements,
  ...guidebookEntryRequirements,
]

const requirementsByProgramme = new Map<string, ProcessedEntryRequirement[]>()
for (const requirement of processedEntryRequirements) {
  const key = makeRequirementKey(
    requirement.normalizedProgrammeName,
    requirement.normalizedInstitutionName
  )
  requirementsByProgramme.set(key, [
    ...(requirementsByProgramme.get(key) ?? []),
    requirement,
  ])
}

function buildProgramme(row: Row, sourceDataset: string): ProcessedProgramme {
  const awardLevel = normalizeAwardLevel(row.award_level)
  const nactvetEnrichment = nactvetProgrammesByKey.get(
    makeProgrammeKey(
      row.normalized_programme_name,
      row.institution_name,
      row.award_level
    )
  )
  const institution = resolveInstitutionForRow(row)
  const rawNormalizedInstitutionName =
    blankToUndefined(row.normalized_institution_name) ??
    normalizeName(row.institution_name)
  const normalizedInstitutionName =
    institution?.normalizedInstitutionName ?? rawNormalizedInstitutionName
  const rawProgrammeName = cleanProgrammeNameForRow(row)
  const rawNormalizedProgrammeName = normalizedProgrammeNameForRow(
    row,
    rawProgrammeName
  )
  const tcuCode = tcuProgrammeCodeForRow(
    row,
    rawProgrammeName,
    normalizedInstitutionName
  )
  // A title that leaked its code and requirement prose ("... DM079 Two
  // principal passes ...") is replaced by the guidebook title for that code.
  const leakRepairName =
    tcuCode?.source === "title_leak"
      ? guidebookProgrammesByCode.get(tcuCode.code)?.programmeName
      : undefined
  const tidiedTcuName =
    !leakRepairName && isTcuDegreeRow(row)
      ? tidyTcuProgrammeTitle(rawProgrammeName)
      : undefined
  const programmeName = leakRepairName ?? tidiedTcuName ?? rawProgrammeName
  const normalizedProgrammeName =
    programmeName === rawProgrammeName
      ? rawNormalizedProgrammeName
      : normalizeName(programmeName)
  const fieldCategory = normalizeFieldCategory(row.field_category)
  const institutionLogo =
    institution?.logoStatus === "verified" ? institution : undefined
  const requirementKey = makeRequirementKey(
    rawNormalizedProgrammeName,
    rawNormalizedInstitutionName
  )
  const requirements = requirementsByProgramme.get(requirementKey) ?? []
  const routeSummary = requirementRouteSummary(requirements)
  const legacyFormFourSuitability = normalizeSuitability(
    row.suitable_for_form_four_leaver
  )
  const keywordData = buildProgrammeKeywordPack({
    fieldCategory,
    programmeName,
    courseFamily: row.course_family,
  })
  const rawReviewReasons = mergeReviewReasons([
    ...detectProgrammeReviewReasons(row),
    row.review_reasons,
  ])
  const recoveredEmbeddedProgrammeCode =
    !blankToUndefined(row.programme_code) &&
    Boolean(embeddedTcuProgrammeCode(row))
  const reviewReasons = routeSummary.rawRequirementText
    ? rawReviewReasons.filter(
        (reason) =>
          reason !== "missing_entry_requirements" &&
          !(
            recoveredEmbeddedProgrammeCode &&
            reason === "programme code not confidently parsed"
          )
      )
    : rawReviewReasons.filter(
        (reason) =>
          !(
            recoveredEmbeddedProgrammeCode &&
            reason === "programme code not confidently parsed"
          )
      )
  const rowNeedsReview =
    normalizeBoolean(row.needs_review) &&
    !(recoveredEmbeddedProgrammeCode && reviewReasons.length === 0)
  const institutionSearchAliases = institutionAliases(
    row.institution_name,
    row.institution_registration_number
  )

  return {
    programmeName,
    normalizedProgrammeName,
    programmeCode: tcuCode?.code ?? programmeCodeForRow(row),
    awardLevel,
    qualificationLevel: blankToUndefined(row.qualification_level),
    pathwayType: blankToUndefined(row.pathway_type),
    fieldCategory,
    courseFamily: keywordData.courseFamily,
    institutionName: cleanDataArtifactText(row.institution_name),
    normalizedInstitutionName,
    institutionRegistrationNumber: firstValue(
      row.institution_registration_number,
      nactvetEnrichment?.institution_registration_number
    ),
    regulator: firstValue(row.regulator, institution?.regulator) ?? "unknown",
    institutionType: firstValue(
      row.institution_type,
      institution?.institutionType
    ),
    ownershipType: firstValue(row.ownership_type, institution?.ownershipType),
    region: firstValue(row.region, institution?.region),
    districtOrCouncil: firstValue(
      row.district_or_council,
      institution?.districtOrCouncil
    ),
    institutionLogoUrl: institutionLogo?.logoUrl,
    institutionLogoSourceUrl: institutionLogo?.logoSourceUrl,
    institutionWebsite: institution?.website,
    minimumEntryRequirements: firstValue(
      row.minimum_entry_requirements,
      routeSummary.rawRequirementText,
      nactvetEnrichment?.minimum_entry_requirements
    ),
    requiredSubjects: firstValue(
      row.required_subjects,
      routeSummary.requiredSubjects,
      nactvetEnrichment?.required_subjects
    ),
    suitableForFormFourLeaver: mergeSuitability(
      legacyFormFourSuitability,
      routeSummary.acceptsFormFourDirect
    ),
    acceptsFormSix: routeSummary.acceptsFormSix,
    acceptsCertificate: routeSummary.acceptsCertificate,
    acceptsDiploma: routeSummary.acceptsDiploma,
    acceptsEquivalent: routeSummary.acceptsEquivalent,
    duration: firstValue(row.duration, nactvetEnrichment?.duration),
    feesIfAvailable: firstValue(
      row.fees_if_available,
      nactvetEnrichment?.fees_if_available
    ),
    feeBand:
      firstValue(row.fee_band) ??
      (blankToUndefined(row.fees_if_available) ? "known_fee" : "unknown_fee"),
    studyMode: firstValue(row.study_mode, nactvetEnrichment?.mode),
    campusLocation: firstValue(row.campus_location, row.campus_name),
    admissionCapacity: firstValue(
      row.admission_capacity,
      nactvetEnrichment?.admission_capacity
    ),
    minimumAdmissionPoints: parseOptionalNumber(row.minimum_admission_points),
    minimumAdmissionPointsSubjectCount: parseOptionalNumber(
      row.minimum_admission_points_subjects
    ),
    entryRouteTypes: firstValue(
      routeSummary.entryRouteTypes,
      nactvetEnrichment?.entry_route_types
    ),
    acceptsFormFourDirect: mergeSuitability(
      normalizeSuitability(nactvetEnrichment?.accepts_form_four_direct),
      routeSummary.acceptsFormFourDirect
    ),
    accreditationStatusIfAvailable: cleanDataArtifactValue(
      row.accreditation_status_if_available
    ),
    applicationLink: firstValue(row.application_link, row.application_method),
    officialSourceUrl: cleanDataArtifactText(row.official_source_url),
    sourceType: cleanDataArtifactText(row.source_type),
    sourceDatasets:
      sourceDataset === "post_form_four" && nactvetEnrichment
        ? ["post_form_four", "nactvet_enrichment"]
        : [sourceDataset],
    confidenceLevel: normalizeConfidence(row.confidence_level),
    lastVerifiedDate: cleanDataArtifactText(row.last_verified_date),
    notes: firstValue(row.notes, nactvetEnrichment?.notes),
    needsReview: rowNeedsReview || needsManualReview(reviewReasons),
    reviewReasons,
    careerKeywords: keywordData.careerKeywords,
    swahiliKeywords: keywordData.swahiliKeywords,
    sourceRequirementKeys: [requirementKey],
    searchText: [
      programmeName,
      normalizedProgrammeName,
      tcuCode?.code ?? row.programme_code,
      cleanDataArtifactText(row.institution_name),
      awardLevel,
      cleanDataArtifactText(row.qualification_level),
      cleanDataArtifactText(row.pathway_type),
      fieldCategory,
      keywordData.courseFamily,
      institution?.institutionType,
      institution?.ownershipType,
      institution?.region,
      institution?.districtOrCouncil,
      row.regulator,
      cleanDataArtifactText(row.minimum_entry_requirements),
      routeSummary.rawRequirementText,
      cleanDataArtifactText(row.required_subjects),
      routeSummary.requiredSubjects,
      routeSummary.entryRouteTypes,
      ...keywordData.careerKeywords,
      ...keywordData.swahiliKeywords,
      ...institutionSearchAliases,
    ]
      .filter(Boolean)
      .join(" "),
  }
}

// TCU programme code for a TCU degree row: the dataset's own code, a code
// embedded in a leaked title that the guidebook knows, or the guidebook code
// of the programme with the same title at the same institution.
function tcuProgrammeCodeForRow(
  row: Row,
  programmeName: string,
  normalizedInstitutionName: string
):
  | {
      code: string
      source: "dataset" | "title_leak" | "guidebook_identity_match"
    }
  | undefined {
  const datasetCode = normalizeTcuProgrammeCode(programmeCodeForRow(row))
  if (datasetCode) return { code: datasetCode, source: "dataset" }
  if (!isTcuDegreeRow(row)) return undefined

  const leakedCode = findEmbeddedTcuProgrammeCodes(row.programme_name).find(
    (code) => guidebookProgrammesByCode.has(code)
  )
  if (leakedCode) {
    titleLeakRecoveries.push({
      programmeCode: leakedCode,
      sourceTitle: cleanDataArtifactText(row.programme_name),
    })
    return { code: leakedCode, source: "title_leak" }
  }

  const identityCodes = guidebookCodesByIdentity.get(
    makeRequirementKey(programmeName, normalizedInstitutionName)
  )
  if (identityCodes && identityCodes.size === 1) {
    return {
      code: [...identityCodes][0],
      source: "guidebook_identity_match",
    }
  }

  return undefined
}

function mergeProgramme(
  left: ProcessedProgramme,
  right: ProcessedProgramme
): ProcessedProgramme {
  const sameInstitution =
    left.normalizedInstitutionName === right.normalizedInstitutionName

  return {
    ...left,
    programmeCode: firstValue(left.programmeCode, right.programmeCode),
    qualificationLevel: firstValue(
      left.qualificationLevel,
      right.qualificationLevel
    ),
    pathwayType: firstValue(left.pathwayType, right.pathwayType),
    institutionRegistrationNumber: sameInstitution
      ? firstValue(
          left.institutionRegistrationNumber,
          right.institutionRegistrationNumber
        )
      : left.institutionRegistrationNumber,
    institutionType: sameInstitution
      ? firstValue(left.institutionType, right.institutionType)
      : left.institutionType,
    ownershipType: sameInstitution
      ? firstValue(left.ownershipType, right.ownershipType)
      : left.ownershipType,
    region: sameInstitution
      ? firstValue(left.region, right.region)
      : left.region,
    districtOrCouncil: sameInstitution
      ? firstValue(left.districtOrCouncil, right.districtOrCouncil)
      : left.districtOrCouncil,
    institutionLogoUrl: sameInstitution
      ? firstValue(left.institutionLogoUrl, right.institutionLogoUrl)
      : left.institutionLogoUrl,
    institutionLogoSourceUrl: sameInstitution
      ? firstValue(
          left.institutionLogoSourceUrl,
          right.institutionLogoSourceUrl
        )
      : left.institutionLogoSourceUrl,
    institutionWebsite: sameInstitution
      ? firstValue(left.institutionWebsite, right.institutionWebsite)
      : left.institutionWebsite,
    minimumEntryRequirements: firstValue(
      left.minimumEntryRequirements,
      right.minimumEntryRequirements
    ),
    requiredSubjects: firstValue(left.requiredSubjects, right.requiredSubjects),
    suitableForFormFourLeaver: mergeSuitability(
      left.suitableForFormFourLeaver,
      right.suitableForFormFourLeaver
    ),
    acceptsFormSix: mergeSuitability(left.acceptsFormSix, right.acceptsFormSix),
    acceptsCertificate: mergeSuitability(
      left.acceptsCertificate,
      right.acceptsCertificate
    ),
    acceptsDiploma: mergeSuitability(left.acceptsDiploma, right.acceptsDiploma),
    acceptsEquivalent: mergeSuitability(
      left.acceptsEquivalent,
      right.acceptsEquivalent
    ),
    duration: firstValue(left.duration, right.duration),
    feesIfAvailable: firstValue(left.feesIfAvailable, right.feesIfAvailable),
    feeBand: firstValue(left.feeBand, right.feeBand),
    studyMode: firstValue(left.studyMode, right.studyMode),
    campusLocation: firstValue(left.campusLocation, right.campusLocation),
    admissionCapacity: firstValue(
      left.admissionCapacity,
      right.admissionCapacity
    ),
    minimumAdmissionPoints:
      left.minimumAdmissionPoints ?? right.minimumAdmissionPoints,
    minimumAdmissionPointsSubjectCount:
      left.minimumAdmissionPoints !== undefined
        ? left.minimumAdmissionPointsSubjectCount
        : right.minimumAdmissionPointsSubjectCount,
    entryRouteTypes: firstValue(left.entryRouteTypes, right.entryRouteTypes),
    acceptsFormFourDirect: mergeSuitability(
      left.acceptsFormFourDirect,
      right.acceptsFormFourDirect
    ),
    accreditationStatusIfAvailable: firstValue(
      left.accreditationStatusIfAvailable,
      right.accreditationStatusIfAvailable
    ),
    applicationLink: firstValue(left.applicationLink, right.applicationLink),
    officialSourceUrl: uniqueDelimitedValues([
      left.officialSourceUrl,
      right.officialSourceUrl,
    ]).join("; "),
    sourceType: uniqueDelimitedValues([left.sourceType, right.sourceType]).join(
      "; "
    ),
    sourceDatasets: uniqueValues([
      ...left.sourceDatasets,
      ...right.sourceDatasets,
    ]),
    confidenceLevel:
      left.confidenceLevel === "high"
        ? left.confidenceLevel
        : right.confidenceLevel,
    lastVerifiedDate:
      firstValue(left.lastVerifiedDate, right.lastVerifiedDate) ?? "",
    notes: uniqueValues([left.notes, right.notes]).join(" || ") || undefined,
    needsReview: left.needsReview || right.needsReview,
    reviewReasons: mergeReviewReasons([
      ...left.reviewReasons,
      ...right.reviewReasons,
    ]),
    careerKeywords: uniqueValues([
      ...left.careerKeywords,
      ...right.careerKeywords,
    ]),
    swahiliKeywords: uniqueValues([
      ...left.swahiliKeywords,
      ...right.swahiliKeywords,
    ]),
    fieldCategory:
      left.fieldCategory !== "other" ? left.fieldCategory : right.fieldCategory,
    sourceRequirementKeys: uniqueValues([
      ...(left.sourceRequirementKeys ?? []),
      ...(right.sourceRequirementKeys ?? []),
    ]),
    searchText: sameInstitution
      ? uniqueValues([left.searchText, right.searchText]).join(" ")
      : left.searchText,
  }
}

const programmesByKey = new Map<string, ProcessedProgramme>()
// Guidebook rows go first so that, for a shared TCU programme code, the
// guidebook title, institution, capacity and points win the merge.
for (const programme of [
  ...guidebookProgrammes
    .filter((guidebook) => guidebook.programmeCode)
    .map((guidebook) =>
      buildProgramme(
        buildTcuExtractedProgrammeRow(guidebook),
        "tcu_secondary_guidebook_pdf_extraction"
      )
    ),
  ...pathwayProgrammes.map((row) => buildProgramme(row, "education_pathways")),
  ...udsmProspectusSupplementRows.map((row) =>
    buildProgramme(
      buildUdsmProspectusProgrammeRow(row),
      "udsm_undergraduate_prospectus_2024_2025"
    )
  ),
  ...legacyProgrammes.map((row) => buildProgramme(row, "post_form_four")),
]) {
  const key = makeProcessedProgrammeKey(programme)
  const existing = programmesByKey.get(key)
  programmesByKey.set(
    key,
    existing ? mergeProgramme(existing, programme) : programme
  )
}

const programmesByNaturalKey = new Map<string, ProcessedProgramme>()
for (const programme of programmesByKey.values()) {
  let key = makeProgrammeKey(
    programme.normalizedProgrammeName,
    programme.normalizedInstitutionName,
    programme.awardLevel
  )
  const naturalKeyOwner = programmesByNaturalKey.get(key)
  // Two different TCU codes are two different offerings even when the title
  // and institution match; never merge them away.
  if (
    naturalKeyOwner?.programmeCode &&
    programme.programmeCode &&
    naturalKeyOwner.programmeCode !== programme.programmeCode
  ) {
    key = `${key}|${programme.programmeCode}`
  }
  const existing = programmesByNaturalKey.get(key)
  programmesByNaturalKey.set(
    key,
    existing ? mergeProgramme(existing, programme) : programme
  )
}

function isTcuDegreeProgramme(programme: ProcessedProgramme) {
  return programme.regulator === "TCU" && programme.awardLevel === "degree"
}

const allProcessedProgrammes = [...programmesByNaturalKey.values()]
// Coded TCU rows that the guidebook does not list keep their dataset title;
// when that title is still broken ("Bachelor of Science in") the record
// cannot be shown and is reported instead.
const droppedBrokenTitleTcuProgrammes = allProcessedProgrammes.filter(
  (programme) =>
    isTcuDegreeProgramme(programme) &&
    programme.programmeCode &&
    !guidebookProgrammesByCode.has(programme.programmeCode) &&
    programmeTitleQualityIssues(programme.programmeName).length > 0
)
// The TCU degree layer is keyed by guidebook programme code. Uncoded TCU
// degree rows are records the 2025/26 guidebook does not list (older
// guidebook parses, prospectus supplements); they are reported in
// tcu-coverage-report.json instead of being published.
const droppedUncodedTcuProgrammes = allProcessedProgrammes.filter(
  (programme) => isTcuDegreeProgramme(programme) && !programme.programmeCode
)
// Titles that still carry a programme code or entry-requirement prose are
// quarantined (and listed in the data-quality report) rather than published.
function programmeTitleHasLeak(name: string) {
  return (
    programmeNameContainsRequirementLeak(name) ||
    programmeTitleQualityIssues(name).some(
      (issue) =>
        issue === "contains_programme_code" ||
        issue === "contains_requirement_prose"
    )
  )
}
const quarantinedProgrammes = allProcessedProgrammes.filter(
  (programme) =>
    !(isTcuDegreeProgramme(programme) && !programme.programmeCode) &&
    programmeTitleHasLeak(programme.programmeName)
)
const processedProgrammes = allProcessedProgrammes.filter(
  (programme) =>
    !(isTcuDegreeProgramme(programme) && !programme.programmeCode) &&
    !droppedBrokenTitleTcuProgrammes.includes(programme) &&
    !programmeTitleHasLeak(programme.programmeName)
)

// Re-point entry requirements of every source row merged into a coded TCU
// programme at that programme's final title and institution, so the
// eligibility lookup (by normalized programme + institution name) finds them.
const tcuProgrammesByRequirementKey = new Map<string, ProcessedProgramme[]>()
const otherProgrammeRequirementKeys = new Set<string>()
for (const programme of processedProgrammes) {
  const keys = uniqueValues([
    ...(programme.sourceRequirementKeys ?? []),
    makeRequirementKey(
      programme.normalizedProgrammeName,
      programme.normalizedInstitutionName
    ),
  ])
  for (const key of keys) {
    if (isTcuDegreeProgramme(programme) && programme.programmeCode) {
      tcuProgrammesByRequirementKey.set(key, [
        ...(tcuProgrammesByRequirementKey.get(key) ?? []),
        programme,
      ])
    } else {
      otherProgrammeRequirementKeys.add(key)
    }
  }
}
const droppedTcuRequirementKeys = new Set(
  [...droppedUncodedTcuProgrammes, ...droppedBrokenTitleTcuProgrammes]
    .flatMap((programme) => programme.sourceRequirementKeys ?? [])
    .filter(
      (key) =>
        !tcuProgrammesByRequirementKey.has(key) &&
        !otherProgrammeRequirementKeys.has(key)
    )
)
let remappedTcuEntryRequirementCount = 0
let droppedTcuEntryRequirementCount = 0
processedEntryRequirements = processedEntryRequirements.flatMap(
  (requirement) => {
    const key = makeRequirementKey(
      requirement.normalizedProgrammeName,
      requirement.normalizedInstitutionName
    )
    if (droppedTcuRequirementKeys.has(key)) {
      droppedTcuEntryRequirementCount += 1
      return []
    }
    const owners = tcuProgrammesByRequirementKey.get(key)
    if (
      !owners ||
      owners.length !== 1 ||
      otherProgrammeRequirementKeys.has(key) ||
      /^(ordinary diploma|diploma|basic technician certificate|technician certificate|certificate)\b/i.test(
        requirement.programmeName
      )
    ) {
      return [requirement]
    }
    const [owner] = owners
    if (
      owner.normalizedProgrammeName === requirement.normalizedProgrammeName &&
      owner.normalizedInstitutionName === requirement.normalizedInstitutionName
    ) {
      return [requirement]
    }
    remappedTcuEntryRequirementCount += 1
    return [
      {
        ...requirement,
        programmeName: owner.programmeName,
        normalizedProgrammeName: owner.normalizedProgrammeName,
        institutionName: owner.institutionName,
        normalizedInstitutionName: owner.normalizedInstitutionName,
        searchText: uniqueValues([
          owner.programmeName,
          owner.normalizedProgrammeName,
          owner.institutionName,
          owner.normalizedInstitutionName,
          owner.programmeCode,
          requirement.searchText,
        ]).join(" "),
      },
    ]
  }
)

// For a coded TCU programme with a guidebook requirement, older Form Six-only
// requirement rows from other datasets (earlier extractions of the same or an
// older guidebook) are superseded: keeping them would let a stale, looser
// variant win the "best variant" eligibility evaluation.
const identitiesWithGuidebookRequirement = new Set(
  guidebookEntryRequirements.map((requirement) =>
    requirementRuleKey(
      requirement.normalizedProgrammeName,
      requirement.normalizedInstitutionName
    )
  )
)
let supersededFormSixRequirementCount = 0
processedEntryRequirements = processedEntryRequirements.filter(
  (requirement) => {
    if (guidebookEntryRequirementSet.has(requirement)) return true
    const formSixOnly =
      requirement.acceptsFormSix === "yes" &&
      requirement.acceptsFormFourDirect !== "yes" &&
      requirement.acceptsCertificate !== "yes" &&
      requirement.acceptsDiploma !== "yes" &&
      requirement.acceptsEquivalent !== "yes"
    if (
      formSixOnly &&
      identitiesWithGuidebookRequirement.has(
        requirementRuleKey(
          requirement.normalizedProgrammeName,
          requirement.normalizedInstitutionName
        )
      )
    ) {
      supersededFormSixRequirementCount += 1
      return false
    }
    return true
  }
)

// Drop exact duplicate requirement rows created by the remap (the same route
// text attached by both the guidebook and the pathways dataset).
const entryRequirementFingerprints = new Set<string>()
processedEntryRequirements = processedEntryRequirements.filter(
  (requirement) => {
    const fingerprint = [
      requirement.normalizedProgrammeName,
      requirement.normalizedInstitutionName,
      normalizeName(requirement.rawRequirementText),
      requirement.acceptsFormFourDirect,
      requirement.acceptsFormSix,
      requirement.acceptsCertificate,
      requirement.acceptsDiploma,
      requirement.acceptsEquivalent,
    ].join("|")
    if (entryRequirementFingerprints.has(fingerprint)) return false
    entryRequirementFingerprints.add(fingerprint)
    return true
  }
)

// Recompute route flags and requirement text of coded TCU programmes from
// the requirement rows now attached to their final identity.
const finalRequirementsByIdentity = new Map<
  string,
  ProcessedEntryRequirement[]
>()
for (const requirement of processedEntryRequirements) {
  const key = requirementRuleKey(
    requirement.normalizedProgrammeName,
    requirement.normalizedInstitutionName
  )
  finalRequirementsByIdentity.set(key, [
    ...(finalRequirementsByIdentity.get(key) ?? []),
    requirement,
  ])
}
for (const programme of processedProgrammes) {
  if (!isTcuDegreeProgramme(programme) || !programme.programmeCode) continue
  const requirements =
    finalRequirementsByIdentity.get(
      requirementRuleKey(
        programme.normalizedProgrammeName,
        programme.normalizedInstitutionName
      )
    ) ?? []
  if (requirements.length === 0) continue
  const guidebookFirst = [...requirements].sort(
    (a, b) =>
      Number(b.officialSourceUrl === tcuSecondaryGuidebookUrl) -
      Number(a.officialSourceUrl === tcuSecondaryGuidebookUrl)
  )
  const summary = requirementRouteSummary(guidebookFirst)
  const guidebook = guidebookProgrammesByCode.get(programme.programmeCode)
  // Review reasons that the guidebook row for this code resolves.
  const resolvedByGuidebook = new Set(
    guidebook
      ? [
          "programme code not confidently parsed",
          "programme name appears truncated by PDF extraction",
          "programme_name_looks_incomplete",
          "programme_name_contains_entry_requirement_fragment",
          "missing_entry_requirements",
          ...(blankToUndefined(guidebook.row.durationYears)
            ? ["missing_duration"]
            : []),
          ...(blankToUndefined(guidebook.row.admissionCapacity) &&
          blankToUndefined(guidebook.row.durationYears)
            ? [
                "capacity/duration not confidently parsed",
                "admission_capacity differs across official source rows",
              ]
            : []),
        ]
      : []
  )
  const reviewReasons = programme.reviewReasons.filter(
    (reason) => !resolvedByGuidebook.has(reason)
  )
  Object.assign(programme, {
    reviewReasons,
    needsReview: guidebook
      ? needsManualReview(reviewReasons)
      : programme.needsReview,
    minimumEntryRequirements:
      cleanDataArtifactValue(summary.rawRequirementText) ??
      programme.minimumEntryRequirements,
    requiredSubjects: firstValue(
      summary.requiredSubjects,
      programme.requiredSubjects
    ),
    acceptsFormSix: mergeSuitability(
      programme.acceptsFormSix,
      summary.acceptsFormSix
    ),
    acceptsCertificate: mergeSuitability(
      programme.acceptsCertificate,
      summary.acceptsCertificate
    ),
    acceptsDiploma: mergeSuitability(
      programme.acceptsDiploma,
      summary.acceptsDiploma
    ),
    acceptsEquivalent: mergeSuitability(
      programme.acceptsEquivalent,
      summary.acceptsEquivalent
    ),
    acceptsFormFourDirect: mergeSuitability(
      programme.acceptsFormFourDirect,
      summary.acceptsFormFourDirect
    ),
    entryRouteTypes: firstValue(
      acceptedApplicantPathwayLabels({
        acceptsFormFourDirect: mergeSuitability(
          programme.acceptsFormFourDirect,
          summary.acceptsFormFourDirect
        ),
        acceptsFormSix: mergeSuitability(
          programme.acceptsFormSix,
          summary.acceptsFormSix
        ),
        acceptsCertificate: mergeSuitability(
          programme.acceptsCertificate,
          summary.acceptsCertificate
        ),
        acceptsDiploma: mergeSuitability(
          programme.acceptsDiploma,
          summary.acceptsDiploma
        ),
        acceptsEquivalent: mergeSuitability(
          programme.acceptsEquivalent,
          summary.acceptsEquivalent
        ),
      }).join("; "),
      programme.entryRouteTypes
    ),
  })
}

const processedRequirementRules: ProcessedRequirementRule[] =
  processedEntryRequirements.map((requirement) =>
    buildRequirementRuleFromEntryRequirement(requirement)
  )
const requirementRuleKeys = new Set(
  processedRequirementRules.map((rule) =>
    requirementRuleKey(
      rule.normalizedProgrammeName,
      rule.normalizedInstitutionName
    )
  )
)
const programmeFallbackRequirementRules: ProcessedRequirementRule[] = []

for (const programme of processedProgrammes) {
  if (!blankToUndefined(programme.minimumEntryRequirements)) continue

  const key = requirementRuleKey(
    programme.normalizedProgrammeName,
    programme.normalizedInstitutionName
  )
  if (requirementRuleKeys.has(key)) continue

  const fallbackRule = buildRequirementRuleFromProgramme(programme)
  processedRequirementRules.push(fallbackRule)
  programmeFallbackRequirementRules.push(fallbackRule)
  requirementRuleKeys.add(key)
}

// Carry the TCU programme code and guidebook points onto the rules of coded
// TCU programmes (only when the title + institution identity is unambiguous).
const tcuProgrammesByRuleKey = new Map<string, ProcessedProgramme[]>()
for (const programme of processedProgrammes) {
  if (!isTcuDegreeProgramme(programme) || !programme.programmeCode) continue
  const key = requirementRuleKey(
    programme.normalizedProgrammeName,
    programme.normalizedInstitutionName
  )
  tcuProgrammesByRuleKey.set(key, [
    ...(tcuProgrammesByRuleKey.get(key) ?? []),
    programme,
  ])
}
for (const rule of processedRequirementRules) {
  const owners = tcuProgrammesByRuleKey.get(
    requirementRuleKey(
      rule.normalizedProgrammeName,
      rule.normalizedInstitutionName
    )
  )
  if (!owners || owners.length !== 1) continue
  const [owner] = owners
  rule.programmeCode = owner.programmeCode
  if (owner.minimumAdmissionPoints !== undefined) {
    rule.minimumAdmissionPoints = owner.minimumAdmissionPoints
  }
  if (owner.minimumAdmissionPointsSubjectCount !== undefined) {
    rule.minimumAdmissionPointsSubjectCount =
      owner.minimumAdmissionPointsSubjectCount
  }
}
const programmesWithoutExactRequirementRule = processedProgrammes.filter(
  (programme) =>
    !requirementRuleKeys.has(
      requirementRuleKey(
        programme.normalizedProgrammeName,
        programme.normalizedInstitutionName
      )
    )
)
const programmesWithoutExactRequirementRuleButHasRequirements =
  programmesWithoutExactRequirementRule.filter((programme) =>
    blankToUndefined(programme.minimumEntryRequirements)
  )

type InstitutionSummary = {
  programmeCount: number
  awardLevels: Map<string, number>
  fieldCategories: Map<string, number>
  courseFamilies: Map<string, number>
  hasFormFourDirectProgramme: Suitability
  browseTerms: Set<string>
}

function emptyInstitutionSummary(): InstitutionSummary {
  return {
    programmeCount: 0,
    awardLevels: new Map(),
    fieldCategories: new Map(),
    courseFamilies: new Map(),
    hasFormFourDirectProgramme: "unknown",
    browseTerms: new Set(),
  }
}

function addSummaryValue(map: Map<string, number>, value: string | undefined) {
  const normalized = value?.trim()
  if (!normalized || normalized.toLowerCase() === "unknown") {
    return
  }

  map.set(normalized, (map.get(normalized) ?? 0) + 1)
}

function rankedSummaryValues(values: Map<string, number>, limit: number) {
  return [...values]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([value]) => value)
}

const institutionSummaries = new Map<string, InstitutionSummary>()

for (const programme of processedProgrammes) {
  const summary =
    institutionSummaries.get(programme.normalizedInstitutionName) ??
    emptyInstitutionSummary()

  summary.programmeCount += 1
  addSummaryValue(summary.awardLevels, programme.awardLevel)
  addSummaryValue(summary.fieldCategories, programme.fieldCategory)
  addSummaryValue(summary.courseFamilies, programme.courseFamily)
  summary.hasFormFourDirectProgramme = mergeSuitability(
    summary.hasFormFourDirectProgramme,
    programme.acceptsFormFourDirect
  )
  summary.browseTerms.add(programme.awardLevel)
  summary.browseTerms.add(programme.fieldCategory)
  if (programme.courseFamily) summary.browseTerms.add(programme.courseFamily)

  institutionSummaries.set(programme.normalizedInstitutionName, summary)
}

for (const institution of processedInstitutions) {
  const summary = institutionSummaries.get(
    institution.normalizedInstitutionName
  )

  if (summary) {
    Object.assign(institution, {
      hasFormFourDirectProgramme: mergeSuitability(
        institution.hasFormFourDirectProgramme,
        summary.hasFormFourDirectProgramme
      ),
      programmeCount: summary.programmeCount,
      awardLevels: rankedSummaryValues(summary.awardLevels, 8),
      fieldCategories: rankedSummaryValues(summary.fieldCategories, 8),
      courseFamilies: rankedSummaryValues(summary.courseFamilies, 8),
      browseSearchText: [...summary.browseTerms].join(" "),
    })
  } else {
    Object.assign(institution, {
      programmeCount: 0,
      awardLevels: [],
      fieldCategories: [],
      courseFamilies: [],
      browseSearchText: "",
    })
  }
}

const report = {
  generatedAt: new Date().toISOString(),
  canonicalDataset: "tanzania-education-pathways-dataset",
  fallbackDataset: "tanzania-post-form-four-dataset",
  enrichmentDatasets: [
    "tanzania-education-dataset",
    "institution-logos.seed.csv",
    "tcu-secondary-guidebook-2025-2026-programmes.csv",
    "udsm-undergraduate-prospectus-2024-2025-programmes.csv",
  ],
  institutions: {
    rawPathwayCount: pathwayInstitutions.length,
    rawLegacyCount: legacyInstitutions.length,
    nactvetEnrichmentCount: nactvetInstitutions.length,
    processedCount: processedInstitutions.length,
    fromPathwaysCount: processedInstitutions.filter((row) =>
      row.sourceDatasets.includes("education_pathways")
    ).length,
    fallbackOnlyCount: processedInstitutions.filter(
      (row) => !row.sourceDatasets.includes("education_pathways")
    ).length,
    verifiedLogoCount: processedInstitutions.filter(
      (row) => row.logoStatus === "verified"
    ).length,
    needsReviewCount: processedInstitutions.filter((row) => row.needsReview)
      .length,
    manualReviewQueues: summarizeManualReviewQueues(processedInstitutions),
  },
  programmes: {
    rawPathwayCount: pathwayProgrammes.length,
    rawLegacyCount: legacyProgrammes.length,
    extractedTcuSecondaryGuidebookCount: guidebookProgrammes.length,
    droppedUncodedTcuDegreeCount: droppedUncodedTcuProgrammes.length,
    udsmProspectusSupplementCount: udsmProspectusSupplementRows.length,
    nactvetEnrichmentCount: nactvetProgrammes.length,
    processedCount: processedProgrammes.length,
    quarantinedTitleLeakCount: quarantinedProgrammes.length,
    quarantinedTitleLeakExamples: quarantinedProgrammes
      .slice(0, 10)
      .map((row) => ({
        programmeName: row.programmeName,
        institutionName: row.institutionName,
        sourceDatasets: row.sourceDatasets,
        reviewReasons: row.reviewReasons,
      })),
    fromPathwaysCount: processedProgrammes.filter((row) =>
      row.sourceDatasets.includes("education_pathways")
    ).length,
    fromTcuSecondaryGuidebookExtractionCount: processedProgrammes.filter(
      (row) =>
        row.sourceDatasets.includes("tcu_secondary_guidebook_pdf_extraction")
    ).length,
    fromUdsmProspectusSupplementCount: processedProgrammes.filter((row) =>
      row.sourceDatasets.includes("udsm_undergraduate_prospectus_2024_2025")
    ).length,
    fallbackOnlyCount: processedProgrammes.filter(
      (row) => !row.sourceDatasets.includes("education_pathways")
    ).length,
    degreeCount: processedProgrammes.filter(
      (row) => row.awardLevel === "degree"
    ).length,
    formSixRouteCount: processedProgrammes.filter(
      (row) => row.acceptsFormSix === "yes"
    ).length,
    certificateRouteCount: processedProgrammes.filter(
      (row) => row.acceptsCertificate === "yes"
    ).length,
    diplomaRouteCount: processedProgrammes.filter(
      (row) => row.acceptsDiploma === "yes"
    ).length,
    needsReviewCount: processedProgrammes.filter((row) => row.needsReview)
      .length,
    applicantPathwayCoverage:
      summarizeApplicantPathwayCoverage(processedProgrammes),
    manualReviewQueues: summarizeManualReviewQueues(processedProgrammes),
  },
  entryRequirements: {
    rawPathwayCount: pathwayEntryRequirements.length,
    extractedTcuSecondaryGuidebookCount: guidebookProgrammes.filter(
      (programme) => programme.programmeCode && programme.rawRequirementText
    ).length,
    remappedToTcuProgrammeCount: remappedTcuEntryRequirementCount,
    droppedWithUncodedTcuProgrammeCount: droppedTcuEntryRequirementCount,
    supersededByTcuGuidebookFormSixCount: supersededFormSixRequirementCount,
    processedCount: processedEntryRequirements.length,
    formFourRouteCount: processedEntryRequirements.filter(
      (row) => row.acceptsFormFourDirect === "yes"
    ).length,
    formSixRouteCount: processedEntryRequirements.filter(
      (row) => row.acceptsFormSix === "yes"
    ).length,
    certificateRouteCount: processedEntryRequirements.filter(
      (row) => row.acceptsCertificate === "yes"
    ).length,
    diplomaRouteCount: processedEntryRequirements.filter(
      (row) => row.acceptsDiploma === "yes"
    ).length,
    applicantPathwayCoverage: summarizeApplicantPathwayCoverage(
      processedEntryRequirements
    ),
  },
  requirementRules: {
    processedCount: processedRequirementRules.length,
    fromProgrammeFallbackCount: programmeFallbackRequirementRules.length,
    programmesWithoutExactRuleCount:
      programmesWithoutExactRequirementRule.length,
    programmesWithoutExactRuleButHasRequirementsCount:
      programmesWithoutExactRequirementRuleButHasRequirements.length,
    structuredVariantCount: processedRequirementRules
      .flatMap((row) => row.variants)
      .filter((variant) => variant.parseStatus === "structured").length,
    partialVariantCount: processedRequirementRules
      .flatMap((row) => row.variants)
      .filter((variant) => variant.parseStatus === "partial").length,
    unparsedVariantCount: processedRequirementRules
      .flatMap((row) => row.variants)
      .filter((variant) => variant.parseStatus === "unparsed").length,
  },
}

const tcuCoverageReport = buildTcuCoverageReport()

writeProcessedDataOutputs(outputDir, {
  institutions: processedInstitutions,
  programmes: processedProgrammes.map((programme) => {
    const output = { ...programme }
    delete output.sourceRequirementKeys
    return output
  }),
  entryRequirements: processedEntryRequirements,
  requirementRules: processedRequirementRules,
  dataQualityReport: report,
})

writeFileSync(
  tcuCoverageReportPath,
  `${JSON.stringify(tcuCoverageReport, null, 2)}\n`
)

console.log(JSON.stringify(report, null, 2))
console.log(JSON.stringify(tcuCoverageReport.summary, null, 2))

// Per-institution comparison of the TCU guidebook against the published TCU
// degree layer. Written to data/processed/tcu-coverage-report.json.
function buildTcuCoverageReport() {
  const tcuProgrammes = processedProgrammes.filter(isTcuDegreeProgramme)
  const publishedCodes = new Set(
    tcuProgrammes
      .map((programme) => programme.programmeCode)
      .filter(Boolean) as string[]
  )
  const guidebookCodes = new Set(guidebookProgrammesByCode.keys())
  const tcuRuleStatus = summarizeTcuFormSixParseStatus(tcuProgrammes)
  const sourceTitlesByCode = new Map<string, Set<string>>()
  for (const row of pathwayProgrammes) {
    const code = normalizeTcuProgrammeCode(programmeCodeForRow(row))
    if (!code) continue
    sourceTitlesByCode.set(
      code,
      (sourceTitlesByCode.get(code) ?? new Set()).add(
        cleanDataArtifactText(row.programme_name)
      )
    )
  }
  const repairedTitles = tcuProgrammes
    .filter((programme) => programme.programmeCode)
    .flatMap((programme) =>
      [...(sourceTitlesByCode.get(programme.programmeCode!) ?? [])]
        .filter(
          (title) =>
            title !== programme.programmeName &&
            (programmeTitleQualityIssues(title).length > 0 ||
              guidebookTitleRepair(title) !== title)
        )
        .map((title) => ({
          programmeCode: programme.programmeCode!,
          sourceTitle: title,
          publishedTitle: programme.programmeName,
        }))
    )

  const institutions = [...guidebookInstitutionResolutions.entries()].map(
    ([heading, resolution]) => {
      const institution = resolution.institution!
      const guidebookRows = guidebookProgrammes.filter(
        (programme) => programme.heading === heading
      )
      const headingCodes = new Set(
        guidebookRows
          .map((programme) => programme.programmeCode)
          .filter(Boolean) as string[]
      )
      const published = tcuProgrammes.filter(
        (programme) =>
          programme.normalizedInstitutionName ===
          institution.normalizedInstitutionName
      )
      const missingCodes = [...headingCodes].filter(
        (code) =>
          !published.some((programme) => programme.programmeCode === code)
      )
      const extraRecords = published
        .filter(
          (programme) =>
            !programme.programmeCode ||
            !headingCodes.has(programme.programmeCode)
        )
        .map((programme) => ({
          programmeCode: programme.programmeCode,
          programmeName: programme.programmeName,
          inGuidebookUnderAnotherInstitution: programme.programmeCode
            ? guidebookCodes.has(programme.programmeCode)
            : false,
          sourceDatasets: programme.sourceDatasets,
        }))

      return {
        guidebookHeading: heading,
        institutionName: institution.institutionName,
        normalizedInstitutionName: institution.normalizedInstitutionName,
        isBranchCampus: resolution.isBranch,
        institutionCreatedFromGuidebook:
          createdGuidebookInstitutions.includes(institution),
        guidebookProgrammeCount: guidebookRows.length,
        guidebookRowsWithoutCode: guidebookRows
          .filter((programme) => programme.programmeCodeSource === "missing")
          .map((programme) => programme.programmeName),
        processedTcuDegreeCount: published.length,
        processedGuidebookCodeCount: published.filter(
          (programme) =>
            programme.programmeCode && headingCodes.has(programme.programmeCode)
        ).length,
        missingCodes,
        extraRecords,
      }
    }
  )

  const guidebookInstitutionKeys = new Set(
    institutions.map((institution) => institution.normalizedInstitutionName)
  )
  const tcuDegreesOutsideGuidebookInstitutions = tcuProgrammes
    .filter(
      (programme) =>
        !guidebookInstitutionKeys.has(programme.normalizedInstitutionName)
    )
    .map((programme) => ({
      programmeCode: programme.programmeCode,
      programmeName: programme.programmeName,
      institutionName: programme.institutionName,
      inGuidebook: programme.programmeCode
        ? guidebookCodes.has(programme.programmeCode)
        : false,
      sourceDatasets: programme.sourceDatasets,
    }))
  const codedCount = tcuProgrammes.filter(
    (programme) => programme.programmeCode
  ).length

  return {
    source: {
      guidebook:
        "TCU Bachelor's Degree Admission Guidebook 2025/2026 (holders of secondary school qualifications), 6 October 2025 edition",
      guidebookUrl: tcuSecondaryGuidebookUrl,
      extractedCsv:
        "data/extracted/tcu-secondary-guidebook-2025-2026-programmes.csv",
    },
    summary: {
      guidebookInstitutionHeadings: guidebookInstitutionResolutions.size,
      guidebookProgrammeRows: guidebookProgrammes.length,
      guidebookProgrammeCodes: guidebookCodes.size,
      guidebookRowsWithoutPrintedCode: guidebookProgrammes.filter(
        (programme) => programme.programmeCodeSource !== "guidebook"
      ).length,
      guidebookCodesPublished: [...guidebookCodes].filter((code) =>
        publishedCodes.has(code)
      ).length,
      guidebookCodesMissing: [...guidebookCodes].filter(
        (code) => !publishedCodes.has(code)
      ),
      processedTcuDegreeProgrammes: tcuProgrammes.length,
      processedTcuDegreeProgrammesWithCode: codedCount,
      processedTcuDegreeCodedPercent:
        tcuProgrammes.length > 0
          ? Math.round((codedCount / tcuProgrammes.length) * 1000) / 10
          : 0,
      processedTcuCodesNotInGuidebook: [...publishedCodes].filter(
        (code) => !guidebookCodes.has(code)
      ).length,
      tcuDegreesWithCapacity: tcuProgrammes.filter(
        (programme) => programme.admissionCapacity
      ).length,
      tcuDegreesWithMinimumAdmissionPoints: tcuProgrammes.filter(
        (programme) => programme.minimumAdmissionPoints !== undefined
      ).length,
      tcuDegreesWithFees: tcuProgrammes.filter(
        (programme) => programme.feesIfAvailable
      ).length,
      droppedUncodedTcuDegreeRecords: droppedUncodedTcuProgrammes.length,
      droppedBrokenTitleTcuDegreeRecords:
        droppedBrokenTitleTcuProgrammes.length,
      titleLeakRecordsRecoveredByCode: titleLeakRecoveries.length,
      sourceTitlesRepairedByCode: repairedTitles.length,
      formSixRequirementParseStatus: tcuRuleStatus,
    },
    institutionFixes: {
      droppedProseInstitutionNames: droppedProseInstitutions.map(
        (row) => row.institution_name
      ),
      mergedDuplicateInstitutions,
      createdFromGuidebookHeadings: createdGuidebookInstitutions.map(
        (institution) => institution.institutionName
      ),
    },
    institutions,
    tcuDegreesOutsideGuidebookInstitutions,
    droppedBrokenTitleTcuDegreeRecords: droppedBrokenTitleTcuProgrammes.map(
      (programme) => ({
        programmeCode: programme.programmeCode,
        programmeName: programme.programmeName,
        institutionName: programme.institutionName,
        sourceDatasets: programme.sourceDatasets,
      })
    ),
    droppedUncodedTcuDegreeRecords: droppedUncodedTcuProgrammes.map(
      (programme) => ({
        programmeName: programme.programmeName,
        institutionName: programme.institutionName,
        sourceDatasets: programme.sourceDatasets,
      })
    ),
    titleLeakRecoveries,
    repairedTitles,
  }
}

function summarizeTcuFormSixParseStatus(tcuProgrammes: ProcessedProgramme[]) {
  const rulesByKey = new Map<string, ProcessedRequirementRule[]>()
  for (const rule of processedRequirementRules) {
    const key = requirementRuleKey(
      rule.normalizedProgrammeName,
      rule.normalizedInstitutionName
    )
    rulesByKey.set(key, [...(rulesByKey.get(key) ?? []), rule])
  }
  const status = {
    structured: 0,
    partial: 0,
    unparsed: 0,
    programmesWithoutFormSixVariant: 0,
    programmesWithoutRule: 0,
  }
  const seen = new Set<string>()
  for (const programme of tcuProgrammes) {
    const key = requirementRuleKey(
      programme.normalizedProgrammeName,
      programme.normalizedInstitutionName
    )
    if (seen.has(key)) continue
    seen.add(key)
    const rules = rulesByKey.get(key)
    if (!rules) {
      status.programmesWithoutRule += 1
      continue
    }
    const formSixVariants = rules
      .flatMap((rule) => rule.variants)
      .filter((variant) => variant.route === "form_six")
    if (formSixVariants.length === 0) {
      status.programmesWithoutFormSixVariant += 1
    }
    for (const variant of formSixVariants) {
      status[variant.parseStatus] += 1
    }
  }
  return status
}
