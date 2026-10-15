import { mkdir, readFile, writeFile } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const DEFAULT_YEAR = 2026
const DEFAULT_CONCURRENCY = 8
const PARSER_VERSION = "necta-acsee-html-v1"

const SUBJECT_ALIASES = {
  "A/MATHS": "Advanced Mathematics",
  "ADV/MATHS": "Advanced Mathematics",
  ACCOUNTANCY: "Accountancy",
  AGRICULTURE: "Agriculture",
  ARABIC: "Arabic",
  BAM: "Basic Applied Mathematics",
  BIOLOGY: "Biology",
  "BOOK-K": "Book Keeping",
  "BOOK/KEEP": "Book Keeping",
  CHEMISTRY: "Chemistry",
  COMMERCE: "Commerce",
  "COMP/SCI": "Computer Science",
  "COMP/SCIENCE": "Computer Science",
  "COMP/STUD": "Computer Studies",
  "COMP STUD": "Computer Studies",
  "C/SCIENCE": "Computer Science",
  DIVINITY: "Divinity",
  ECONOMICS: "Economics",
  EDUCATION: "Education",
  ENGLISH: "English Language",
  "F & HN NUTRITION": "Food and Nutrition",
  "F/NUTRITION": "Food and Nutrition",
  "FINE ART": "Fine Arts",
  FRENCH: "French",
  "G/STUDIES": "General Studies",
  GEOGR: "Geography",
  GEOGRAPHY: "Geography",
  HISTORY: "History",
  "IS/KNOWLEDGE": "Islamic Knowledge",
  KISWAHILI: "Kiswahili",
  PHYSICS: "Physics",
  "PHY EDU": "Physical Education",
  CHINESE: "Chinese",
}

const VALID_GRADES = new Set(["A", "B", "C", "D", "E", "S", "F"])
const VALID_DIVISIONS = new Set(["I", "II", "III", "IV", "0"])
const args = parseArgs(process.argv.slice(2))
const year = Number(args.year ?? DEFAULT_YEAR)
const baseUrl =
  args.baseUrl ?? `https://matokeo.necta.go.tz/results/${year}/acsee/`
const root = join(dirname(fileURLToPath(import.meta.url)), "..")
const cacheDir = join(root, "data/raw", `necta-acsee-${year}`, "html")
const outputPath = join(
  root,
  args.output ?? `data/processed/acsee-results-${year}.jsonl`
)
const reportPath = join(
  root,
  args.report ?? `data/processed/acsee-results-${year}-report.json`
)
const centreLimit = args.limitCentres ? Number(args.limitCentres) : undefined
const concurrency = Number(args.concurrency ?? DEFAULT_CONCURRENCY)
const useCache = !args.noCache
const fetchedAt = Date.now()

if (!Number.isInteger(year) || year < 2000) {
  throw new Error(`Invalid year: ${args.year}`)
}

await mkdir(cacheDir, { recursive: true })
await mkdir(dirname(outputPath), { recursive: true })

const indexHtml = await fetchTextWithCache(new URL("index.htm", baseUrl), {
  cacheName: "index.htm",
})
const centreLinks = parseCentreLinks(indexHtml, baseUrl)
const selectedCentreLinks =
  centreLimit && centreLimit > 0 ? centreLinks.slice(0, centreLimit) : centreLinks

console.log(
  `Found ${centreLinks.length} ACSEE ${year} centres; processing ${selectedCentreLinks.length}.`
)

const records = []
const failures = []
let processed = 0

await mapWithConcurrency(selectedCentreLinks, concurrency, async (centreLink) => {
  try {
    const html = await fetchTextWithCache(centreLink.url, {
      cacheName: `results-${centreLink.code.toLowerCase()}.htm`,
    })
    const centreRecords = parseCentrePage(html, centreLink, {
      baseUrl,
      fetchedAt,
      year,
    })
    records.push(...centreRecords)
  } catch (error) {
    failures.push({
      code: centreLink.code,
      url: centreLink.url.href,
      error: error instanceof Error ? error.message : String(error),
    })
  } finally {
    processed += 1
    if (processed % 50 === 0 || processed === selectedCentreLinks.length) {
      console.log(
        `Processed ${processed}/${selectedCentreLinks.length} centres; ${records.length} candidate rows.`
      )
    }
  }
})

