"use client"

import Image from "next/image"
import Link from "next/link"
import {
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
  useMemo,
  useState,
} from "react"
import {
  Analytics01Icon,
  ArrowRight01Icon,
  ArrowUpRight01Icon,
  Award01Icon,
  ChartBarLineIcon,
  InformationCircleIcon,
  MapsIcon,
  School01Icon,
  UserGroupIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from "recharts"

import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"

import type {
  AcseeAnalyticsData,
  AnalyticsRegion,
  AnalyticsSex,
  AnalyticsSubject,
  GeoJsonGeometry,
  Grade,
  SubjectStats,
  TanzaniaRegionsGeoJson,
} from "@/lib/analytics/types"

import styles from "./acsee-analytics.module.css"

const NUMBER_FORMATTER = new Intl.NumberFormat("en-TZ")
const COMPACT_FORMATTER = new Intl.NumberFormat("en-TZ", {
  notation: "compact",
  maximumFractionDigits: 1,
})
const GRADE_ORDER: Grade[] = ["A", "B", "C", "D", "E", "S", "F"]
const GRADE_COLORS: Record<Grade, string> = {
  A: "#0b6655",
  B: "#238a75",
  C: "#70ad8d",
  D: "#d5b24b",
  E: "#e59645",
  S: "#b9b5ad",
  F: "#c95d56",
}
const MAP_COLORS = ["#dcebe4", "#afd2c2", "#70af9c", "#2c816f", "#0b584b"]
const DEFAULT_SUBJECT = "advanced_mathematics"
const DEFAULT_COMBINATION = "pcm"
const NATIONAL_SUBJECT_MINIMUM = 100
const SCHOOL_CHART_CONFIG = {
  rate: {
    label: "A-C share",
    color: "#0b6655",
  },
} satisfies ChartConfig

type SchoolView = "subject" | "combination"

type SchoolRankDatum = {
  rank: number
  code: string
  name: string
  region: string | null
  council: string | null
  cohort: number
  rate: number
  rankScore: number
  successes: number
  allAbcRate: number | null
  aCount: number | null
}

type MapMetric = "abcRate" | "aCount" | "sittings"

type RegionDatum = {
  region: AnalyticsRegion
  stats: SubjectStats | null
  value: number | null
  hasRateSample: boolean
}

type HoveredRegion = {
  key: string
  x: number
  y: number
}

const MAP_METRICS: Array<{
  key: MapMetric
  label: string
  shortLabel: string
}> = [
  { key: "abcRate", label: "A-C share", shortLabel: "A-C" },
  { key: "aCount", label: "A grades", shortLabel: "A grades" },
  { key: "sittings", label: "Valid sittings", shortLabel: "Sittings" },
]

const SEX_OPTIONS: Array<{
  key: AnalyticsSex
  label: string
  shortLabel: string
}> = [
  { key: "all", label: "All", shortLabel: "All" },
  { key: "female", label: "Female", shortLabel: "F" },
  { key: "male", label: "Male", shortLabel: "M" },
]

function formatNumber(value: number) {
  return NUMBER_FORMATTER.format(value)
}

function formatCompact(value: number) {
  return COMPACT_FORMATTER.format(value)
}

function formatPercent(value: number | null, digits = 1) {
  if (value === null) return "Not available"
  return `${value.toFixed(digits)}%`
}

function normalizeRegionKey(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("en")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
}

function titleCaseName(value: string) {
  const smallWords = new Set(["and", "es", "ya", "wa"])
  return value
    .toLocaleLowerCase("en")
    .split(" ")
    .map((word, index) => {
      if (index > 0 && smallWords.has(word)) return word
      return word ? `${word[0].toUpperCase()}${word.slice(1)}` : word
    })
    .join(" ")
}

function getRegionMetric(
  region: AnalyticsRegion,
  subjectKey: string,
  sex: AnalyticsSex,
  metric: MapMetric,
  minimumRateSample: number
): RegionDatum {
  const stats = region.subjects[subjectKey]?.[sex] ?? null
  const hasRateSample = Boolean(stats && stats.sittings >= minimumRateSample)
  let value: number | null = null

  if (stats) {
    if (metric === "abcRate") {
      value = hasRateSample ? stats.abcRate : null
    } else {
      value = stats[metric]
    }
  }

  return { region, stats, value, hasRateSample }
}

function mapMetricValueLabel(metric: MapMetric, value: number | null) {
  if (value === null) return "Insufficient data"
  return metric === "abcRate" ? formatPercent(value) : formatNumber(value)
}

function mapMetricNoun(metric: MapMetric) {
  if (metric === "abcRate") return "A-C share"
  if (metric === "aCount") return "A grades"
  return "valid sittings"
}

export function AcseeAnalyticsClient({
  data,
  geoData,
}: {
  data: AcseeAnalyticsData
  geoData: TanzaniaRegionsGeoJson
}) {
  const initialSubject =
    data.subjects.find((subject) => subject.key === DEFAULT_SUBJECT) ??
    data.subjects[0]
  const [subjectKey, setSubjectKey] = useState(initialSubject.key)
  const [sex, setSex] = useState<AnalyticsSex>("all")
  const [mapMetric, setMapMetric] = useState<MapMetric>("abcRate")

  const subject =
    data.subjects.find((item) => item.key === subjectKey) ?? initialSubject
  const regionData = useMemo(
    () =>
      data.regions
        .map((region) =>
          getRegionMetric(
            region,
            subjectKey,
            sex,
            mapMetric,
            data.metadata.thresholds.regionalRateMinimum
          )
        )
        .sort((a, b) => (b.value ?? -1) - (a.value ?? -1)),
    [data, mapMetric, sex, subjectKey]
  )
  const firstRankedRegion = regionData.find((item) => item.value !== null)
  const [selectedRegionKey, setSelectedRegionKey] = useState(
    () => firstRankedRegion?.region.key ?? data.regions[0]?.key ?? ""
  )
  const selectedRegionDatum =
    regionData.find((item) => item.region.key === selectedRegionKey) ??
    firstRankedRegion ??
    regionData[0]

  const subjectStats = subject.stats[sex]
  function chooseSubject(nextSubjectKey: string) {
    setSubjectKey(nextSubjectKey)
    const nextRegionData = data.regions
      .map((region) =>
        getRegionMetric(
          region,
          nextSubjectKey,
          sex,
          mapMetric,
          data.metadata.thresholds.regionalRateMinimum
        )
      )
      .sort((a, b) => (b.value ?? -1) - (a.value ?? -1))
    const nextLeader = nextRegionData.find((item) => item.value !== null)
    if (nextLeader) setSelectedRegionKey(nextLeader.region.key)
  }

  function chooseSex(nextSex: AnalyticsSex) {
    setSex(nextSex)
    const nextRegionData = data.regions
      .map((region) =>
        getRegionMetric(
          region,
          subjectKey,
          nextSex,
          mapMetric,
          data.metadata.thresholds.regionalRateMinimum
        )
      )
      .sort((a, b) => (b.value ?? -1) - (a.value ?? -1))
    const nextLeader = nextRegionData.find((item) => item.value !== null)
    if (nextLeader) setSelectedRegionKey(nextLeader.region.key)
  }

  function chooseMapMetric(nextMetric: MapMetric) {
    setMapMetric(nextMetric)
    const nextRegionData = data.regions
      .map((region) =>
        getRegionMetric(
          region,
          subjectKey,
          sex,
          nextMetric,
          data.metadata.thresholds.regionalRateMinimum
        )
      )
      .sort((a, b) => (b.value ?? -1) - (a.value ?? -1))
    const nextLeader = nextRegionData.find((item) => item.value !== null)
    if (nextLeader) setSelectedRegionKey(nextLeader.region.key)
  }

  return (
    <div className={styles.page}>
      <AnalyticsHeader />

      <section className={styles.hero}>
        <div className={styles.shell}>
          <div className={styles.heroGrid}>
            <div className={styles.heroCopy}>
              <p className={styles.eyebrow}>
                <span aria-hidden className={styles.eyebrowDot} />
                ACSEE 2026 national results
              </p>
              <h1>The shape of Form Six.</h1>
              <p className={styles.heroDescription}>
                See where subjects are strongest, how grade profiles differ, and
                which centres stand out across Tanzania.
              </p>
            </div>

            <div className={styles.heroFinding}>
              <span className={styles.findingLabel}>National signal</span>
              <strong>
                {formatPercent(data.national.all.divisionOneRate)}
              </strong>
              <p>of released candidates earned Division I.</p>
              <span className={styles.findingMeta}>
                {formatNumber(data.national.all.divisionOne)} candidates
              </span>
            </div>
          </div>
        </div>
      </section>

      <section aria-label="National overview" className={styles.kpiBand}>
        <div className={`${styles.shell} ${styles.kpiGrid}`}>
          <Kpi
            icon={UserGroupIcon}
            label="Candidate records"
            value={formatNumber(data.national.all.candidates)}
          />
          <Kpi
            icon={Award01Icon}
            label="Division I-II share"
            note={`${formatNumber(data.national.all.divisionOneTwo)} released candidates`}
            value={formatPercent(data.national.all.divisionOneTwoRate)}
          />
          <Kpi
            icon={Analytics01Icon}
            label="Division I"
            note="Among released results"
            value={formatNumber(data.national.all.divisionOne)}
          />
          <Kpi
            icon={InformationCircleIcon}
            label="Absent"
            note={formatPercent(data.national.all.absenceRate)}
            value={formatNumber(data.national.all.absent)}
          />
        </div>
      </section>

      <div className={styles.analysisBody}>
        <div className={styles.filterDockWrap}>
          <section aria-label="Analytics filters" className={styles.filterDock}>
            <div className={styles.filterSubject}>
              <label htmlFor="analytics-subject">Subject</label>
              <div className={styles.selectWrap}>
                <select
                  id="analytics-subject"
                  onChange={(event) => chooseSubject(event.target.value)}
                  value={subjectKey}
                >
                  {data.subjects.map((item) => (
                    <option key={item.key} value={item.key}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className={styles.filterDivider} />

            <div className={styles.filterSex}>
              <span className={styles.filterLabel}>Candidates</span>
              <SegmentedControl
                label="Candidate sex"
                onChange={chooseSex}
                options={SEX_OPTIONS}
                value={sex}
              />
            </div>

            <div className={styles.filterMeta}>
              <span>2026</span>
              <span>{formatNumber(subjectStats.sittings)} valid sittings</span>
            </div>
          </section>
        </div>

        <section
          className={`${styles.section} ${styles.mapSection}`}
          id="regions"
        >
          <div className={styles.shell}>
            <SectionHeading
              eyebrow="Regional lens"
              icon={MapsIcon}
              title={`${subject.name} across Tanzania`}
            >
              Compare regions by outcome or cohort size. Rate views require at
              least {data.metadata.thresholds.regionalRateMinimum} valid subject
              sittings.
            </SectionHeading>

            <div className={styles.metricRow}>
              <SegmentedControl
                label="Map metric"
                onChange={chooseMapMetric}
                options={MAP_METRICS}
                value={mapMetric}
              />
            </div>

            <div className={styles.mapGrid}>
              <TanzaniaMap
                geoData={geoData}
                mapMetric={mapMetric}
                onSelectRegion={setSelectedRegionKey}
                regionData={regionData}
                selectedRegionKey={selectedRegionDatum?.region.key ?? ""}
              />

              <RegionRanking
                mapMetric={mapMetric}
                onSelectRegion={setSelectedRegionKey}
                regionData={regionData}
                selectedRegion={selectedRegionDatum}
                selectedRegionKey={selectedRegionDatum?.region.key ?? ""}
                subject={subject}
              />
            </div>

            <div className={styles.coverageNote}>
              <HugeiconsIcon icon={InformationCircleIcon} size={18} />
              <p>
                Regional views include{" "}
                {formatNumber(data.metadata.regionalCoverage.mappedCandidates)}{" "}
                of{" "}
                {formatNumber(data.metadata.regionalCoverage.totalCandidates)}{" "}
                records (
                {formatPercent(data.metadata.regionalCoverage.mappedPercent)}).
                Zanzibar and unmatched centres remain in national totals but are
                not assigned to a region.
              </p>
            </div>
          </div>
        </section>

        <section
          className={`${styles.section} ${styles.subjectSection}`}
          id="subjects"
        >
          <div className={styles.shell}>
            <SectionHeading
              eyebrow="Subject profile"
              icon={ChartBarLineIcon}
              title={`Inside ${subject.name}`}
            >
              Every grade is shown against valid sittings. X and I entries are
              excluded from outcome-rate denominators.
            </SectionHeading>

            <div className={styles.subjectProfileGrid}>
              <GradeProfile key={`${subjectKey}-${sex}`} stats={subjectStats} />
              <SexComparison subject={subject} />
            </div>
          </div>
        </section>

        <section className={`${styles.section} ${styles.comparisonSection}`}>
          <div className={styles.shell}>
            <SectionHeading
              eyebrow="National comparison"
              icon={Analytics01Icon}
              title="How subjects compare"
            >
              A-C share for subjects with at least {NATIONAL_SUBJECT_MINIMUM}{" "}
              valid sittings. Select a row to update the full analysis.
            </SectionHeading>

            <SubjectComparison
              activeSubjectKey={subjectKey}
              onSelectSubject={chooseSubject}
              sex={sex}
              subjects={data.subjects}
            />
          </div>
        </section>
      </div>

      <section
        className={`${styles.section} ${styles.schoolSection}`}
        id="schools"
      >
        <div className={styles.shell}>
          <SectionHeading
            eyebrow="School performance"
            icon={School01Icon}
            title="Which schools perform best?"
          >
            Compare any subject or a complete A-level combination. Rankings
            account for cohort size, so a tiny perfect class does not
            automatically outrank a larger one.
          </SectionHeading>

          <SchoolPerformanceExplorer data={data} />
        </div>
      </section>

      <section
        className={`${styles.section} ${styles.methodSection}`}
        id="methodology"
      >
        <div className={`${styles.shell} ${styles.methodGrid}`}>
          <div>
            <p className={styles.sectionEyebrow}>Read this correctly</p>
            <h2>Transparent by design.</h2>
          </div>
          <div className={styles.methodItems}>
            <MethodItem index="01" title="What A-C means">
              A, B, or C among valid grade entries. For combinations, the
              comparison includes only candidates with valid grades in all three
              component subjects.
            </MethodItem>
            <MethodItem index="02" title="What is excluded">
              Grade X and I entries are not used in subject-rate denominators.
              Absent candidates remain visible in national candidate totals.
            </MethodItem>
            <MethodItem index="03" title="Regional coverage">
              Centre-to-region joins use the 2026 TAMISEMI directory, then a
              unique-name match against the 2016 government school register.
            </MethodItem>
          </div>
        </div>
      </section>

      <DataSources data={data} />
    </div>
  )
}

function AnalyticsHeader() {
  return (
    <header className={styles.header}>
      <div className={`${styles.shell} ${styles.headerInner}`}>
        <Link aria-label="Kozi Ipi home" className={styles.brand} href="/">
          <Image
            alt=""
            className={styles.logo}
            height={36}
            priority
            src="/kozi-ipi-logo.png"
            width={36}
          />
          <span>Kozi Ipi</span>
        </Link>
        <nav aria-label="Primary navigation" className={styles.nav}>
          <Link href="/search">Courses</Link>
          <Link href="/vyuo">Institutions</Link>
          <Link href="/form-six">Form Six</Link>
          <Link aria-current="page" href="/analytics">
            Analytics
          </Link>
        </nav>
      </div>
    </header>
  )
}

function Kpi({
  icon,
  label,
  note,
  value,
}: {
  icon: Parameters<typeof HugeiconsIcon>[0]["icon"]
  label: string
  note?: string
  value: string
}) {
  return (
    <article className={styles.kpi}>
      <span aria-hidden className={styles.kpiIcon}>
        <HugeiconsIcon icon={icon} size={18} strokeWidth={1.8} />
      </span>
      <div>
        <span className={styles.kpiLabel}>{label}</span>
        <strong>{value}</strong>
        {note ? <span className={styles.kpiNote}>{note}</span> : null}
      </div>
    </article>
  )
}

function SegmentedControl<T extends string>({
  label,
  onChange,
  options,
  value,
}: {
  label: string
  onChange: (value: T) => void
  options: Array<{ key: T; label: string; shortLabel?: string }>
  value: T
}) {
  return (
    <div aria-label={label} className={styles.segmented} role="group">
      {options.map((option) => (
        <button
          aria-label={option.label}
          aria-pressed={value === option.key}
          className={value === option.key ? styles.segmentActive : undefined}
          key={option.key}
          onClick={() => onChange(option.key)}
          type="button"
        >
          <span className={styles.segmentFull}>{option.label}</span>
          {option.shortLabel ? (
            <span className={styles.segmentShort}>{option.shortLabel}</span>
          ) : null}
        </button>
      ))}
    </div>
  )
}

function SectionHeading({
  children,
  eyebrow,
  icon,
  title,
}: {
  children: React.ReactNode
  eyebrow: string
  icon: Parameters<typeof HugeiconsIcon>[0]["icon"]
  title: string
}) {
  return (
    <div className={styles.sectionHeading}>
      <div>
        <p className={styles.sectionEyebrow}>
          <HugeiconsIcon icon={icon} size={17} strokeWidth={1.8} />
          {eyebrow}
        </p>
        <h2>{title}</h2>
      </div>
      <p className={styles.sectionDescription}>{children}</p>
    </div>
  )
}

function TanzaniaMap({
  geoData,
  mapMetric,
  onSelectRegion,
  regionData,
  selectedRegionKey,
}: {
  geoData: TanzaniaRegionsGeoJson
  mapMetric: MapMetric
  onSelectRegion: (key: string) => void
  regionData: RegionDatum[]
  selectedRegionKey: string
}) {
  const [hoveredRegion, setHoveredRegion] = useState<HoveredRegion | null>(null)
  const geometry = useMemo(() => buildMapGeometry(geoData), [geoData])
  const dataByRegion = useMemo(
    () => new Map(regionData.map((item) => [item.region.key, item])),
    [regionData]
  )
  const values = regionData
    .map((item) => item.value)
    .filter((value): value is number => value !== null)
    .sort((a, b) => a - b)
  const thresholds = [0.2, 0.4, 0.6, 0.8].map(
    (quantile) => values[Math.floor((values.length - 1) * quantile)] ?? 0
  )
  const hoveredDatum = hoveredRegion
    ? dataByRegion.get(hoveredRegion.key)
    : undefined

  function colorFor(value: number | null) {
    if (value === null) return "#e5e6e2"
    const index = thresholds.findIndex((threshold) => value <= threshold)
    return MAP_COLORS[index === -1 ? MAP_COLORS.length - 1 : index]
  }

  function updateHover(event: PointerEvent<SVGPathElement>, key: string) {
    const bounds = event.currentTarget.ownerSVGElement?.getBoundingClientRect()
    if (!bounds) return
    setHoveredRegion({
      key,
      x: Math.min(
        Math.max(event.clientX - bounds.left, 84),
        bounds.width - 120
      ),
      y: Math.min(Math.max(event.clientY - bounds.top, 46), bounds.height - 46),
    })
  }

  function handleMapKeyDown(event: KeyboardEvent<SVGPathElement>, key: string) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault()
      onSelectRegion(key)
    }
  }

  return (
    <div className={styles.mapColumn}>
      <div className={styles.mapCanvas}>
        <svg
          aria-label={`Tanzania regional map coloured by ${mapMetricNoun(mapMetric)}`}
          className={styles.mapSvg}
          role="img"
          viewBox={`0 0 ${geometry.width} ${geometry.height}`}
        >
          {geometry.features.map((feature) => {
            const key = normalizeRegionKey(feature.name)
            const datum = dataByRegion.get(key)
            const selected = key === selectedRegionKey
            return (
              <path
                aria-label={`${feature.name}: ${mapMetricValueLabel(mapMetric, datum?.value ?? null)}`}
                className={styles.regionPath}
                data-has-data={
                  datum?.value !== null && datum?.value !== undefined
                }
                data-selected={selected}
                d={feature.path}
                fill={colorFor(datum?.value ?? null)}
                key={feature.code}
                onBlur={() => setHoveredRegion(null)}
                onClick={() => datum && onSelectRegion(key)}
                onFocus={() =>
                  setHoveredRegion({ key, x: geometry.width / 2, y: 42 })
                }
                onKeyDown={(event) => handleMapKeyDown(event, key)}
                onPointerEnter={(event) => updateHover(event, key)}
                onPointerLeave={() => setHoveredRegion(null)}
                onPointerMove={(event) => updateHover(event, key)}
                role={datum ? "button" : undefined}
                tabIndex={datum ? 0 : -1}
                vectorEffect="non-scaling-stroke"
              />
            )
          })}
        </svg>

        {hoveredRegion ? (
          <div
            className={styles.mapTooltip}
            style={
              {
                "--tooltip-x": `${hoveredRegion.x}px`,
                "--tooltip-y": `${hoveredRegion.y}px`,
              } as CSSProperties
            }
          >
            <strong>
              {hoveredDatum?.region.name ??
                geometry.features.find(
                  (feature) =>
                    normalizeRegionKey(feature.name) === hoveredRegion.key
                )?.name}
            </strong>
            <span>
              {mapMetricValueLabel(mapMetric, hoveredDatum?.value ?? null)}
            </span>
          </div>
        ) : null}
      </div>

      <div className={styles.mapLegend}>
        <span className={styles.legendTitle}>{mapMetricNoun(mapMetric)}</span>
        <div aria-hidden className={styles.legendScale}>
          {MAP_COLORS.map((color) => (
            <span key={color} style={{ backgroundColor: color }} />
          ))}
        </div>
        <div className={styles.legendLabels}>
          <span>
            {values.length ? mapMetricValueLabel(mapMetric, values[0]) : "Low"}
          </span>
          <span>
            {values.length
              ? mapMetricValueLabel(mapMetric, values[values.length - 1])
              : "High"}
          </span>
        </div>
        <span className={styles.noDataLegend}>
          <i aria-hidden /> No regional data
        </span>
      </div>
    </div>
  )
}

function buildMapGeometry(geoData: TanzaniaRegionsGeoJson) {
  const points = geoData.features.flatMap((feature) =>
    geometryPoints(feature.geometry)
  )
  const minX = Math.min(...points.map(([x]) => x))
  const maxX = Math.max(...points.map(([x]) => x))
  const minY = Math.min(...points.map(([, y]) => y))
  const maxY = Math.max(...points.map(([, y]) => y))
  const width = 620
  const height = 680
  const padding = 22

  function project([longitude, latitude]: number[]) {
    const x =
      padding + ((longitude - minX) / (maxX - minX)) * (width - padding * 2)
    const y =
      padding + ((maxY - latitude) / (maxY - minY)) * (height - padding * 2)
    return [x, y]
  }

  return {
    width,
    height,
    features: geoData.features.map((feature) => ({
      code: feature.properties.reg_code,
      name: feature.properties.reg_name,
      path: geometryPath(feature.geometry, project),
    })),
  }
}

function geometryPoints(geometry: GeoJsonGeometry): number[][] {
  if (geometry.type === "Polygon") return geometry.coordinates.flat()
  return geometry.coordinates.flat(2)
}

function geometryPath(
  geometry: GeoJsonGeometry,
  project: (point: number[]) => number[]
) {
  const polygons =
    geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates

  return polygons
    .map((polygon) =>
      polygon
        .map((ring) =>
          ring
            .map((point, index) => {
              const [x, y] = project(point)
              return `${index === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`
            })
            .join(" ")
            .concat(" Z")
        )
        .join(" ")
    )
    .join(" ")
}

function RegionRanking({
  mapMetric,
  onSelectRegion,
  regionData,
  selectedRegion,
  selectedRegionKey,
  subject,
}: {
  mapMetric: MapMetric
  onSelectRegion: (key: string) => void
  regionData: RegionDatum[]
  selectedRegion: RegionDatum | undefined
  selectedRegionKey: string
  subject: AnalyticsSubject
}) {
  const ranked = regionData.filter((item) => item.value !== null)
  const selectedRank = ranked.findIndex(
    (item) => item.region.key === selectedRegionKey
  )

  return (
    <aside className={styles.regionPanel}>
      <div className={styles.regionSelected}>
        <span className={styles.panelLabel}>Selected region</span>
        <div className={styles.regionSelectedHeading}>
          <div>
            <h3>{selectedRegion?.region.name ?? "No region selected"}</h3>
            <span>
              {selectedRank >= 0
                ? `#${selectedRank + 1} of ${ranked.length} regions`
                : "Below the rate-view sample threshold"}
            </span>
          </div>
          <strong>
            {mapMetricValueLabel(mapMetric, selectedRegion?.value ?? null)}
          </strong>
        </div>

        {selectedRegion?.stats ? (
          <dl className={styles.regionDetails}>
            <div>
              <dt>A grades</dt>
              <dd>{formatNumber(selectedRegion.stats.aCount)}</dd>
            </div>
            <div>
              <dt>A-C share</dt>
              <dd>{formatPercent(selectedRegion.stats.abcRate)}</dd>
            </div>
            <div>
              <dt>Valid sittings</dt>
              <dd>{formatNumber(selectedRegion.stats.sittings)}</dd>
            </div>
          </dl>
        ) : null}
      </div>

      <div className={styles.rankingHeader}>
        <span>Regional ranking</span>
        <span>{subject.name}</span>
      </div>
      <ol className={styles.regionList}>
        {ranked.slice(0, 8).map((item, index) => (
          <li key={item.region.key}>
            <button
              aria-current={
                item.region.key === selectedRegionKey ? "true" : undefined
              }
              onClick={() => onSelectRegion(item.region.key)}
              type="button"
            >
              <span className={styles.regionRank}>{index + 1}</span>
              <span className={styles.regionName}>{item.region.name}</span>
              <strong>{mapMetricValueLabel(mapMetric, item.value)}</strong>
              <HugeiconsIcon icon={ArrowRight01Icon} size={17} />
            </button>
          </li>
        ))}
      </ol>
    </aside>
  )
}

function GradeProfile({ stats }: { stats: SubjectStats }) {
  return (
    <article className={styles.gradeProfile}>
      <div className={styles.chartTitleRow}>
        <div>
          <span className={styles.panelLabel}>Grade distribution</span>
          <h3>{formatNumber(stats.sittings)} valid sittings</h3>
        </div>
        <div className={styles.strongPassStat}>
          <strong>{formatPercent(stats.abcRate)}</strong>
          <span>A-C share</span>
        </div>
      </div>

      <div
        aria-label="Stacked grade distribution"
        className={styles.gradeStack}
        role="img"
      >
        {GRADE_ORDER.map((grade) => {
          const count = stats.grades[grade]
          const width = stats.sittings ? (count / stats.sittings) * 100 : 0
          if (!count) return null
          return (
            <span
              aria-label={`Grade ${grade}: ${formatNumber(count)}, ${formatPercent(width)}`}
              key={grade}
              style={{
                backgroundColor: GRADE_COLORS[grade],
                width: `${Math.max(width, 0.35)}%`,
              }}
              title={`Grade ${grade}: ${formatNumber(count)} (${formatPercent(width)})`}
            />
          )
        })}
      </div>

      <div className={styles.gradeLegend}>
        {GRADE_ORDER.map((grade) => {
          const count = stats.grades[grade]
          const percentage = stats.sittings ? (count / stats.sittings) * 100 : 0
          return (
            <div key={grade}>
              <span
                aria-hidden
                className={styles.gradeSwatch}
                style={{ backgroundColor: GRADE_COLORS[grade] }}
              />
              <span className={styles.gradeLabel}>Grade {grade}</span>
              <strong>{formatPercent(percentage)}</strong>
              <small>{formatNumber(count)}</small>
            </div>
          )
        })}
      </div>

      <div className={styles.gradeFooter}>
        <span>
          Principal pass (A-E){" "}
          <strong>{formatPercent(stats.principalPassRate)}</strong>
        </span>
        <span>
          Excluded X/I <strong>{formatNumber(stats.excluded)}</strong>
        </span>
      </div>
    </article>
  )
}

function SexComparison({ subject }: { subject: AnalyticsSubject }) {
  const female = subject.stats.female
  const male = subject.stats.male
  const femaleRate = female.abcRate ?? 0
  const maleRate = male.abcRate ?? 0
  const difference = Math.abs(femaleRate - maleRate)
  const leader =
    femaleRate === maleRate ? null : femaleRate > maleRate ? "Female" : "Male"

  return (
    <article className={styles.sexComparison}>
      <div className={styles.chartTitleRow}>
        <div>
          <span className={styles.panelLabel}>Sex comparison</span>
          <h3>A-C outcome gap</h3>
        </div>
        <span className={styles.gapPill}>
          {leader ? `${leader} +${difference.toFixed(1)} pp` : "Even"}
        </span>
      </div>

      <div className={styles.sexBars}>
        <ComparisonBar
          count={female.sittings}
          label="Female"
          rate={femaleRate}
          tone="coral"
        />
        <ComparisonBar
          count={male.sittings}
          label="Male"
          rate={maleRate}
          tone="blue"
        />
      </div>

      <div className={styles.sexStats}>
        <div>
          <span>Female A grades</span>
          <strong>{formatNumber(female.aCount)}</strong>
        </div>
        <div>
          <span>Male A grades</span>
          <strong>{formatNumber(male.aCount)}</strong>
        </div>
      </div>
    </article>
  )
}

function ComparisonBar({
  count,
  label,
  rate,
  tone,
}: {
  count: number
  label: string
  rate: number
  tone: "coral" | "blue"
}) {
  return (
    <div className={styles.comparisonBar}>
      <div>
        <span>{label}</span>
        <small>{formatNumber(count)} sittings</small>
      </div>
      <div className={styles.comparisonTrack}>
        <span
          className={tone === "coral" ? styles.barCoral : styles.barBlue}
          style={{ width: `${rate}%` }}
        />
      </div>
      <strong>{formatPercent(rate)}</strong>
    </div>
  )
}

function SubjectComparison({
  activeSubjectKey,
  onSelectSubject,
  sex,
  subjects,
}: {
  activeSubjectKey: string
  onSelectSubject: (key: string) => void
  sex: AnalyticsSex
  subjects: AnalyticsSubject[]
}) {
  const ranked = subjects
    .filter(
      (subject) => subject.stats[sex].sittings >= NATIONAL_SUBJECT_MINIMUM
    )
    .sort((a, b) => (b.stats[sex].abcRate ?? -1) - (a.stats[sex].abcRate ?? -1))

  return (
    <div className={styles.subjectComparison}>
      <div className={styles.subjectAxis}>
        <span>Subject</span>
        <div>
          <span>0%</span>
          <span>50%</span>
          <span>100%</span>
        </div>
      </div>
      <ol>
        {ranked.map((subject, index) => {
          const stats = subject.stats[sex]
          const rate = stats.abcRate ?? 0
          const active = subject.key === activeSubjectKey
          return (
            <li key={subject.key}>
              <button
                aria-current={active ? "true" : undefined}
                onClick={() => onSelectSubject(subject.key)}
                type="button"
              >
                <span className={styles.subjectRank}>{index + 1}</span>
                <span className={styles.subjectName}>{subject.name}</span>
                <span className={styles.subjectBarTrack}>
                  <span style={{ width: `${rate}%` }} />
                </span>
                <strong>{formatPercent(rate)}</strong>
                <small>{formatCompact(stats.sittings)} sittings</small>
              </button>
            </li>
          )
        })}
      </ol>
    </div>
  )
}

function SchoolPerformanceExplorer({ data }: { data: AcseeAnalyticsData }) {
  const initialSubject =
    data.subjects.find((subject) => subject.key === DEFAULT_SUBJECT) ??
    data.subjects[0]
  const initialCombination =
    data.combinations.find(
      (combination) => combination.key === DEFAULT_COMBINATION
    ) ?? data.combinations[0]
  const [view, setView] = useState<SchoolView>("subject")
  const [subjectKey, setSubjectKey] = useState(initialSubject.key)
  const [combinationKey, setCombinationKey] = useState(initialCombination.key)
  const [schoolSex, setSchoolSex] = useState<AnalyticsSex>("all")

  const selectedSubject =
    data.subjects.find((subject) => subject.key === subjectKey) ??
    initialSubject
  const selectedCombination =
    data.combinations.find(
      (combination) => combination.key === combinationKey
    ) ?? initialCombination
  const isCombination = view === "combination"
  const leaders: SchoolRankDatum[] = isCombination
    ? selectedCombination.leaders[schoolSex].map((leader) => ({
        ...leader,
        cohort: leader.candidates,
      }))
    : selectedSubject.leaders[schoolSex].map((leader) => ({
        ...leader,
        cohort: leader.sittings,
        allAbcRate: null,
        aCount: null,
      }))
  const winner = leaders[0]
  const comparisonName = isCombination
    ? selectedCombination.label
    : selectedSubject.name
  const comparisonDetail = isCombination
    ? selectedCombination.name
    : `${selectedSubject.name} subject results`
  const minimum = isCombination
    ? data.metadata.thresholds.centreCombinationMinimum
    : data.metadata.thresholds.centreSubjectMinimum
  const nationalCohort = isCombination
    ? selectedCombination.stats[schoolSex].candidates
    : selectedSubject.stats[schoolSex].sittings
  const chartData = leaders.slice(0, 8).map((leader) => ({
    ...leader,
    school: titleCaseName(leader.name),
    shortSchool: shortSchoolName(leader.name),
  }))

  return (
    <div className={styles.schoolExplorer}>
      <div className={styles.schoolControls}>
        <div className={styles.schoolModeControl}>
          <span className={styles.controlLabel}>Compare by</span>
          <SegmentedControl
            label="School comparison type"
            onChange={setView}
            options={[
              { key: "subject", label: "Subject", shortLabel: "Subject" },
              {
                key: "combination",
                label: "Combination",
                shortLabel: "Combination",
              },
            ]}
            value={view}
          />
        </div>

        <div className={styles.schoolMeasureControl}>
          <label htmlFor="school-performance-measure">
            {isCombination ? "Combination" : "Subject"}
          </label>
          <div className={styles.selectWrap}>
            {isCombination ? (
              <select
                id="school-performance-measure"
                onChange={(event) => setCombinationKey(event.target.value)}
                value={selectedCombination.key}
              >
                {data.combinations.map((combination) => (
                  <option key={combination.key} value={combination.key}>
                    {combination.label} · {combination.name}
                  </option>
                ))}
              </select>
            ) : (
              <select
                id="school-performance-measure"
                onChange={(event) => setSubjectKey(event.target.value)}
                value={selectedSubject.key}
              >
                {data.subjects.map((subject) => (
                  <option key={subject.key} value={subject.key}>
                    {subject.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        <div className={styles.schoolSexControl}>
          <span className={styles.controlLabel}>Candidates</span>
          <SegmentedControl
            label="School ranking candidate sex"
            onChange={setSchoolSex}
            options={SEX_OPTIONS}
            value={schoolSex}
          />
        </div>
      </div>

      {winner ? (
        <>
          <div className={styles.schoolAnswer}>
            <div className={styles.winnerIdentity}>
              <span className={styles.winnerBadge}>#1 in {comparisonName}</span>
              <h3>{titleCaseName(winner.name)}</h3>
              <p>
                {winner.code}
                {winner.region ? ` · ${winner.region}` : ""}
                {winner.council ? ` · ${winner.council}` : ""}
              </p>
              <span className={styles.winnerContext}>{comparisonDetail}</span>
            </div>

            <div className={styles.winnerScore}>
              <strong>{formatPercent(winner.rate)}</strong>
              <span>observed A-C share</span>
              <small>
                Ranked by {formatPercent(winner.rankScore)} confidence score
              </small>
            </div>

            <dl className={styles.winnerEvidence}>
              <div>
                <dt>
                  {isCombination ? "Complete candidates" : "Valid sittings"}
                </dt>
                <dd>{formatNumber(winner.cohort)}</dd>
              </div>
              <div>
                <dt>{isCombination ? "All-three A-C" : "A-C grades"}</dt>
                <dd>
                  {isCombination
                    ? formatPercent(winner.allAbcRate)
                    : formatNumber(winner.successes)}
                </dd>
              </div>
              <div>
                <dt>{isCombination ? "A grades" : "National sittings"}</dt>
                <dd>
                  {isCombination
                    ? formatNumber(winner.aCount ?? 0)
                    : formatCompact(nationalCohort)}
                </dd>
              </div>
            </dl>
          </div>

          <div className={styles.schoolResultsGrid}>
            <div className={styles.schoolChartPanel}>
              <div className={styles.schoolPanelHeading}>
                <div>
                  <span className={styles.panelLabel}>Top eight</span>
                  <h3>National A-C distribution</h3>
                </div>
                <span>{comparisonName}</span>
              </div>

              <ChartContainer
                className={styles.schoolChart}
                config={SCHOOL_CHART_CONFIG}
                initialDimension={{ width: 680, height: 380 }}
              >
                <BarChart
                  accessibilityLayer
                  data={chartData}
                  layout="vertical"
                  margin={{ left: 0, right: 24, top: 8, bottom: 8 }}
                >
                  <CartesianGrid horizontal={false} stroke="#e0e5e1" />
                  <XAxis
                    axisLine={false}
                    dataKey="rate"
                    domain={[0, 100]}
                    tickFormatter={(value) => `${value}%`}
                    tickLine={false}
                    type="number"
                  />
                  <YAxis
                    axisLine={false}
                    dataKey="shortSchool"
                    tickLine={false}
                    type="category"
                    width={126}
                  />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        hideLabel
                        formatter={(value) => (
                          <span className={styles.tooltipValue}>
                            {formatPercent(Number(value))} A-C share
                          </span>
                        )}
                      />
                    }
                    cursor={{ fill: "rgba(11, 102, 85, 0.05)" }}
                  />
                  <Bar dataKey="rate" radius={[0, 4, 4, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell
                        fill={index === 0 ? "#d5804b" : "#0b6655"}
                        key={entry.code}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ChartContainer>
            </div>

            <div className={styles.schoolRankingPanel}>
              <div className={styles.schoolPanelHeading}>
                <div>
                  <span className={styles.panelLabel}>National ranking</span>
                  <h3>Top schools</h3>
                </div>
                <span>
                  {schoolSex === "all" ? "All candidates" : schoolSex}
                </span>
              </div>

              <ol className={styles.schoolRankingList}>
                {leaders.map((leader) => (
                  <li key={leader.code}>
                    <span className={styles.schoolRank}>{leader.rank}</span>
                    <div>
                      <strong>{titleCaseName(leader.name)}</strong>
                      <span>
                        {leader.region ?? "Region unavailable"} ·{" "}
                        {formatNumber(leader.cohort)}{" "}
                        {isCombination ? "candidates" : "sittings"}
                      </span>
                    </div>
                    <strong>{formatPercent(leader.rate)}</strong>
                  </li>
                ))}
              </ol>
            </div>
          </div>

          <div className={styles.schoolMethodNote}>
            <HugeiconsIcon icon={InformationCircleIcon} size={18} />
            <p>
              {isCombination ? (
                <>
                  {selectedCombination.label} includes only candidates with
                  valid grades in {selectedCombination.name}. The A-C share
                  counts all three component grades; “all-three A-C” requires A,
                  B, or C in every subject.
                </>
              ) : (
                <>
                  Subject rankings use valid {selectedSubject.name} sittings
                  only.
                </>
              )}{" "}
              Minimum {minimum}{" "}
              {isCombination ? "complete candidates" : "valid sittings"} per
              school. Ranking uses the 95% Wilson lower bound; the displayed
              percentage is the observed result. This is descriptive analysis,
              not an admission eligibility decision.
            </p>
          </div>
        </>
      ) : (
        <div className={styles.emptySchoolRanking}>
          <HugeiconsIcon icon={InformationCircleIcon} size={20} />
          <div>
            <strong>No school reaches the comparison threshold.</strong>
            <span>
              Try another candidate group or measure. A school needs at least{" "}
              {minimum}{" "}
              {isCombination ? "complete candidates" : "valid sittings"} to
              appear.
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

function shortSchoolName(value: string) {
  const name = titleCaseName(value)
    .replace(/ Secondary School$/i, "")
    .replace(/ High School$/i, "")
  return name.length > 20 ? `${name.slice(0, 19)}…` : name
}

function MethodItem({
  children,
  index,
  title,
}: {
  children: React.ReactNode
  index: string
  title: string
}) {
  return (
    <article className={styles.methodItem}>
      <span>{index}</span>
      <div>
        <h3>{title}</h3>
        <p>{children}</p>
      </div>
    </article>
  )
}

function DataSources({ data }: { data: AcseeAnalyticsData }) {
  return (
    <section
      aria-labelledby="source-ledger-title"
      className={styles.sourcesSection}
    >
      <div className={`${styles.shell} ${styles.sourcesInner}`}>
        <div>
          <p className={styles.sectionEyebrow}>Source ledger</p>
          <h2 id="source-ledger-title">Public data, traceable to source.</h2>
          <p className={styles.sourcesDescription}>
            Results, centre joins, and map boundaries remain linked to their
            published references.
          </p>
        </div>
        <div className={styles.sourceLinks}>
          {data.metadata.sources.map((source) => (
            <a
              href={source.url}
              key={source.id}
              rel="noreferrer"
              target="_blank"
            >
              {source.label}
              <HugeiconsIcon icon={ArrowUpRight01Icon} size={14} />
            </a>
          ))}
        </div>
      </div>
    </section>
  )
}
