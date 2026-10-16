import { spawnSync } from "node:child_process"
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { basename, dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

import { parse } from "csv-parse/sync"

import { createSplitWordRepairer } from "../lib/data/tcu-guidebook"
import { normalizeIdentityName } from "../lib/domain/institution-identity"
import { isTcuProgrammeCode } from "../lib/domain/tcu-programme-code"

// Extracts the TCU Bachelor's degree admission guidebook (holders of
// secondary school qualifications) into one CSV row per programme code.
//
// The parser works on pdftotext word bounding boxes rather than the
// plain-text layout so that it can split the Programme / Code / Admission
// Requirements / metrics columns by x position. That avoids the classic
// layout-text failures: codes glued to requirement text ("AKU01Three"),
// row numbers printed on a later line than the code, programme names that
// overflow into the code column, and institution headings that appear at the
// bottom of the previous institution's page.

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
  minimumAdmissionPointsSubjects: string
  admissionCapacity: string
  durationYears: string
  needsReview: "yes" | "no"
  reviewReasons: string
}

type Word = { x0: number; y0: number; x1: number; y1: number; text: string }
type Line = { y: number; words: Word[]; text: string }
type Page = { width: number; height: number; words: Word[] }

type TocEntry = {
  name: string
  normalizedName: string
  page: number
  unlisted?: boolean
}

type Columns = {
  snX: number
  codeHeaderX: number
  metricsX: number
  headerY: number
}

type ActiveRow = {
  page: string
  institutionName: string
  code: string
  codeX: number
  pageIndex: number
  nameWords: string[]
  requirementWords: string[]
  metricWords: Word[]
  trailingPointsWord?: Word
  trailingPointsIndex?: number
}

function decodeEntities(value: string) {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
}

function cleanText(value: string | undefined) {
  return (value ?? "")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/\s+/g, " ")
    .trim()
}

function normalizeName(value: string | undefined) {
  return normalizeIdentityName(value)
}

function readBboxPages(pdfPath: string): Page[] {
  const result = spawnSync("pdftotext", ["-bbox", pdfPath, "-"], {
    encoding: "utf8",
    maxBuffer: 256 * 1024 * 1024,
  })

  if (result.status !== 0) {
    throw new Error(`pdftotext failed: ${result.stderr}`)
  }

  const pages: Page[] = []
  const pagePattern =
    /<page width="([\d.]+)" height="([\d.]+)">([\s\S]*?)<\/page>/g
  const wordPattern =
    /<word xMin="([\d.]+)" yMin="([\d.]+)" xMax="([\d.]+)" yMax="([\d.]+)">([\s\S]*?)<\/word>/g

  for (const pageMatch of result.stdout.matchAll(pagePattern)) {
    const words: Word[] = []
    for (const wordMatch of pageMatch[3].matchAll(wordPattern)) {
      words.push({
        x0: Number(wordMatch[1]),
        y0: Number(wordMatch[2]),
        x1: Number(wordMatch[3]),
        y1: Number(wordMatch[4]),
        text: decodeEntities(wordMatch[5]),
      })
    }
    pages.push({
      width: Number(pageMatch[1]),
      height: Number(pageMatch[2]),
      words: dropOverprintedWords(words),
    })
  }

  return pages
}

// Some guidebook pages draw text twice (fake bold), which pdftotext reports
// as duplicate words at the same position.
function dropOverprintedWords(words: Word[]) {
  const kept: Word[] = []
  for (const word of words) {
    const duplicate = kept.some(
      (other) =>
        other.text === word.text &&
        Math.abs(other.x0 - word.x0) < 1.5 &&
        Math.abs(other.y0 - word.y0) < 1.5
    )
    if (!duplicate) kept.push(word)
  }
  return kept
}

function groupLines(words: Word[]): Line[] {
  // Group on the top edge: pdftotext reports inconsistent glyph heights for
  // some fonts in this PDF, so vertical centres drift between columns.
  const sorted = [...words].sort((a, b) => a.y0 - b.y0 || a.x0 - b.x0)
  const lines: Array<{ y: number; words: Word[] }> = []

  for (const word of sorted) {
    const line = lines.at(-1)
    if (line && Math.abs(line.y - word.y0) <= 3) {
      line.words.push(word)
      continue
    }
    lines.push({ y: word.y0, words: [word] })
  }

  return lines.map((line) => {
    const lineWords = line.words.sort((a, b) => a.x0 - b.x0)
    return {
      y: line.y,
      words: lineWords,
      text: cleanText(lineWords.map((word) => word.text).join(" ")),
    }
  })
}

