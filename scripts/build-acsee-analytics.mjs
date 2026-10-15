import fs from "node:fs"
import path from "node:path"
import readline from "node:readline"
import { fileURLToPath } from "node:url"
import { parse } from "csv-parse/sync"

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url))
const ROOT_DIR = path.resolve(SCRIPT_DIR, "..")
const RESULTS_PATH = path.join(
  ROOT_DIR,
  "data/processed/acsee-results-2026.jsonl"
)
const CACHE_DIR = path.join(ROOT_DIR, "data/raw/acsee-analytics-2026")
const TAMISEMI_CACHE_PATH = path.join(CACHE_DIR, "tamisemi-centres.json")
const SCHOOL_REGISTER_CACHE_PATH = path.join(
  CACHE_DIR,
  "secondary-schools-2016.csv"
)
const OUTPUT_DIR = path.join(ROOT_DIR, "lib/analytics/generated")
const OUTPUT_PATH = path.join(OUTPUT_DIR, "acsee-analytics-2026.json")

const RESULTS_SOURCE_URL =
  "https://matokeo.necta.go.tz/results/2026/acsee/index.htm"
const TAMISEMI_SOURCE_URL =
  "https://selform.tamisemi.go.tz/content/selection-and-allocation/2026/first-selection/index.html"
const SCHOOL_REGISTER_PAGE_URL =
  "https://www.open.africa/dataset/orodha-ya-shule-za-sekondari-2016"
const SCHOOL_REGISTER_DOWNLOAD_URL =
  "https://www.open.africa/datastore/dump/d633dd95-e3fd-4760-bad2-d1675572465f?bom=True"
const NBS_BOUNDARIES_URL = "https://microdata.nbs.go.tz/index.php/catalog/49"

const VALID_GRADES = ["A", "B", "C", "D", "E", "S", "F"]
const EXCLUDED_GRADES = ["X", "I"]
const DIVISIONS = ["I", "II", "III", "IV", "0"]
const SEX_KEYS = ["all", "female", "male"]
const REGION_RATE_MINIMUM = 30
const CENTRE_SUBJECT_MINIMUM = 20
const CENTRE_COMBINATION_MINIMUM = 15
const CENTRE_OVERALL_MINIMUM = 30
const LEADER_LIMIT = 12
const COMBINATIONS = [
  {
    key: "pcm",
    label: "PCM",
    name: "Physics, Chemistry & Advanced Mathematics",
    subjects: ["physics", "chemistry", "advanced_mathematics"],
  },
  {
    key: "pcb",
    label: "PCB",
    name: "Physics, Chemistry & Biology",
    subjects: ["physics", "chemistry", "biology"],
  },
  {
    key: "pgm",
    label: "PGM",
    name: "Physics, Geography & Advanced Mathematics",
    subjects: ["physics", "geography", "advanced_mathematics"],
  },
  {
    key: "egm",
    label: "EGM",
    name: "Economics, Geography & Advanced Mathematics",
    subjects: ["economics", "geography", "advanced_mathematics"],
  },
  {
    key: "cbg",
    label: "CBG",
    name: "Chemistry, Biology & Geography",
    subjects: ["chemistry", "biology", "geography"],
  },
  {
    key: "hge",
    label: "HGE",
    name: "History, Geography & Economics",
    subjects: ["history", "geography", "economics"],
  },
  {
    key: "hkl",
    label: "HKL",
    name: "History, Kiswahili & English",
    subjects: ["history", "kiswahili", "english"],
  },
  {
    key: "hgk",
    label: "HGK",
    name: "History, Geography & Kiswahili",
    subjects: ["history", "geography", "kiswahili"],
  },
  {
    key: "hgl",
    label: "HGL",
    name: "History, Geography & English",
    subjects: ["history", "geography", "english"],
  },
]

function invariant(condition, message) {
  if (!condition) {
    throw new Error(message)
  }
}

function round(value, precision = 1) {
  if (!Number.isFinite(value)) return null
  const factor = 10 ** precision
  return Math.round(value * factor) / factor
}

