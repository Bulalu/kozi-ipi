import { spawnSync } from "node:child_process"
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { basename, dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

import { parse } from "csv-parse/sync"

import { normalizeIdentityName } from "../lib/domain/institution-identity"

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, "..")
const defaultPdfSource =
  "https://tcu.go.tz/sites/default/files/public_notices/2025-07/Admission%20Guidebook%20for%20Holders%20of%20Secondary%20School%20Qualifications_2025_2026.pdf"
const outputDir = join(root, "data/extracted")
const pathwayProgrammesPath = join(
  root,
  "data/raw/tanzania-education-pathways-dataset/programmes.csv"
)
const processedProgrammesPath = join(root, "data/processed/programmes.jsonl")

type CsvRow = Record<string, string>

type ExtractedProgramme = {
  sourcePdf: string
  page: string
  institutionName: string
  normalizedInstitutionName: string
  programmeName: string
  normalizedProgrammeName: string
  programmeCode: string
  admissionRequirements: string
  minimumAdmissionPoints: string
  admissionCapacity: string
  durationYears: string
  needsReview: "yes" | "no"
  reviewReasons: string
}

function normalizeName(value: string | undefined) {
  return normalizeIdentityName(value)
}

function cleanText(value: string | undefined) {
  return (value ?? "")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/\s+/g, " ")
    .trim()
}

function stripRowNumber(value: string) {
  return value.replace(/^\s*\d+[\.,]?\s*/, "").trim()
}

function findRequirementContinuationColumn(
  line: string,
  expectedColumn: number
) {
  const candidates = [...line.matchAll(/ {6,}\S/g)]
    .map((match) => (match.index ?? 0) + match[0].search(/\S/))
    .filter((column) => Math.abs(column - expectedColumn) <= 8)

  return candidates.length > 0 ? Math.min(...candidates) : undefined
}

function isIgnorableLine(line: string) {
  const trimmed = line.trim()
  if (!trimmed) return true
  const headerRemainder = trimmed
    .replace(/\bS\/?\s*N\b/gi, "")
    .replace(/\bSN\b/gi, "")
    .replace(/\bProgramme\b/gi, "")
    .replace(/\bProgramm\b/gi, "")
    .replace(/\bCode\b/gi, "")
    .replace(/\bAdmission\b/gi, "")
    .replace(/\bAdmissio\b/gi, "")
    .replace(/\bRequirements\b/gi, "")
    .replace(/\bMinimum\b/gi, "")
    .replace(/\bInstitutional\b/gi, "")
    .replace(/\bPoints\b/gi, "")
    .replace(/\bCapacity\b/gi, "")
    .replace(/\bCapacit\b/gi, "")
    .replace(/\bDuration\b/gi, "")
    .replace(/\be\b/gi, "")
    .replace(/\bn\b/gi, "")
    .replace(/\by\b/gi, "")
    .replace(/\(Yrs\)/gi, "")
    .replace(/\s+/g, "")
  if (!headerRemainder) return true
  if (trimmed === "5") return true
  if (/^\d+$/.test(trimmed)) return true
  if (/Bachelor.s Degree Admission Guidebook/i.test(trimmed)) return true
  if (/For Holders of Secondary School Qualifications/i.test(trimmed))
    return true
  if (/^S\/?\s*N\b|^SN\b/i.test(trimmed)) return true
  if (/^Programme\s+Code\b/i.test(trimmed)) return true
  if (
    /^(Minimum|Institutional|Admission|Points|Capacity|Duration|Programme)$/i.test(
      trimmed
    )
  )
    return true
  if (/^Minimum\s+Institutional/i.test(trimmed)) return true
  if (/^Admission\s+Requirements/i.test(trimmed)) return true
  if (/^Programme\s+Duration/i.test(trimmed)) return true

  return false
}

function parsePdfText(pdfPath: string) {
  const result = spawnSync("pdftotext", ["-layout", pdfPath, "-"], {
    encoding: "utf8",
  })

  if (result.status !== 0) {
    throw new Error(`pdftotext failed: ${result.stderr}`)
  }

  return result.stdout
}