const institutionWordPattern =
  /\b(University|Institute|College|Academy|Centre|Center|School)\b/i

function parseTableOfContents(pages: Page[]): TocEntry[] {
  const entries: TocEntry[] = []

  for (const page of pages.slice(0, 12)) {
    const lines = groupLines(page.words)
    let pending = ""

    for (const line of lines) {
      const text = line.text
      if (isRunningHeaderOrFooter(line, lines)) continue
      const dotted = text.match(/^(.*?\S)\s*(?:\.{2,}\s*|\s)(\d{1,3})\s*$/)

      if (!dotted) {
        pending =
          !pending && institutionWordPattern.test(text) && !/^\d/.test(text)
            ? text
            : ""
        continue
      }

      const name = cleanText(`${pending} ${dotted[1]}`.replace(/\.+$/, ""))
      pending = ""
      if (!name || /^\d/.test(name) || /^Table\s+\d/i.test(name)) continue
      if (!institutionWordPattern.test(name) && !/\([A-Za-z-]+\)/.test(name))
        continue

      entries.push({
        name,
        normalizedName: normalizeName(name),
        page: Number(dotted[2]),
      })
    }
  }

  return entries
}

// pdftotext's bbox coordinates for this PDF are not in the same units as the
// reported page size, so the footer is located relative to the lowest line.
function isPageNumberLine(line: Line, lines: Line[]) {
  const lowest = Math.max(...lines.map((other) => other.y))
  return lowest - line.y < 6 && /^[ivx\d]{1,4}$/i.test(line.text)
}

function isRunningHeaderOrFooter(line: Line, lines: Line[]) {
  if (/Bachelor.s Degree Admission Guidebook/i.test(line.text)) return true
  if (/^\(?For Holders of Secondary School Qualifications\)?$/i.test(line.text))
    return true
  if (isPageNumberLine(line, lines)) return true
  return false
}

const headerVocabulary =
  /^(S\/?N|S\/|N|SN|Programme|Programm|e|Code|Admission|Admissio|n|Requirements|Minimum|Institutional|Points|Capacity|Capacit|y|Duration|\(Yrs\)|Yrs)$/i

function isHeaderVocabularyLine(line: Line) {
  return line.words.every((word) => headerVocabulary.test(word.text.trim()))
}

function findHeader(line: Line, lines: Line[]): Columns | undefined {
  const code = line.words.find((word) => /^Code$/i.test(word.text))
  const hasRequirements = line.words.some((word) =>
    /^Requirements?$/i.test(word.text)
  )
  if (!code || !hasRequirements) return undefined

  const nearby = lines.filter((other) => Math.abs(other.y - line.y) <= 32)
  const nearbyWords = nearby.flatMap((other) => other.words)
  const metricHeaderWords = nearbyWords.filter(
    (word) => /^(Minimu|Institutio)/i.test(word.text) && word.x0 > code.x1 + 60
  )
  const fallbackMetricWords = nearbyWords.filter(
    (word) =>
      /^(Points|Capacity|Capacit|Duration|\(Yrs\))$/i.test(word.text) &&
      word.x0 > code.x1 + 60
  )
  const metricsX =
    metricHeaderWords.length > 0
      ? Math.min(...metricHeaderWords.map((word) => word.x0))
      : Math.min(...fallbackMetricWords.map((word) => word.x0)) - 12
  const sn = line.words.find((word) => /^(S\/?|SN|S\/N)$/i.test(word.text))

  return {
    snX: sn?.x0 ?? line.words[0].x0,
    codeHeaderX: code.x0,
    metricsX: Number.isFinite(metricsX) ? metricsX - 3 : code.x0 + 260,
    headerY: line.y,
  }
}

const codeWordPattern = /^([A-Z]{2,6}\d{2,3}|[A-Z]{3,5}\d)(?![0-9])(.*)$/