function rate(numerator, denominator) {
  return denominator > 0 ? round((numerator / denominator) * 100) : null
}

function normalizeWhitespace(value) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
}

function titleCase(value) {
  const smallWords = new Set(["and", "es", "ya", "wa"])
  return normalizeWhitespace(value)
    .toLocaleLowerCase("en")
    .split(" ")
    .map((word, index) => {
      if (index > 0 && smallWords.has(word)) return word
      return word ? `${word[0].toLocaleUpperCase("en")}${word.slice(1)}` : word
    })
    .join(" ")
}

function normalizeRegionKey(value) {
  return normalizeWhitespace(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("en")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
}

function normalizeSchoolName(value) {
  const ignoredWords = new Set([
    "SECONDARY",
    "HIGH",
    "SCHOOL",
    "SEKONDARI",
    "CENTRE",
    "CENTER",
    "PRIVATE",
    "CANDIDATE",
    "CANDIDATES",
    "SEMINARY",
    "TECHNICAL",
    "BOYS",
    "GIRLS",
  ])

  return normalizeWhitespace(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleUpperCase("en")
    .replace(/&/g, " AND ")
    .replace(/[^A-Z0-9]+/g, " ")
    .split(" ")
    .filter((word) => word && !ignoredWords.has(word))
    .join(" ")
}

function stripHtml(value) {
  return normalizeWhitespace(
    String(value)
      .replace(/<br\s*\/?>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/gi, " ")
      .replace(/&amp;/gi, "&")
      .replace(/&#39;/gi, "'")
      .replace(/&quot;/gi, '"')
  )
}

function extractLinks(html, baseUrl) {
  const links = []
  const anchorPattern =
    /<a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi
  let match

  while ((match = anchorPattern.exec(html))) {
    const label = stripHtml(match[2])
    if (!label) continue

    try {
      links.push({ label, url: new URL(match[1], baseUrl).toString() })
    } catch {
      // Ignore malformed navigation links from the source HTML.
    }
  }

  return links
}

async function fetchWithRetry(url, options = {}, attempts = 3) {
  let lastError

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/126 Safari/537.36",
          ...options.headers,
        },
      })

      if (!response.ok) {
        throw new Error(`${response.status} ${response.statusText}`)
      }

      return response
    } catch (error) {
      lastError = error
      if (attempt < attempts) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 350))
      }
    }
  }

  throw new Error(`Unable to fetch ${url}: ${lastError?.message ?? lastError}`)
}

async function mapWithConcurrency(items, concurrency, mapper) {
  const results = new Array(items.length)
  let cursor = 0

  async function worker() {
    while (cursor < items.length) {
      const index = cursor
      cursor += 1
      results[index] = await mapper(items[index], index)
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, worker)
  )
  return results
}

function uniqueLinks(links) {
  const seen = new Set()
  return links.filter((link) => {
    if (seen.has(link.url)) return false
    seen.add(link.url)
    return true
  })
}