records.sort((a, b) =>
  a.normalizedIndexNumber.localeCompare(b.normalizedIndexNumber)
)

await writeFile(
  outputPath,
  `${records.map((record) => JSON.stringify(record)).join("\n")}\n`
)

const report = {
  examType: "ACSEE",
  examYear: year,
  sourceIndexUrl: new URL("index.htm", baseUrl).href,
  centreCount: selectedCentreLinks.length,
  totalCentreCount: centreLinks.length,
  recordCount: records.length,
  failureCount: failures.length,
  failures,
  parserVersion: PARSER_VERSION,
  generatedAt: new Date(fetchedAt).toISOString(),
}

await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`)
console.log(`Wrote ${records.length} rows to ${relative(outputPath)}`)
console.log(`Wrote import report to ${relative(reportPath)}`)

function parseCentreLinks(html, sourceBaseUrl) {
  const links = []
  const seen = new Set()
  const linkPattern =
    /href\s*=\s*["'](results\/([ps]\d{4})\.htm)["'][^>]*>([^<\r\n]+)/gi

  for (const match of html.matchAll(linkPattern)) {
    const path = match[1]
    const code = match[2].toUpperCase()
    if (seen.has(code)) continue
    seen.add(code)
    links.push({
      code,
      label: cleanText(match[3]),
      path,
      url: new URL(path, sourceBaseUrl),
    })
  }

  return links
}

function parseCentrePage(html, centreLink, context) {
  const pageCentre = parsePageCentre(html)
  const centreCode = pageCentre?.code ?? centreLink.code
  const centreName = pageCentre?.name ?? normalizeCentreLabel(centreLink.label)
  const sourceUrl = centreLink.url.href
  const rows = []

  for (const rowHtml of html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const cells = Array.from(
      rowHtml[1].matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi),
      (match) => cleanText(match[1])
    )
    if (cells.length < 5) continue

    const indexNumber = formatAcseeIndexNumber(cells[0])
    if (!/^[A-Z]\d{4}\/\d{4}$/.test(indexNumber)) continue

    const subjects = parseSubjectDetails(cells.slice(4).join(" "))
    const division = cells[3].toUpperCase()
    const aggregatePoints = Number.parseInt(cells[2], 10)
    const validSubjectCount = subjects.filter((subject) =>
      VALID_GRADES.has(subject.grade)
    ).length

    rows.push({
      examType: "ACSEE",
      examYear: context.year,
      indexNumber,
      normalizedIndexNumber: normalizeAcseeIndexNumber(indexNumber),
      centreCode,
      centreName,
      centreType: centreCode.startsWith("P") ? "private_centre" : "school",
      sex: cells[1].toUpperCase(),
      aggregate: cells[2],
      ...(Number.isFinite(aggregatePoints) ? { aggregatePoints } : {}),
      division,
      resultStatus:
        VALID_DIVISIONS.has(division) && validSubjectCount >= 2
          ? "released"
          : division === "ABS"
            ? "absent"
            : "not_eligible_for_lookup",
      subjects,
      subjectSummary: subjects
        .map((subject) => `${subject.subject} ${subject.grade}`)
        .join(", "),
      sourceUrl,
      sourcePath: centreLink.path,
      parserVersion: PARSER_VERSION,
      fetchedAt: context.fetchedAt,
    })
  }

  return rows
}

function parsePageCentre(html) {
  const match = html.match(/<h3\b[^>]*>[\s\S]*?([SP]\d{4})\s+([^<\r\n]+)/i)
  if (!match) return null

  return {
    code: match[1].toUpperCase(),
    name: normalizeCentreLabel(match[2]),
  }
}

function parseSubjectDetails(value) {
  const subjects = []
  const subjectPattern = /([A-Z][A-Z0-9/&.\-\s]*?)\s*-\s*'([A-Z])'/g

  for (const match of value.matchAll(subjectPattern)) {
    const rawSubject = match[1].trim().replace(/\s+/g, " ")
    const subject = normalizeSubjectLabel(rawSubject)
    subjects.push({
      rawSubject,
      subject,
      normalizedSubject: normalizeSubjectName(subject),
      grade: match[2].trim().toUpperCase(),
    })
  }

  return subjects
}

async function fetchTextWithCache(url, { cacheName }) {
  const cachePath = join(cacheDir, cacheName)

  if (useCache) {
    try {
      return await readFile(cachePath, "utf8")
    } catch {
      // Cache miss; fetch below.
    }
  }

  const bytes = await fetchBytesWithRetry(url)
  const text = new TextDecoder("windows-1252").decode(bytes)
  await writeFile(cachePath, text)

  return text
}

async function fetchBytesWithRetry(url) {
  let lastError

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText}`)
      }
      return await response.arrayBuffer()
    } catch (error) {
      lastError = error
      await sleep(300 * attempt)
    }
  }

  throw lastError
}