function splitCodeWord(word: Word) {
  const match = word.text.match(codeWordPattern)
  if (!match || !isTcuProgrammeCode(match[1])) return undefined
  const rest = match[2]
  // A glued continuation must look like the start of requirement prose
  // ("AKU01Three"), not like an alphanumeric token ("UD001A").
  if (rest && !/^[A-Z][a-z]/.test(rest) && !/^[\s.,;:]/.test(rest))
    return undefined

  return { code: match[1], rest: rest.trim() }
}

function isSerialNumberWord(word: Word, columns: Columns) {
  return /^\d{1,3}[.,]?$/.test(word.text) && word.x0 < columns.codeHeaderX - 30
}

const metricTokenPattern =
  /^(\d+(?:[.,]\d+)?|\.\d+|\d+\.|from|subjects?|or|-|–|\d+[-–]\d+)$/i

function clusterMetricWords(words: Word[]) {
  const clusters: Array<{ x0: number; x1: number; words: Word[] }> = []
  for (const word of [...words].sort((a, b) => a.x0 - b.x0)) {
    const cluster = clusters.find(
      (candidate) => word.x0 <= candidate.x1 + 4 && word.x1 >= candidate.x0 - 4
    )
    if (cluster) {
      cluster.words.push(word)
      cluster.x0 = Math.min(cluster.x0, word.x0)
      cluster.x1 = Math.max(cluster.x1, word.x1)
    } else {
      clusters.push({ x0: word.x0, x1: word.x1, words: [word] })
    }
  }

  return clusters
    .sort((a, b) => a.x0 - b.x0)
    .map((cluster) =>
      cleanText(
        cluster.words
          .sort((a, b) => a.y0 - b.y0 || a.x0 - b.x0)
          .map((word) => word.text)
          .join(" ")
      )
    )
}

function parseMetrics(words: Word[]) {
  const metricWords = words.filter((word) => metricTokenPattern.test(word.text))
  const ignoredWords = words.filter(
    (word) => !metricTokenPattern.test(word.text)
  )
  const clusters = clusterMetricWords(metricWords).map((text) =>
    text.replace(/\s*\.\s*/g, ".").replace(/,(?=\d{3}\b)/g, "")
  )
  const text = clusters.join(" | ")
  const empty = {
    points: "",
    pointsSubjects: "",
    capacity: "",
    duration: "",
    parsed: false,
    text,
    ignored: ignoredWords.map((word) => word.text).join(" "),
  }
  if (clusters.length === 2) {
    // Duration column left blank in the guidebook: keep what is printed.
    const partialPoints = clusters[0].match(/^(\d+(?:\.\d+)?)$/)
    const partialCapacity = clusters[1].replace(/\s+/g, "").match(/^\d{1,5}$/)
    if (partialPoints && partialCapacity) {
      return {
        ...empty,
        points: partialPoints[1],
        capacity: partialCapacity[0],
      }
    }
  }
  if (clusters.length !== 3) return empty

  const [pointsText, capacityText, durationText] = clusters
  const points = pointsText.match(
    /^(\d+(?:\.\d+)?)(?:\s*from\s*(\d+)(?:\s*subjects?)?)?$/i
  )
  // Capacity digits occasionally wrap onto a second line ("20" / "0").
  const capacity = capacityText.replace(/\s+/g, "").match(/^\d{1,5}$/)
  const duration = durationText.match(/^(\d+)(?:\s*(?:or|-|–)\s*(\d+))?$/i)
  if (!points || !capacity || !duration) return empty

  return {
    points: points[1],
    pointsSubjects: points[2] ?? "",
    capacity: capacity[0],
    duration: duration[2]
      ? `${duration[1]}${/or/i.test(durationText) ? " or " : "-"}${duration[2]}`
      : duration[1],
    parsed: true,
    text,
    ignored: empty.ignored,
  }
}

function startsProgrammeName(words: string[]) {
  return /^(Bachelor|Doctor|Shahada)\b/i.test(words[0] ?? "")
}