async function crawlTamisemiCentres() {
  console.log("Fetching the 2026 TAMISEMI selection directory...")
  const rootResponse = await fetchWithRetry(TAMISEMI_SOURCE_URL)
  const rootHtml = await rootResponse.text()
  const rootPath = new URL(TAMISEMI_SOURCE_URL).pathname.replace(
    /index\.html$/,
    ""
  )
  const regionLinks = uniqueLinks(
    extractLinks(rootHtml, TAMISEMI_SOURCE_URL).filter((link) => {
      const parsed = new URL(link.url)
      return (
        parsed.hostname === new URL(TAMISEMI_SOURCE_URL).hostname &&
        parsed.pathname.startsWith(rootPath) &&
        parsed.pathname !== `${rootPath}index.html` &&
        parsed.pathname.endsWith("/index.html")
      )
    })
  )

  invariant(
    regionLinks.length >= 20,
    "TAMISEMI region directory was not parsed"
  )

  const councilGroups = await mapWithConcurrency(
    regionLinks,
    8,
    async (regionLink) => {
      const response = await fetchWithRetry(regionLink.url)
      const html = await response.text()
      const regionPath = new URL(regionLink.url).pathname.replace(
        /index\.html$/,
        ""
      )
      const links = uniqueLinks(
        extractLinks(html, regionLink.url).filter((link) => {
          const parsed = new URL(link.url)
          return (
            parsed.pathname.startsWith(regionPath) &&
            parsed.pathname !== `${regionPath}index.html` &&
            parsed.pathname.endsWith("/index.html")
          )
        })
      )

      return links.map((link) => ({
        council: stripHtml(link.label).toLocaleUpperCase("en"),
        region: stripHtml(regionLink.label).toLocaleUpperCase("en"),
        url: link.url,
      }))
    }
  )

  const councilLinks = councilGroups.flat()
  invariant(
    councilLinks.length >= 150,
    "TAMISEMI council directory was not parsed"
  )

  const centreGroups = await mapWithConcurrency(
    councilLinks,
    10,
    async (councilLink) => {
      const response = await fetchWithRetry(councilLink.url)
      const html = await response.text()
      const centres = []

      for (const link of extractLinks(html, councilLink.url)) {
        const match = stripHtml(link.label).match(/^([SP]\d{4})\s*-\s*(.+)$/i)
        if (!match) continue

        centres.push({
          centreCode: match[1].toLocaleUpperCase("en"),
          centreName: normalizeWhitespace(match[2]),
          region: councilLink.region,
          council: councilLink.council,
          sourceUrl: councilLink.url,
        })
      }

      return centres
    }
  )

  const byCode = new Map()
  for (const centre of centreGroups.flat()) {
    const existing = byCode.get(centre.centreCode)
    invariant(
      !existing || existing.region === centre.region,
      `Conflicting regions for ${centre.centreCode}`
    )
    byCode.set(centre.centreCode, centre)
  }

  const centres = [...byCode.values()].sort((a, b) =>
    a.centreCode.localeCompare(b.centreCode)
  )
  invariant(centres.length >= 5_000, "Too few TAMISEMI centres were found")
  return centres
}

async function loadTamisemiCentres() {
  if (fs.existsSync(TAMISEMI_CACHE_PATH)) {
    console.log(`Using cached TAMISEMI directory: ${TAMISEMI_CACHE_PATH}`)
    return JSON.parse(fs.readFileSync(TAMISEMI_CACHE_PATH, "utf8"))
  }

  const centres = await crawlTamisemiCentres()
  fs.mkdirSync(CACHE_DIR, { recursive: true })
  fs.writeFileSync(TAMISEMI_CACHE_PATH, `${JSON.stringify(centres, null, 2)}\n`)
  return centres
}

async function loadSchoolRegister() {
  if (!fs.existsSync(SCHOOL_REGISTER_CACHE_PATH)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true })
    const overridePath = process.env.ACSEE_SCHOOL_REGISTER_PATH

    if (overridePath) {
      invariant(
        fs.existsSync(overridePath),
        `ACSEE_SCHOOL_REGISTER_PATH does not exist: ${overridePath}`
      )
      console.log(`Using school-register override: ${overridePath}`)
      fs.copyFileSync(overridePath, SCHOOL_REGISTER_CACHE_PATH)
    } else {
      console.log("Downloading the PO-RALG secondary-school register...")
      try {
        const response = await fetchWithRetry(SCHOOL_REGISTER_DOWNLOAD_URL, {
          headers: {
            Accept: "text/csv,application/octet-stream;q=0.9,*/*;q=0.8",
            Referer: SCHOOL_REGISTER_PAGE_URL,
          },
        })
        const csv = Buffer.from(await response.arrayBuffer())
        fs.writeFileSync(SCHOOL_REGISTER_CACHE_PATH, csv)
      } catch (error) {
        throw new Error(
          `${error.message}\nThe source may be presenting a Cloudflare challenge. Download the CSV from ${SCHOOL_REGISTER_PAGE_URL}, then rerun with ACSEE_SCHOOL_REGISTER_PATH=/absolute/path/to/file.csv.`
        )
      }
    }
  } else {
    console.log(`Using cached school register: ${SCHOOL_REGISTER_CACHE_PATH}`)
  }

  return parse(fs.readFileSync(SCHOOL_REGISTER_CACHE_PATH), {
    bom: true,
    columns: true,
    record_delimiter: ["\r\n", "\n"],
    relax_column_count: true,
    skip_empty_lines: true,
    trim: true,
  })
}