async function resolvePdfSource(source: string) {
  if (!/^https?:\/\//i.test(source)) {
    return {
      pdfPath: source,
      sourcePdf: basename(source),
    }
  }

  const response = await fetch(source)
  if (!response.ok) {
    throw new Error(
      `Failed to download TCU guidebook PDF: ${response.status} ${response.statusText}`
    )
  }

  const pdfPath = join(tmpdir(), "tcu-secondary-guidebook-2025-2026.pdf")
  writeFileSync(pdfPath, Buffer.from(await response.arrayBuffer()))

  return {
    pdfPath,
    sourcePdf: "TCU secondary qualifications admission guidebook 2025-2026.pdf",
  }
}

function extractPageNumber(page: string, fallback: number) {
  const lines = page
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
  const numeric = [...lines].reverse().find((line) => /^\d{1,4}$/.test(line))
  return numeric ?? String(fallback)
}

function extractInstitutionHeading(page: string) {
  const lines = page.split(/\r?\n/)
  const headerIndex = lines.findIndex((line) =>
    /\bAdmission Requirements\b/i.test(line)
  )
  if (headerIndex < 0) return undefined

  for (let index = headerIndex - 1; index >= 0; index -= 1) {
    const candidate = cleanText(lines[index])
    if (!candidate || isIgnorableLine(candidate)) continue
    if (
      /Table of Content|List of Abbreviations|Important Dates/i.test(candidate)
    )
      continue
    if (candidate.length < 8) continue
    if (
      /\b(University|Institute|College|Academy|Centre|Center|School)\b/i.test(
        candidate
      )
    ) {
      return candidate
    }
  }

  return undefined
}

function parseMetrics(text: string) {
  const normalized = text.replace(/\s+/g, " ").trim()
  const match = normalized.match(
    /^(.*?)(?:((?:\d+\s*(?:\.\s*\d+)?|\d+\s+from\s+3\s+subjects)))\s+(\d{1,5})\s+(\d+(?:\s+or\s+\d+)?)\s*$/i
  )

  if (!match) {
    return {
      body: normalized,
      minimumAdmissionPoints: "",
      admissionCapacity: "",
      durationYears: "",
    }
  }

  return {
    body: cleanText(match[1]),
    minimumAdmissionPoints: cleanText(match[2]).replace(/\s*\.\s*/g, "."),
    admissionCapacity: cleanText(match[3]),
    durationYears: cleanText(match[4]),
  }
}

function isInstitutionHeadingLine(line: string) {
  const trimmed = cleanText(line)
  return (
    /\b(University|Institute|College|Academy|Centre|Center|School)\b/i.test(
      trimmed
    ) &&
    /\([A-Z0-9-]+\)|,\s*[A-Z][A-Za-z ]+$/.test(trimmed) &&
    !/\b(Two|Three|principal|passes|subjects|minimum|applicant|Diploma)\b/i.test(
      trimmed
    )
  )
}