function cleanProgrammeName(words: string[]) {
  return cleanText(words.join(" "))
    .replace(/\s+([,.;:)])/g, "$1")
    .replace(/\(\s+/g, "(")
    .replace(/\s*-\s*$/g, "")
    .replace(/[.,;:]+$/g, "")
    .trim()
}

function cleanRequirementText(words: string[]) {
  return cleanText(words.join(" "))
    .replace(/\s+([,.;:)])/g, "$1")
    .replace(/,(?=[A-Za-z])/g, ", ")
    .trim()
}

function looksLikeUnlistedHeading(lines: Line[], index: number) {
  const line = lines[index]
  if (
    !/\b(University|Institute|College|Academy|Centre|Center|School)\b/.test(
      line.text
    ) ||
    !/\([A-Za-z][A-Za-z0-9 .–-]*\)/.test(line.text) ||
    /\b(principal|passes|subjects|applicant|minimum)\b/i.test(line.text) ||
    line.words.some((word) => splitCodeWord(word) !== undefined)
  )
    return false

  return lines
    .slice(index + 1, index + 8)
    .some(
      (other) =>
        other.y - line.y < 90 &&
        other.words.some((word) => /^Code$/i.test(word.text)) &&
        other.words.some((word) => /^Requirements?$/i.test(word.text))
    )
}

function matchHeading(
  lines: Line[],
  index: number,
  toc: Map<string, TocEntry>
): { entry: TocEntry; consumed: number } | undefined {
  const single = normalizeName(lines[index].text)
  const direct = toc.get(single)
  if (direct) return { entry: direct, consumed: 1 }

  // Institutions missing from the table of contents (e.g. MS-TCDC) still get
  // a centred heading line directly above their programme table.
  if (looksLikeUnlistedHeading(lines, index)) {
    const entry = {
      name: lines[index].text,
      normalizedName: single,
      page: 0,
      unlisted: true,
    }
    toc.set(single, entry)
    return { entry, consumed: 1 }
  }

  const next = lines[index + 1]
  if (next && next.y - lines[index].y < 22) {
    const joined = normalizeName(`${lines[index].text} ${next.text}`)
    const joinedEntry = toc.get(joined)
    if (joinedEntry) return { entry: joinedEntry, consumed: 2 }
  }

  return undefined
}