function createCandidateAccumulator() {
  return {
    candidates: 0,
    released: 0,
    absent: 0,
    notEligible: 0,
    divisions: Object.fromEntries(DIVISIONS.map((division) => [division, 0])),
  }
}

function addCandidate(accumulator, result) {
  accumulator.candidates += 1

  if (result.resultStatus === "released") {
    accumulator.released += 1
    if (DIVISIONS.includes(result.division)) {
      accumulator.divisions[result.division] += 1
    }
  } else if (result.resultStatus === "absent") {
    accumulator.absent += 1
  } else {
    accumulator.notEligible += 1
  }
}

function finaliseCandidateAccumulator(accumulator) {
  const divisionOne = accumulator.divisions.I
  const divisionOneTwo = divisionOne + accumulator.divisions.II

  return {
    candidates: accumulator.candidates,
    released: accumulator.released,
    absent: accumulator.absent,
    notEligible: accumulator.notEligible,
    absenceRate: rate(accumulator.absent, accumulator.candidates),
    divisions: accumulator.divisions,
    divisionOne,
    divisionOneRate: rate(divisionOne, accumulator.released),
    divisionOneTwo,
    divisionOneTwoRate: rate(divisionOneTwo, accumulator.released),
  }
}

function createSubjectAccumulator() {
  return {
    grades: Object.fromEntries(VALID_GRADES.map((grade) => [grade, 0])),
    excluded: Object.fromEntries(EXCLUDED_GRADES.map((grade) => [grade, 0])),
    otherExcluded: 0,
  }
}

function addSubjectGrade(accumulator, grade) {
  if (VALID_GRADES.includes(grade)) {
    accumulator.grades[grade] += 1
  } else if (EXCLUDED_GRADES.includes(grade)) {
    accumulator.excluded[grade] += 1
  } else {
    accumulator.otherExcluded += 1
  }
}

function finaliseSubjectAccumulator(accumulator) {
  const grades = accumulator.grades
  const sittings = VALID_GRADES.reduce((sum, grade) => sum + grades[grade], 0)
  const aCount = grades.A
  const abcCount = grades.A + grades.B + grades.C
  const principalPassCount = abcCount + grades.D + grades.E
  const excluded =
    EXCLUDED_GRADES.reduce(
      (sum, grade) => sum + accumulator.excluded[grade],
      0
    ) + accumulator.otherExcluded

  return {
    sittings,
    aCount,
    aRate: rate(aCount, sittings),
    abcCount,
    abcRate: rate(abcCount, sittings),
    principalPassCount,
    principalPassRate: rate(principalPassCount, sittings),
    grades,
    excluded,
    excludedGrades: {
      ...accumulator.excluded,
      other: accumulator.otherExcluded,
    },
  }
}

function createCombinationAccumulator() {
  return {
    candidates: 0,
    gradeEntries: 0,
    aCount: 0,
    abcCount: 0,
    principalPassCount: 0,
    allAbcCount: 0,
    grades: Object.fromEntries(VALID_GRADES.map((grade) => [grade, 0])),
  }
}

function addCombinationGrades(accumulator, grades) {
  accumulator.candidates += 1
  accumulator.gradeEntries += grades.length

  let allAbc = true
  for (const grade of grades) {
    accumulator.grades[grade] += 1
    if (grade === "A") accumulator.aCount += 1
    if (["A", "B", "C"].includes(grade)) {
      accumulator.abcCount += 1
    } else {
      allAbc = false
    }
    if (["A", "B", "C", "D", "E"].includes(grade)) {
      accumulator.principalPassCount += 1
    }
  }

  if (allAbc) accumulator.allAbcCount += 1
}