function parseRows(pdfText: string, sourcePdf: string): ExtractedProgramme[] {
  const pages = pdfText.split("\f")
  const rows: ExtractedProgramme[] = []
  let currentInstitution = ""
  let currentPage = ""
  let active:
    | {
        page: string
        institutionName: string
        code: string
        codeColumn: number
        requirementColumn?: number
        firstLine: string
        programmeParts: string[]
        requirementParts: string[]
        points: string
        capacity: string
        duration: string
      }
    | undefined

  function flushActive() {
    if (!active) return

    const programmeName = cleanText(active.programmeParts.join(" "))
    const admissionRequirements = cleanText(active.requirementParts.join(" "))
    const reviewReasons = [
      !active.institutionName ? "missing_institution" : undefined,
      !programmeName ? "missing_programme_name" : undefined,
      !admissionRequirements ? "missing_admission_requirements" : undefined,
      !active.points || !active.capacity || !active.duration
        ? "missing_points_capacity_or_duration"
        : undefined,
      /\b(Bachelor|Doctor|Shahada)\b/i.test(programmeName)
        ? undefined
        : "programme_name_does_not_look_like_degree",
    ].filter(Boolean) as string[]

    rows.push({
      sourcePdf,
      page: active.page,
      institutionName: active.institutionName,
      normalizedInstitutionName: normalizeName(active.institutionName),
      programmeName,
      normalizedProgrammeName: normalizeName(programmeName),
      programmeCode: active.code,
      admissionRequirements,
      minimumAdmissionPoints: active.points,
      admissionCapacity: active.capacity,
      durationYears: active.duration,
      needsReview: reviewReasons.length > 0 ? "yes" : "no",
      reviewReasons: reviewReasons.join("; "),
    })
    active = undefined
  }

  for (const [pageIndex, page] of pages.entries()) {
    currentPage = extractPageNumber(page, pageIndex + 1)
    const heading = extractInstitutionHeading(page)
    if (heading) {
      currentInstitution = heading
    }

    for (const rawLine of page.split(/\r?\n/)) {
      const line = rawLine.replace(/\t/g, " ")
      const trimmed = line.trim()
      if (isIgnorableLine(line) || isInstitutionHeadingLine(line)) {
        continue
      }

      const codeMatch = line.match(/\b[A-Z]{2,6}\d{2,3}\b/)
      const rowStart = /^\s*\d+[\.,]?\s+/.test(line) && codeMatch

      if (rowStart && codeMatch) {
        flushActive()

        const code = codeMatch[0]
        const codeColumn = line.indexOf(code)
        const beforeCode = line.slice(0, codeColumn)
        const afterCode = line.slice(codeColumn + code.length)
        const metrics = parseMetrics(afterCode)
        const afterCodeFirstTextColumn = afterCode.search(/\S/)
        const requirementColumn =
          metrics.body && afterCodeFirstTextColumn >= 0
            ? codeColumn + code.length + afterCodeFirstTextColumn
            : undefined
        active = {
          page: currentPage,
          institutionName: currentInstitution,
          code,
          codeColumn,
          requirementColumn,
          firstLine: line,
          programmeParts: [stripRowNumber(beforeCode)],
          requirementParts: metrics.body ? [metrics.body] : [],
          points: metrics.minimumAdmissionPoints,
          capacity: metrics.admissionCapacity,
          duration: metrics.durationYears,
        }
        continue
      }

      if (!active || !trimmed) {
        continue
      }

      const firstNonSpace = line.search(/\S/)
      if (firstNonSpace < 0) {
        continue
      }

      if (active.requirementColumn === undefined) {
        const likelyRequirementStart = trimmed.search(
          /\b(Two|Three|One|A)\s+(principal|Principal)|\bDiploma\b|^with\s+a\s+minimum\b/i
        )
        const likelyRequirementColumn =
          likelyRequirementStart >= 0
            ? firstNonSpace + likelyRequirementStart
            : undefined

        if (
          likelyRequirementColumn !== undefined &&
          likelyRequirementColumn > active.codeColumn + active.code.length
        ) {
          active.requirementColumn = likelyRequirementColumn
        } else if (firstNonSpace > active.codeColumn) {
          active.requirementColumn = firstNonSpace
        }
      }

      if (active.requirementColumn !== undefined) {
        const splitColumn =
          findRequirementContinuationColumn(line, active.requirementColumn) ??
          active.requirementColumn
        if (splitColumn < active.requirementColumn) {
          active.requirementColumn = splitColumn
        }

        const programmeSegment = line
          .slice(0, Math.max(0, splitColumn - 1))
          .trim()
        const requirementSegment = line.slice(splitColumn).trim()

        if (programmeSegment && firstNonSpace < splitColumn - 2) {
          active.programmeParts.push(programmeSegment)
        }

        if (requirementSegment) {
          addRequirementPart(active, requirementSegment)
        }

        if (!programmeSegment && !requirementSegment) {
          continue
        }

        continue
      }

      if (firstNonSpace < active.codeColumn - 2) {
        active.programmeParts.push(trimmed)
      } else {
        addRequirementPart(active, trimmed)
      }
    }
  }

  flushActive()

  return rows
}