function parseRows(pages: Page[], sourcePdf: string) {
  const tocEntries = parseTableOfContents(pages)
  const toc = new Map(tocEntries.map((entry) => [entry.normalizedName, entry]))
  const rows: ExtractedProgramme[] = []
  const headingsSeen = new Set<string>()
  const unparsedMetricRows: Array<{
    code: string
    text: string
    ignored: string
  }> = []
  let currentInstitution = ""
  let columns: Columns | undefined
  let codeOffset = -8
  let active: ActiveRow | undefined

  function flushActive() {
    if (!active) return

    const programmeName = cleanProgrammeName(active.nameWords)
    const admissionRequirements = cleanRequirementText(active.requirementWords)
    let metrics = parseMetrics(active.metricWords)
    if (!metrics.parsed && active.trailingPointsWord) {
      // Points printed so far left that they sit inside the requirements
      // column on the code line ("... at a 4.0").
      const retry = parseMetrics([
        active.trailingPointsWord,
        ...active.metricWords,
      ])
      if (retry.parsed) {
        metrics = retry
        active.requirementWords.splice(active.trailingPointsIndex ?? -1, 1)
      }
    }
    if (!metrics.parsed) {
      unparsedMetricRows.push({
        code: active.code,
        text: metrics.text,
        ignored: metrics.ignored,
      })
    }
    const reviewReasons = [
      !active.institutionName ? "missing_institution" : undefined,
      !active.code ? "missing_programme_code_in_guidebook" : undefined,
      !programmeName ? "missing_programme_name" : undefined,
      !admissionRequirements ? "missing_admission_requirements" : undefined,
      !metrics.parsed ? "missing_points_capacity_or_duration" : undefined,
      /^(Bachelor|Doctor|Shahada)\b/i.test(programmeName)
        ? undefined
        : "programme_name_does_not_look_like_degree",
      (programmeName.match(/\b(Bachelor|Doctor|Shahada)\b/gi)?.length ?? 0) > 1
        ? "programme_name_contains_multiple_awards"
        : undefined,
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
      minimumAdmissionPoints: metrics.points,
      minimumAdmissionPointsSubjects: metrics.pointsSubjects,
      admissionCapacity: metrics.capacity,
      durationYears: metrics.duration,
      needsReview: reviewReasons.length > 0 ? "yes" : "no",
      reviewReasons: reviewReasons.join("; "),
    })
    active = undefined
  }

  function newRow(
    page: string,
    institutionName: string,
    pageIndex: number
  ): ActiveRow {
    return {
      page,
      institutionName,
      code: "",
      codeX: 0,
      pageIndex,
      nameWords: [],
      requirementWords: [],
      metricWords: [],
    }
  }

  for (const [pageIndex, page] of pages.entries()) {
    const lines = groupLines(page.words)
    const footer = [...lines]
      .reverse()
      .find((line) => isPageNumberLine(line, lines))
    const printedPage = footer?.text ?? String(pageIndex + 1)

    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index]
      if (isRunningHeaderOrFooter(line, lines)) continue

      const heading = matchHeading(lines, index, toc)
      if (heading) {
        index += heading.consumed - 1
        // Only treat it as an institution change when the guidebook's
        // programme section has started (the TOC itself also matches).
        if (pageIndex > 8) {
          headingsSeen.add(heading.entry.normalizedName)
          if (heading.entry.name !== currentInstitution) {
            flushActive()
            currentInstitution = heading.entry.name
          }
        }
        continue
      }

      const header = findHeader(line, lines)
      if (header) {
        columns = header
        continue
      }

      if (!columns) continue
      // Stray page numbers outside the metrics columns are layout noise.
      if (
        /^\d{1,4}$/.test(line.text) &&
        line.words.every((word) => word.x0 < columns!.metricsX)
      )
        continue
      if (
        Math.abs(line.y - columns.headerY) <= 32 &&
        isHeaderVocabularyLine(line)
      )
        continue

      const codeIndex = line.words.findIndex(
        (word) =>
          word.x0 >= columns!.codeHeaderX - 50 &&
          word.x0 < columns!.metricsX &&
          splitCodeWord(word) !== undefined
      )

      if (codeIndex >= 0) {
        const codeWord = line.words[codeIndex]
        const split = splitCodeWord(codeWord)!
        const lineNameWords = line.words
          .slice(0, codeIndex)
          .filter((word) => !isSerialNumberWord(word, columns!))
          .map((word) => word.text)
        codeOffset = codeWord.x0 - columns.codeHeaderX

        // A vertically centred cell can print the start of the programme
        // name (and requirements) above the line that carries the code.
        const continuesPendingRow =
          active !== undefined &&
          !active.code &&
          !startsProgrammeName(lineNameWords)
        if (!continuesPendingRow) {
          flushActive()
          active = newRow(printedPage, currentInstitution, pageIndex)
        }
        const row = active!
        row.code = split.code
        row.codeX = codeWord.x0
        row.nameWords.push(...lineNameWords)
        if (split.rest) row.requirementWords.push(split.rest)
        const afterCode = line.words.slice(codeIndex + 1)
        for (const word of afterCode) {
          if (word.x0 >= columns.metricsX) row.metricWords.push(word)
          else row.requirementWords.push(word.text)
        }
        const lastRequirementWord = afterCode
          .filter((word) => word.x0 < columns!.metricsX)
          .at(-1)
        if (lastRequirementWord && /^\d\.\d$/.test(lastRequirementWord.text)) {
          row.trailingPointsWord = lastRequirementWord
          row.trailingPointsIndex = row.requirementWords.length - 1
        }
        continue
      }

      const firstWord = line.words[0]
      const startsAtMargin =
        firstWord.x0 < columns.snX + 8 &&
        !isSerialNumberWord(firstWord, columns)
      if (startsAtMargin) {
        // Full-width prose (notes, footnotes) ends the current table row.
        flushActive()
        continue
      }

      const boundary =
        (active?.code && active.pageIndex === pageIndex
          ? active.codeX
          : columns.codeHeaderX + codeOffset) - 3
      const nameWords: string[] = []
      const requirementWords: string[] = []
      const metricWords: Word[] = []
      for (const word of line.words) {
        if (isSerialNumberWord(word, columns)) continue
        if (word.x0 >= columns.metricsX) metricWords.push(word)
        else if (word.x0 >= boundary) requirementWords.push(word.text)
        else nameWords.push(word.text)
      }

      if (startsProgrammeName(nameWords)) {
        const startsNewRow =
          !active || (active.code !== "" && active.nameWords.length > 0)
        if (startsNewRow) {
          flushActive()
          active = newRow(printedPage, currentInstitution, pageIndex)
        } else if (active && !active.code && active.nameWords.length > 0) {
          // Two programme names in a row without a code between them: the
          // first one is a guidebook row that has no programme code.
          flushActive()
          active = newRow(printedPage, currentInstitution, pageIndex)
        }
      }

      if (!active) continue
      active.nameWords.push(...nameWords)
      active.requirementWords.push(...requirementWords)
      active.metricWords.push(...metricWords)
    }
  }

  flushActive()

  const institutionsWithoutHeading = tocEntries.filter(
    (entry) => !headingsSeen.has(entry.normalizedName)
  )
  const unlistedHeadings = [...toc.values()].filter((entry) => entry.unlisted)

  return {
    rows,
    tocEntries,
    institutionsWithoutHeading,
    unlistedHeadings,
    unparsedMetricRows,
  }
}