function finaliseCombinationAccumulator(accumulator) {
  return {
    candidates: accumulator.candidates,
    gradeEntries: accumulator.gradeEntries,
    aCount: accumulator.aCount,
    abcCount: accumulator.abcCount,
    abcRate: rate(accumulator.abcCount, accumulator.gradeEntries),
    allAbcCount: accumulator.allAbcCount,
    allAbcRate: rate(accumulator.allAbcCount, accumulator.candidates),
    principalPassCount: accumulator.principalPassCount,
    principalPassRate: rate(
      accumulator.principalPassCount,
      accumulator.gradeEntries
    ),
    grades: accumulator.grades,
  }
}

function createSexBreakdown(factory) {
  return Object.fromEntries(SEX_KEYS.map((key) => [key, factory()]))
}

function sexKey(sex) {
  return sex === "F" ? "female" : "male"
}

function addToSexBreakdown(breakdown, result, callback) {
  callback(breakdown.all)
  callback(breakdown[sexKey(result.sex)])
}

function finaliseSexBreakdown(breakdown, finaliser) {
  return Object.fromEntries(
    SEX_KEYS.map((key) => [key, finaliser(breakdown[key])])
  )
}

function getOrCreate(map, key, factory) {
  if (!map.has(key)) map.set(key, factory())
  return map.get(key)
}

function createRegionAccumulator(region) {
  return {
    key: normalizeRegionKey(region.region),
    name: titleCase(region.region),
    candidates: createSexBreakdown(createCandidateAccumulator),
    subjects: new Map(),
  }
}

function createCentreAccumulator(result, location) {
  return {
    code: result.centreCode,
    name: result.centreName,
    region: location ? titleCase(location.region) : null,
    council: location ? titleCase(location.council) : null,
    candidates: createCandidateAccumulator(),
    subjects: new Map(),
    combinations: new Map(),
  }
}

function wilsonLowerBound(successes, total, z = 1.96) {
  if (total <= 0) return 0
  const proportion = successes / total
  const zSquared = z * z
  const denominator = 1 + zSquared / total
  const centre = proportion + zSquared / (2 * total)
  const margin =
    z *
    Math.sqrt((proportion * (1 - proportion) + zSquared / (4 * total)) / total)
  return (centre - margin) / denominator
}

function buildCentreLeader(center, stats, metric) {
  const successes =
    metric === "divisionOneTwo" ? stats.divisionOneTwo : stats.abcCount
  const denominator =
    metric === "divisionOneTwo" ? stats.released : stats.sittings
  const measuredRate = rate(successes, denominator)

  return {
    code: center.code,
    name: center.name,
    region: center.region,
    council: center.council,
    sittings: denominator,
    successes,
    rate: measuredRate,
    rankScore: round(wilsonLowerBound(successes, denominator) * 100, 3),
  }
}

function rankCentreLeaders(leaders) {
  return leaders
    .sort(
      (a, b) =>
        b.rankScore - a.rankScore ||
        b.rate - a.rate ||
        b.sittings - a.sittings ||
        a.name.localeCompare(b.name)
    )
    .slice(0, LEADER_LIMIT)
    .map((leader, index) => ({ ...leader, rank: index + 1 }))
}

function buildCombinationCentreLeader(center, stats) {
  return {
    code: center.code,
    name: center.name,
    region: center.region,
    council: center.council,
    candidates: stats.candidates,
    gradeEntries: stats.gradeEntries,
    successes: stats.abcCount,
    rate: stats.abcRate,
    allAbcCount: stats.allAbcCount,
    allAbcRate: stats.allAbcRate,
    aCount: stats.aCount,
    rankScore: round(
      wilsonLowerBound(stats.abcCount, stats.gradeEntries) * 100,
      3
    ),
  }
}