async function mapWithConcurrency(items, limit, worker) {
  const queue = [...items]
  const workers = Array.from({ length: Math.max(1, limit) }, async () => {
    while (queue.length > 0) {
      const item = queue.shift()
      if (!item) return
      await worker(item)
    }
  })

  await Promise.all(workers)
}

function normalizeAcseeIndexNumber(value) {
  const compact = value.toUpperCase().replace(/[^A-Z0-9]/g, "")
  const match = compact.match(/^([A-Z]\d{4})(\d{4})$/)

  return match ? `${match[1]}${match[2]}` : compact
}

function formatAcseeIndexNumber(value) {
  const normalized = normalizeAcseeIndexNumber(value)
  const match = normalized.match(/^([A-Z]\d{4})(\d{4})$/)

  return match ? `${match[1]}/${match[2]}` : value.trim().toUpperCase()
}

function normalizeSubjectLabel(rawSubject) {
  const key = rawSubject.trim().toUpperCase().replace(/\s+/g, " ")
  return SUBJECT_ALIASES[key] ?? titleCaseSubject(key)
}

function normalizeSubjectName(subject) {
  const normalized = subject
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ")

  const aliases = {
    "advanced math": "advanced_mathematics",
    "advanced mathematics": "advanced_mathematics",
    "basic applied mathematics": "basic_applied_mathematics",
    "book keeping": "bookkeeping",
    "computer studies": "computer_science",
    "computer science": "computer_science",
    "english language": "english",
    "food and nutrition": "food_and_nutrition",
    "general studies": "general_studies",
  }

  return aliases[normalized] ?? normalized.replaceAll(" ", "_")
}

function normalizeCentreLabel(value) {
  return cleanText(value)
    .replace(/\bCENTRE\b$/i, "")
    .replace(/\s+/g, " ")
    .trim()
}

function cleanText(value) {
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim()
}

function titleCaseSubject(value) {
  return value
    .toLowerCase()
    .split(/[\s/]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

function parseArgs(rawArgs) {
  const parsed = {}

  for (let index = 0; index < rawArgs.length; index += 1) {
    const arg = rawArgs[index]
    if (!arg.startsWith("--")) continue

    const key = toCamelCase(arg.slice(2))
    const next = rawArgs[index + 1]
    if (!next || next.startsWith("--")) {
      parsed[key] = true
    } else {
      parsed[key] = next
      index += 1
    }
  }

  return parsed
}

function toCamelCase(value) {
  return value.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())
}

function relative(value) {
  return value.replace(`${root}/`, "")
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