// Rows where the guidebook PDF itself overprints the programme name on top of
// the code and requirement columns, so no column split can recover it. Each
// fix was checked against the rendered page.
const sourceLayoutFixes: Record<
  string,
  { programmeName: string; removeFromRequirements: RegExp; page: string }
> = {
  // LGTI p.116: "Bachelor Degree in Accounting and Finance" is drawn across
  // the code and requirement cells.
  LGT04: {
    programmeName: "Bachelor Degree in Accounting and Finance",
    removeFromRequirements: /^Two Accounting and Principal Finance Passes/,
    page: "116",
  },
}

function applySourceLayoutFixes(rows: ExtractedProgramme[]) {
  return rows.map((row) => {
    const fix = sourceLayoutFixes[row.programmeCode]
    if (!fix || row.page !== fix.page) return row

    const programmeName = fix.programmeName
    const admissionRequirements = row.admissionRequirements.replace(
      fix.removeFromRequirements,
      "Two Principal Passes"
    )
    const reviewReasons = row.reviewReasons
      .split("; ")
      .filter(
        (reason) =>
          reason && reason !== "programme_name_does_not_look_like_degree"
      )
    return {
      ...row,
      programmeName,
      normalizedProgrammeName: normalizeName(programmeName),
      admissionRequirements,
      needsReview:
        reviewReasons.length > 0 ? ("yes" as const) : ("no" as const),
      reviewReasons: reviewReasons.join("; "),
    }
  })
}

// Rejoin words that the PDF wraps without a hyphen ("Telecommunicat ion",
// "Environme ntal", "Manage ment") using the guidebook's own vocabulary.
function repairSplitWords(rows: ExtractedProgramme[]) {
  const repair = createSplitWordRepairer(
    rows.flatMap((row) => [row.programmeName, row.admissionRequirements])
  )

  return rows.map((row) => {
    const programmeName = repair(row.programmeName)
    const admissionRequirements = repair(row.admissionRequirements)
    return {
      ...row,
      programmeName,
      normalizedProgrammeName: normalizeName(programmeName),
      admissionRequirements,
    }
  })
}