function rankCombinationCentreLeaders(leaders) {
  return leaders
    .sort(
      (a, b) =>
        b.rankScore - a.rankScore ||
        b.rate - a.rate ||
        b.candidates - a.candidates ||
        a.name.localeCompare(b.name)
    )
    .slice(0, LEADER_LIMIT)
    .map((leader, index) => ({ ...leader, rank: index + 1 }))
}

function buildRegistryLookup(rows) {
  const lookup = new Map()

  for (const row of rows) {
    const nameKey = normalizeSchoolName(row["SCHOOL NAME"])
    const region = normalizeWhitespace(row.REGION).toLocaleUpperCase("en")
    if (!nameKey || !region) continue

    const location = {
      region,
      council: normalizeWhitespace(row.COUNCIL).toLocaleUpperCase("en"),
      source: "school-register-name",
    }
    const existing = lookup.get(nameKey)

    if (!existing) {
      lookup.set(nameKey, location)
    } else if (existing.region !== location.region) {
      lookup.set(nameKey, null)
    }
  }

  return lookup
}

async function buildAnalytics() {
  invariant(
    fs.existsSync(RESULTS_PATH),
    `Missing ${RESULTS_PATH}. Run bun run data:acsee:build first.`
  )

  const [tamisemiCentres, schoolRegister] = await Promise.all([
    loadTamisemiCentres(),
    loadSchoolRegister(),
  ])
  const tamisemiByCode = new Map(
    tamisemiCentres.map((centre) => [centre.centreCode, centre])
  )
  const schoolByName = buildRegistryLookup(schoolRegister)

  const nationalCandidates = createSexBreakdown(createCandidateAccumulator)
  const nationalSubjects = new Map()
  const nationalCombinations = new Map()
  const regions = new Map()
  const centres = new Map()
  const subjectNames = new Map()
  const resultCentres = new Set()
  const mappedCentres = new Set()
  const mappingCounts = {
    tamisemiCentreCode: 0,
    schoolRegisterName: 0,
    unmatched: 0,
  }

  console.log(`Aggregating ${RESULTS_PATH}...`)
  const input = fs.createReadStream(RESULTS_PATH, { encoding: "utf8" })
  const lines = readline.createInterface({ input, crlfDelay: Infinity })

  for await (const line of lines) {
    if (!line.trim()) continue
    const result = JSON.parse(line)
    resultCentres.add(result.centreCode)

    let location = tamisemiByCode.get(result.centreCode)
    if (location) {
      location = { ...location, source: "tamisemi-centre-code" }
      mappingCounts.tamisemiCentreCode += 1
    } else {
      const fallback = schoolByName.get(normalizeSchoolName(result.centreName))
      if (fallback) {
        location = fallback
        mappingCounts.schoolRegisterName += 1
      } else {
        location = null
        mappingCounts.unmatched += 1
      }
    }

    if (location) mappedCentres.add(result.centreCode)

    addToSexBreakdown(nationalCandidates, result, (accumulator) =>
      addCandidate(accumulator, result)
    )

    const centre = getOrCreate(centres, result.centreCode, () =>
      createCentreAccumulator(result, location)
    )
    addCandidate(centre.candidates, result)

    let region
    if (location) {
      const regionKey = normalizeRegionKey(location.region)
      region = getOrCreate(regions, regionKey, () =>
        createRegionAccumulator(location)
      )
      addToSexBreakdown(region.candidates, result, (accumulator) =>
        addCandidate(accumulator, result)
      )
    }

    for (const subject of result.subjects ?? []) {
      subjectNames.set(subject.normalizedSubject, subject.subject)

      const nationalSubject = getOrCreate(
        nationalSubjects,
        subject.normalizedSubject,
        () => createSexBreakdown(createSubjectAccumulator)
      )
      addToSexBreakdown(nationalSubject, result, (accumulator) =>
        addSubjectGrade(accumulator, subject.grade)
      )

      const centreSubject = getOrCreate(
        centre.subjects,
        subject.normalizedSubject,
        () => createSexBreakdown(createSubjectAccumulator)
      )
      addToSexBreakdown(centreSubject, result, (accumulator) =>
        addSubjectGrade(accumulator, subject.grade)
      )

      if (region) {
        const regionSubject = getOrCreate(
          region.subjects,
          subject.normalizedSubject,
          () => createSexBreakdown(createSubjectAccumulator)
        )
        addToSexBreakdown(regionSubject, result, (accumulator) =>
          addSubjectGrade(accumulator, subject.grade)
        )
      }
    }

    const subjectGradeByKey = new Map(
      (result.subjects ?? []).map((subject) => [
        subject.normalizedSubject,
        subject.grade,
      ])
    )
    for (const combination of COMBINATIONS) {
      const grades = combination.subjects.map((key) =>
        subjectGradeByKey.get(key)
      )
      if (!grades.every((grade) => VALID_GRADES.includes(grade))) continue

      const nationalCombination = getOrCreate(
        nationalCombinations,
        combination.key,
        () => createSexBreakdown(createCombinationAccumulator)
      )
      addToSexBreakdown(nationalCombination, result, (accumulator) =>
        addCombinationGrades(accumulator, grades)
      )

      const centreCombination = getOrCreate(
        centre.combinations,
        combination.key,
        () => createSexBreakdown(createCombinationAccumulator)
      )
      addToSexBreakdown(centreCombination, result, (accumulator) =>
        addCombinationGrades(accumulator, grades)
      )
    }
  }

  const finalisedCentres = [...centres.values()].map((centre) => ({
    ...centre,
    candidateStats: finaliseCandidateAccumulator(centre.candidates),
  }))
  const overallCentreLeaders = rankCentreLeaders(
    finalisedCentres
      .filter(
        (centre) => centre.candidateStats.released >= CENTRE_OVERALL_MINIMUM
      )
      .map((centre) =>
        buildCentreLeader(centre, centre.candidateStats, "divisionOneTwo")
      )
  )

  const subjects = [...nationalSubjects.entries()]
    .map(([key, breakdown]) => {
      const stats = finaliseSexBreakdown(breakdown, finaliseSubjectAccumulator)
      const leaders = {}

      for (const sex of SEX_KEYS) {
        leaders[sex] = rankCentreLeaders(
          finalisedCentres.flatMap((centre) => {
            const centreBreakdown = centre.subjects.get(key)
            if (!centreBreakdown) return []
            const centreStats = finaliseSubjectAccumulator(centreBreakdown[sex])
            if (centreStats.sittings < CENTRE_SUBJECT_MINIMUM) return []
            return [buildCentreLeader(centre, centreStats, "abc")]
          })
        )
      }

      return {
        key,
        name: subjectNames.get(key) ?? titleCase(key.replaceAll("_", " ")),
        stats,
        leaders,
      }
    })
    .sort(
      (a, b) =>
        b.stats.all.sittings - a.stats.all.sittings ||
        a.name.localeCompare(b.name)
    )

  const combinations = COMBINATIONS.map((combination) => {
    const breakdown =
      nationalCombinations.get(combination.key) ??
      createSexBreakdown(createCombinationAccumulator)
    const leaders = {}

    for (const sex of SEX_KEYS) {
      leaders[sex] = rankCombinationCentreLeaders(
        finalisedCentres.flatMap((centre) => {
          const centreBreakdown = centre.combinations.get(combination.key)
          if (!centreBreakdown) return []
          const centreStats = finaliseCombinationAccumulator(
            centreBreakdown[sex]
          )
          if (centreStats.candidates < CENTRE_COMBINATION_MINIMUM) return []
          return [buildCombinationCentreLeader(centre, centreStats)]
        })
      )
    }

    return {
      ...combination,
      stats: finaliseSexBreakdown(breakdown, finaliseCombinationAccumulator),
      leaders,
    }
  })

  const finalisedRegions = [...regions.values()]
    .map((region) => ({
      key: region.key,
      name: region.name,
      candidates: finaliseSexBreakdown(
        region.candidates,
        finaliseCandidateAccumulator
      ),
      subjects: Object.fromEntries(
        [...region.subjects.entries()].map(([subjectKey, breakdown]) => [
          subjectKey,
          finaliseSexBreakdown(breakdown, finaliseSubjectAccumulator),
        ])
      ),
    }))
    .sort((a, b) => a.name.localeCompare(b.name))

  const mappedCandidates =
    mappingCounts.tamisemiCentreCode + mappingCounts.schoolRegisterName
  const totalCandidates = mappedCandidates + mappingCounts.unmatched
  const mappedPercent = rate(mappedCandidates, totalCandidates)
  const mappedCentrePercent = rate(mappedCentres.size, resultCentres.size)
  const national = finaliseSexBreakdown(
    nationalCandidates,
    finaliseCandidateAccumulator
  )
  const excludedSubjectGrades = subjects.reduce(
    (sum, subject) => sum + subject.stats.all.excluded,
    0
  )

  return {
    metadata: {
      title: "ACSEE 2026 National Results Observatory",
      examType: "ACSEE",
      examYear: 2026,
      generatedAt: new Date().toISOString(),
      methodologyVersion: "acsee-analytics-v2",
      sources: [
        {
          id: "necta-results",
          label: "NECTA ACSEE 2026 results",
          url: RESULTS_SOURCE_URL,
        },
        {
          id: "tamisemi-centres",
          label: "TAMISEMI 2026 Form Five selection directory",
          url: TAMISEMI_SOURCE_URL,
        },
        {
          id: "school-register",
          label: "PO-RALG secondary-school register (2016)",
          url: SCHOOL_REGISTER_PAGE_URL,
        },
        {
          id: "nbs-boundaries",
          label: "NBS 2022 PHC regional boundaries",
          url: NBS_BOUNDARIES_URL,
        },
      ],
      thresholds: {
        regionalRateMinimum: REGION_RATE_MINIMUM,
        centreSubjectMinimum: CENTRE_SUBJECT_MINIMUM,
        centreCombinationMinimum: CENTRE_COMBINATION_MINIMUM,
        centreOverallMinimum: CENTRE_OVERALL_MINIMUM,
        centreRankingMethod:
          "95% Wilson lower bound, ranked on A-C share for subjects and combinations and Division I-II share overall",
        combinationMethod:
          "Complete candidates only. A-C share counts all valid grades across the three component subjects; all-three A-C requires A, B, or C in every component subject.",
      },
      gradeRules: {
        validGrades: VALID_GRADES,
        principalPassGrades: ["A", "B", "C", "D", "E"],
        strongPassGrades: ["A", "B", "C"],
        excludedGrades: EXCLUDED_GRADES,
        excludedSubjectGradeEntries: excludedSubjectGrades,
      },
      regionalCoverage: {
        mappedCandidates,
        totalCandidates,
        mappedPercent,
        mappedCentres: mappedCentres.size,
        totalCentres: resultCentres.size,
        mappedCentrePercent,
        mappedRegions: finalisedRegions.length,
        sourceCounts: mappingCounts,
      },
    },
    national,
    subjects,
    combinations,
    regions: finalisedRegions,
    centreLeaders: {
      overall: overallCentreLeaders,
    },
  }
}

const analytics = await buildAnalytics()
fs.mkdirSync(OUTPUT_DIR, { recursive: true })
fs.writeFileSync(OUTPUT_PATH, `${JSON.stringify(analytics)}\n`)

console.log(`Wrote ${OUTPUT_PATH}`)
console.log(
  `Regional coverage: ${analytics.metadata.regionalCoverage.mappedCandidates.toLocaleString("en")} / ${analytics.metadata.regionalCoverage.totalCandidates.toLocaleString("en")} candidates (${analytics.metadata.regionalCoverage.mappedPercent}%)`
)
console.log(
  `Subjects: ${analytics.subjects.length}; combinations: ${analytics.combinations.length}; regions: ${analytics.regions.length}; overall centre leaders: ${analytics.centreLeaders.overall.length}`
)