function csvEscape(value: unknown) {
  const text = String(value ?? "")
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`
  }

  return text
}

function addRequirementPart(
  active: {
    requirementParts: string[]
    points: string
    capacity: string
    duration: string
  },
  text: string
) {
  if (isIgnorableLine(text)) return

  const metrics = parseMetrics(text)
  if (metrics.body) {
    active.requirementParts.push(metrics.body)
  }
  active.points ||= metrics.minimumAdmissionPoints
  active.capacity ||= metrics.admissionCapacity
  active.duration ||= metrics.durationYears
}

function writeCsv(path: string, rows: ExtractedProgramme[]) {
  const headers = [
    "sourcePdf",
    "page",
    "institutionName",
    "normalizedInstitutionName",
    "programmeName",
    "normalizedProgrammeName",
    "programmeCode",
    "admissionRequirements",
    "minimumAdmissionPoints",
    "admissionCapacity",
    "durationYears",
    "needsReview",
    "reviewReasons",
  ] as const

  const csv = [
    headers.join(","),
    ...rows.map((row) =>
      headers.map((header) => csvEscape(row[header])).join(",")
    ),
  ].join("\n")

  writeFileSync(path, `${csv}\n`)
}

function readCsv(path: string): CsvRow[] {
  return parse(readFileSync(path, "utf8"), {
    bom: true,
    columns: true,
    skip_empty_lines: true,
  }) as CsvRow[]
}

function readJsonl(path: string): CsvRow[] {
  return readFileSync(path, "utf8")
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line) as CsvRow)
}

function compareAgainstCurrent(rows: ExtractedProgramme[]) {
  const rawRows = existsSync(pathwayProgrammesPath)
    ? readCsv(pathwayProgrammesPath)
    : []
  const processedRows = existsSync(processedProgrammesPath)
    ? readJsonl(processedProgrammesPath)
    : []
  const rawTcuCodes = new Set(
    rawRows
      .filter(
        (row) =>
          row.regulator === "TCU" ||
          row.official_source_url?.includes("tcu.go.tz")
      )
      .map((row) => row.programme_code)
      .filter(Boolean)
  )
  const processedTcuCodes = new Set(
    processedRows
      .filter(
        (row) =>
          row.regulator === "TCU" ||
          row.officialSourceUrl?.includes("tcu.go.tz")
      )
      .map((row) => row.programmeCode)
      .filter(Boolean)
  )

  const extractedCodes = new Set(rows.map((row) => row.programmeCode))
  const missingFromRaw = rows.filter(
    (row) => !rawTcuCodes.has(row.programmeCode)
  )
  const missingFromProcessed = rows.filter(
    (row) => !processedTcuCodes.has(row.programmeCode)
  )
  const rawNotInExtraction = [...rawTcuCodes].filter(
    (code) => !extractedCodes.has(code)
  )
  const processedNotInExtraction = [...processedTcuCodes].filter(
    (code) => !extractedCodes.has(code)
  )

  return {
    extractedRows: rows.length,
    extractedDistinctCodes: extractedCodes.size,
    extractedInstitutionCount: new Set(
      rows.map((row) => row.normalizedInstitutionName)
    ).size,
    needsReviewCount: rows.filter((row) => row.needsReview === "yes").length,
    currentRawTcuCodeCount: rawTcuCodes.size,
    currentProcessedTcuCodeCount: processedTcuCodes.size,
    missingFromRawCount: missingFromRaw.length,
    missingFromProcessedCount: missingFromProcessed.length,
    rawNotInExtractionCount: rawNotInExtraction.length,
    processedNotInExtractionCount: processedNotInExtraction.length,
    missingFromRaw: missingFromRaw.slice(0, 50),
    missingFromProcessed: missingFromProcessed.slice(0, 50),
    rawNotInExtraction: rawNotInExtraction.slice(0, 100),
    processedNotInExtraction: processedNotInExtraction.slice(0, 100),
  }
}

async function main() {
  const pdfSource =
    process.argv[2] ??
    process.env.TCU_SECONDARY_GUIDEBOOK_PDF ??
    defaultPdfSource
  const { pdfPath, sourcePdf } = await resolvePdfSource(pdfSource)

  if (!existsSync(pdfPath)) {
    throw new Error(`TCU guidebook PDF not found: ${pdfPath}`)
  }

  mkdirSync(outputDir, { recursive: true })

  const pdfText = parsePdfText(pdfPath)
  const extractedRows = parseRows(pdfText, sourcePdf)
  const csvPath = join(
    outputDir,
    "tcu-secondary-guidebook-2025-2026-programmes.csv"
  )
  const comparisonPath = join(
    outputDir,
    "tcu-secondary-guidebook-2025-2026-comparison.json"
  )
  const comparison = compareAgainstCurrent(extractedRows)

  writeCsv(csvPath, extractedRows)
  writeFileSync(comparisonPath, JSON.stringify(comparison, null, 2))

  console.log(
    JSON.stringify(
      {
        pdfSource,
        pdfPath,
        csvPath,
        comparisonPath,
        ...comparison,
      },
      null,
      2
    )
  )
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