function csvEscape(value: unknown) {
  const text = String(value ?? "")
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`
  }

  return text
}

const csvHeaders = [
  "sourcePdf",
  "page",
  "institutionName",
  "normalizedInstitutionName",
  "programmeName",
  "normalizedProgrammeName",
  "programmeCode",
  "admissionRequirements",
  "minimumAdmissionPoints",
  "minimumAdmissionPointsSubjects",
  "admissionCapacity",
  "durationYears",
  "needsReview",
  "reviewReasons",
] as const

function writeCsv(path: string, rows: ExtractedProgramme[]) {
  const csv = [
    csvHeaders.join(","),
    ...rows.map((row) =>
      csvHeaders.map((header) => csvEscape(row[header])).join(",")
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

function compareAgainstCurrent(
  rows: ExtractedProgramme[],
  extraction: Omit<ReturnType<typeof parseRows>, "rows">
) {
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

  const codeCounts = new Map<string, number>()
  for (const row of rows) {
    codeCounts.set(
      row.programmeCode,
      (codeCounts.get(row.programmeCode) ?? 0) + 1
    )
  }
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
  const programmesByInstitution = new Map<string, number>()
  for (const row of rows) {
    programmesByInstitution.set(
      row.institutionName,
      (programmesByInstitution.get(row.institutionName) ?? 0) + 1
    )
  }

  return {
    extractedRows: rows.length,
    extractedDistinctCodes: extractedCodes.size,
    duplicateCodes: [...codeCounts]
      .filter(([, count]) => count > 1)
      .map(([code]) => code),
    tableOfContentsInstitutionCount: extraction.tocEntries.length,
    extractedInstitutionCount: programmesByInstitution.size,
    tableOfContentsInstitutionsWithoutProgrammes: extraction.tocEntries
      .filter((entry) => !programmesByInstitution.has(entry.name))
      .map((entry) => entry.name),
    tableOfContentsInstitutionsWithoutHeading:
      extraction.institutionsWithoutHeading.map((entry) => entry.name),
    headingsNotInTableOfContents: extraction.unlistedHeadings.map(
      (entry) => entry.name
    ),
    unparsedMetricRows: extraction.unparsedMetricRows,
    needsReviewCount: rows.filter((row) => row.needsReview === "yes").length,
    needsReview: rows
      .filter((row) => row.needsReview === "yes")
      .map((row) => ({
        programmeCode: row.programmeCode,
        programmeName: row.programmeName,
        institutionName: row.institutionName,
        reviewReasons: row.reviewReasons,
      })),
    programmesByInstitution: Object.fromEntries(
      [...programmesByInstitution].sort((a, b) => a[0].localeCompare(b[0]))
    ),
    currentRawTcuCodeCount: rawTcuCodes.size,
    currentProcessedTcuCodeCount: processedTcuCodes.size,
    missingFromRawCount: missingFromRaw.length,
    missingFromProcessedCount: missingFromProcessed.length,
    rawNotInExtractionCount: rawNotInExtraction.length,
    processedNotInExtractionCount: processedNotInExtraction.length,
    missingFromRaw: missingFromRaw.map((row) => row.programmeCode),
    missingFromProcessed: missingFromProcessed.map((row) => row.programmeCode),
    rawNotInExtraction,
    processedNotInExtraction,
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

  const pages = readBboxPages(pdfPath)
  const { rows: parsedRows, ...extraction } = parseRows(pages, sourcePdf)
  const rows = repairSplitWords(applySourceLayoutFixes(parsedRows))
  const csvPath = join(
    outputDir,
    "tcu-secondary-guidebook-2025-2026-programmes.csv"
  )
  const comparisonPath = join(
    outputDir,
    "tcu-secondary-guidebook-2025-2026-comparison.json"
  )
  const comparison = compareAgainstCurrent(rows, extraction)

  writeCsv(csvPath, rows)
  writeFileSync(comparisonPath, `${JSON.stringify(comparison, null, 2)}\n`)

  console.log(
    JSON.stringify(
      {
        pdfSource,
        csvPath,
        comparisonPath,
        extractedRows: comparison.extractedRows,
        extractedDistinctCodes: comparison.extractedDistinctCodes,
        duplicateCodes: comparison.duplicateCodes,
        tableOfContentsInstitutionCount:
          comparison.tableOfContentsInstitutionCount,
        extractedInstitutionCount: comparison.extractedInstitutionCount,
        tableOfContentsInstitutionsWithoutProgrammes:
          comparison.tableOfContentsInstitutionsWithoutProgrammes,
        tableOfContentsInstitutionsWithoutHeading:
          comparison.tableOfContentsInstitutionsWithoutHeading,
        headingsNotInTableOfContents: comparison.headingsNotInTableOfContents,
        unparsedMetricRows: comparison.unparsedMetricRows,
        needsReviewCount: comparison.needsReviewCount,
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
