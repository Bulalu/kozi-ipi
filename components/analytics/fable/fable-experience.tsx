"use client"

import Link from "next/link"
import { useMemo, useState } from "react"

import type {
  AcseeAnalyticsData,
  AnalyticsSex,
  TanzaniaRegionsGeoJson,
} from "@/lib/analytics/types"

import {
  DivisionStrip,
  GradeDistribution,
  RegionRankList,
  SubjectHeadlineStats,
  type RankedRegionDatum,
} from "./fable-charts"
import {
  formatInt,
  formatRate,
  normalizeRegionKey,
  SEX_OPTIONS,
  SEX_PHRASE,
} from "./fable-data"
import {
  FableLeaderboard,
  schoolCase,
  type LeaderboardRow,
} from "./fable-leaderboard"
import { FableMap, type MapRegionValue } from "./fable-map"
import styles from "./fable.module.css"

type FableExperienceProps = {
  data: AcseeAnalyticsData
  geo: TanzaniaRegionsGeoJson
}

type MapMetricKey = "divisionOneTwoRate" | "divisionOneRate" | "candidates"

const MAP_METRICS: Array<{
  key: MapMetricKey
  label: string
  shortLabel: string
}> = [
  {
    key: "divisionOneTwoRate",
    label: "share of graded candidates earning Division I–II",
    shortLabel: "Division I–II share",
  },
  {
    key: "divisionOneRate",
    label: "share of graded candidates earning Division I",
    shortLabel: "Division I share",
  },
  {
    key: "candidates",
    label: "candidates registered",
    shortLabel: "Candidates",
  },
]

const DEFAULT_SUBJECT = "advanced_mathematics"
const DEFAULT_COMBINATION = "pcm"

const SECTIONS = [
  { id: "nation", numeral: "01", label: "The Nation" },
  { id: "regions", numeral: "02", label: "The Regions" },
  { id: "subjects", numeral: "03", label: "The Subjects" },
  { id: "combinations", numeral: "04", label: "The Combinations" },
  { id: "honour-roll", numeral: "05", label: "The Honour Roll" },
]

export function FableExperience({ data, geo }: FableExperienceProps) {
  const [sex, setSex] = useState<AnalyticsSex>("all")
  const [mapMetric, setMapMetric] = useState<MapMetricKey>("divisionOneTwoRate")
  const [subjectKey, setSubjectKey] = useState(DEFAULT_SUBJECT)
  const [combinationKey, setCombinationKey] = useState(DEFAULT_COMBINATION)
  const [hoveredRegion, setHoveredRegion] = useState<string | null>(null)

  const national = data.national[sex]
  const metric = MAP_METRICS.find((entry) => entry.key === mapMetric)!
  const subject =
    data.subjects.find((entry) => entry.key === subjectKey) ?? data.subjects[0]
  const combination =
    data.combinations.find((entry) => entry.key === combinationKey) ??
    data.combinations[0]

  const isRateMetric = mapMetric !== "candidates"
  const formatMetricValue = isRateMetric ? formatRate : formatInt

  const mapValues = useMemo(() => {
    const values = new Map<string, MapRegionValue>()
    for (const region of data.regions) {
      const stats = region.candidates[sex]
      values.set(normalizeRegionKey(region.name), {
        key: normalizeRegionKey(region.name),
        name: region.name,
        value: stats[mapMetric],
        detail: [
          { label: "Candidates", value: formatInt(stats.candidates) },
          { label: "Division I", value: formatRate(stats.divisionOneRate) },
          {
            label: "Division I–II",
            value: formatRate(stats.divisionOneTwoRate),
          },
        ],
      })
    }
    return values
  }, [data.regions, sex, mapMetric])

  const regionRanks = useMemo<RankedRegionDatum[]>(() => {
    return data.regions
      .map((region) => {
        const stats = region.candidates[sex]
        return {
          key: normalizeRegionKey(region.name),
          name: region.name,
          value: stats[mapMetric],
          valueLabel: formatMetricValue(stats[mapMetric] ?? 0),
          detailLabel: `${formatInt(stats.candidates)} candidates`,
        }
      })
      .sort((a, b) => (b.value ?? -1) - (a.value ?? -1))
  }, [data.regions, sex, mapMetric, formatMetricValue])

  const subjectRegionRanks = useMemo<RankedRegionDatum[]>(() => {
    return data.regions
      .map((region) => {
        const stats = region.subjects[subject.key]?.[sex]
        return {
          key: normalizeRegionKey(region.name),
          name: region.name,
          value: stats?.abcRate ?? null,
          valueLabel: formatRate(stats?.abcRate ?? null),
          detailLabel: `${formatInt(stats?.sittings ?? 0)} sittings`,
        }
      })
      .sort((a, b) => (b.value ?? -1) - (a.value ?? -1))
  }, [data.regions, subject, sex])

  const subjectLeaders = useMemo<LeaderboardRow[]>(() => {
    return subject.leaders[sex].map((leader) => ({
      code: leader.code,
      rank: leader.rank,
      name: leader.name,
      region: leader.region,
      council: leader.council,
      cohort: leader.sittings,
      cohortLabel: `${formatInt(leader.sittings)} sittings`,
      rate: leader.rate,
      rateLabel: formatRate(leader.rate),
      extras: [{ label: "A–C grades", value: formatInt(leader.successes) }],
    }))
  }, [subject, sex])

  const combinationLeaders = useMemo<LeaderboardRow[]>(() => {
    return combination.leaders[sex].map((leader) => ({
      code: leader.code,
      rank: leader.rank,
      name: leader.name,
      region: leader.region,
      council: leader.council,
      cohort: leader.candidates,
      cohortLabel: `${formatInt(leader.candidates)} candidates`,
      rate: leader.rate,
      rateLabel: formatRate(leader.rate),
      extras: [
        { label: "All three A–C", value: formatRate(leader.allAbcRate) },
        { label: "A grades", value: formatInt(leader.aCount) },
      ],
    }))
  }, [combination, sex])

  const overallLeaders = useMemo<LeaderboardRow[]>(() => {
    return data.centreLeaders.overall.map((leader) => ({
      code: leader.code,
      rank: leader.rank,
      name: leader.name,
      region: leader.region,
      council: leader.council,
      cohort: leader.sittings,
      cohortLabel: `${formatInt(leader.sittings)} candidates`,
      rate: leader.rate,
      rateLabel: formatRate(leader.rate),
      extras: [{ label: "Division I–II", value: formatInt(leader.successes) }],
    }))
  }, [data.centreLeaders.overall])

  const answers = useMemo(() => {
    const advanced = data.subjects.find(
      (entry) => entry.key === "advanced_mathematics"
    )
    const physics = data.subjects.find((entry) => entry.key === "physics")
    const pcm = data.combinations.find((entry) => entry.key === "pcm")
    const cards: Array<{
      question: string
      school: string
      place: string
      figure: string
      href: string
      onSelect: () => void
    }> = []
    const advLeader = advanced?.leaders[sex][0]
    if (advanced && advLeader) {
      cards.push({
        question: "Best school in Advanced Mathematics?",
        school: schoolCase(advLeader.name),
        place: advLeader.region ?? "Region unmapped",
        figure: `${formatRate(advLeader.rate)} A–C`,
        href: "#subjects",
        onSelect: () => setSubjectKey(advanced.key),
      })
    }
    const physicsLeader = physics?.leaders[sex][0]
    if (physics && physicsLeader) {
      cards.push({
        question: "Best school in Physics?",
        school: schoolCase(physicsLeader.name),
        place: physicsLeader.region ?? "Region unmapped",
        figure: `${formatRate(physicsLeader.rate)} A–C`,
        href: "#subjects",
        onSelect: () => setSubjectKey(physics.key),
      })
    }
    const pcmLeader = pcm?.leaders[sex][0]
    if (pcm && pcmLeader) {
      cards.push({
        question: "Best school for the PCM combination?",
        school: schoolCase(pcmLeader.name),
        place: pcmLeader.region ?? "Region unmapped",
        figure: `${formatRate(pcmLeader.allAbcRate)} all-three A–C`,
        href: "#combinations",
        onSelect: () => setCombinationKey(pcm.key),
      })
    }
    return cards
  }, [data.subjects, data.combinations, sex])

  const generatedDate = new Date(data.metadata.generatedAt).toLocaleDateString(
    "en-TZ",
    { day: "numeric", month: "long", year: "numeric" }
  )

  const combinationSubjectNames = combination.subjects
    .map(
      (key) =>
        data.subjects.find((entry) => entry.key === key)?.name ??
        key.replace(/_/g, " ")
    )
    .join(" · ")

  return (
    <div className={styles.root}>
      <div className={styles.grain} aria-hidden="true" />

      <header className={styles.masthead}>
        <Link href="/" className={styles.mastheadBrand}>
          Kozi Ipi <span>Data Desk</span>
        </Link>
        <p className={styles.mastheadEdition}>
          ACSEE · Vol. {data.metadata.examYear}
        </p>
        <Link href="/analytics" className={styles.mastheadLink}>
          Classic view →
        </Link>
      </header>

      <section className={styles.hero}>
        <p className={`${styles.overline} ${styles.reveal}`}>
          The Form Six Almanac
        </p>
        <h1 className={`${styles.heroTitle} ${styles.reveal}`}>
          The year {formatInt(data.national.all.candidates)} candidates
          <br className={styles.heroBreak} /> sat for Form Six.
        </h1>
        <p
          className={`${styles.heroDek} ${styles.reveal}`}
          style={{ animationDelay: "120ms" }}
        >
          A reading of the {data.metadata.examYear} Advanced Certificate of
          Secondary Education results — nation, regions, subjects, and the
          schools behind the grades. Currently reading:{" "}
          <strong>{SEX_PHRASE[sex]}</strong>.
        </p>

        <dl
          className={`${styles.kpiRow} ${styles.reveal}`}
          style={{ animationDelay: "220ms" }}
        >
          <div className={styles.kpiTile}>
            <dd>{formatInt(national.candidates)}</dd>
            <dt>Candidates registered</dt>
            <p>{formatInt(national.released)} received results</p>
          </div>
          <div className={styles.kpiTile}>
            <dd>{formatRate(national.divisionOneRate)}</dd>
            <dt>Division I</dt>
            <p>{formatInt(national.divisionOne)} candidates</p>
          </div>
          <div className={styles.kpiTile}>
            <dd>{formatRate(national.divisionOneTwoRate)}</dd>
            <dt>Division I–II</dt>
            <p>{formatInt(national.divisionOneTwo)} candidates</p>
          </div>
          <div className={styles.kpiTile}>
            <dd>{formatRate(national.absenceRate)}</dd>
            <dt>Absence rate</dt>
            <p>
              {formatInt(national.absent)} absent ·{" "}
              {formatInt(national.notEligible)} ineligible
            </p>
          </div>
        </dl>

        {answers.length > 0 && (
          <div
            className={`${styles.answerRow} ${styles.reveal}`}
            style={{ animationDelay: "320ms" }}
          >
            {answers.map((card) => (
              <a
                key={card.question}
                href={card.href}
                className={styles.answerCard}
                onClick={card.onSelect}
              >
                <p className={styles.answerQuestion}>{card.question}</p>
                <p className={styles.answerSchool}>{card.school}</p>
                <p className={styles.answerMeta}>
                  {card.place} · <strong>{card.figure}</strong>
                </p>
              </a>
            ))}
          </div>
        )}
      </section>

      <nav className={styles.indexBar} aria-label="Almanac sections">
        <div className={styles.indexLinks}>
          {SECTIONS.map((section) => (
            <a key={section.id} href={`#${section.id}`}>
              <span>{section.numeral}</span> {section.label}
            </a>
          ))}
        </div>
        <div
          className={styles.segmented}
          role="group"
          aria-label="Filter results by sex"
        >
          {SEX_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              className={sex === option.value ? styles.segmentActive : ""}
              aria-pressed={sex === option.value}
              onClick={() => setSex(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </nav>

      <main className={styles.chapters}>
        <section id="nation" className={styles.chapter}>
          <header className={styles.chapterHead}>
            <p className={styles.chapterNumeral}>№ 01</p>
            <h2>The Nation</h2>
            <p className={styles.chapterDek}>
              Of the {formatInt(national.released)} {SEX_PHRASE[sex]} whose
              results were released, {formatRate(national.divisionOneRate)}{" "}
              earned Division I and {formatRate(national.divisionOneTwoRate)}{" "}
              finished in Division I or II.
            </p>
          </header>

          <DivisionStrip
            stats={national}
            caption={`Division outcomes for ${SEX_PHRASE[sex]}`}
          />

          <div className={styles.compareBlock}>
            <h3 className={styles.blockTitle}>Girls and boys, side by side</h3>
            <div className={styles.compareRows}>
              {(["female", "male"] as const).map((group) => {
                const stats = data.national[group]
                return (
                  <div key={group} className={styles.compareRow}>
                    <span className={styles.compareLabel}>
                      {group === "female" ? "Girls" : "Boys"}
                    </span>
                    <span className={styles.compareTrack}>
                      <span
                        className={styles.compareBar}
                        style={{
                          width: `${stats.divisionOneRate ?? 0}%`,
                        }}
                      />
                    </span>
                    <span className={styles.compareValue}>
                      {formatRate(stats.divisionOneRate)} Division I
                      <em>{formatInt(stats.divisionOne)} candidates</em>
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        <section id="regions" className={styles.chapter}>
          <header className={styles.chapterHead}>
            <p className={styles.chapterNumeral}>№ 02</p>
            <h2>The Regions</h2>
            <p className={styles.chapterDek}>
              Twenty-six mainland regions, shaded by {metric.label} for{" "}
              {SEX_PHRASE[sex]}. Hover a region — or scan the ranked ledger
              beside it.
            </p>
          </header>

          <div className={styles.chipRow} role="group" aria-label="Map metric">
            {MAP_METRICS.map((entry) => (
              <button
                key={entry.key}
                type="button"
                className={`${styles.chip} ${mapMetric === entry.key ? styles.chipActive : ""}`}
                aria-pressed={mapMetric === entry.key}
                onClick={() => setMapMetric(entry.key)}
              >
                {entry.shortLabel}
              </button>
            ))}
          </div>

          <div className={styles.mapLayout}>
            <FableMap
              geo={geo}
              valuesByRegion={mapValues}
              formatValue={formatMetricValue}
              metricLabel={metric.label}
              hoveredRegion={hoveredRegion}
              onHoverRegion={setHoveredRegion}
            />
            <div className={styles.mapAside}>
              <h3 className={styles.blockTitle}>
                Regions ranked · {metric.shortLabel.toLowerCase()}
              </h3>
              <RegionRankList
                data={regionRanks}
                hoveredRegion={hoveredRegion}
                onHoverRegion={setHoveredRegion}
              />
            </div>
          </div>
          <p className={styles.footnote}>
            Regional mapping covers{" "}
            {data.metadata.regionalCoverage.mappedPercent}% of candidates (
            {formatInt(data.metadata.regionalCoverage.mappedCandidates)} of{" "}
            {formatInt(data.metadata.regionalCoverage.totalCandidates)});
            Zanzibar shapes appear unshaded because the mainland directory does
            not map them.
          </p>
        </section>

        <section id="subjects" className={styles.chapter}>
          <header className={styles.chapterHead}>
            <p className={styles.chapterNumeral}>№ 03</p>
            <h2>The Subjects</h2>
            <p className={styles.chapterDek}>
              Pick a subject to read its grade ledger, the regions where it is
              strongest, and the schools that teach it best.
            </p>
          </header>

          <div
            className={styles.chipRow}
            role="group"
            aria-label="Choose a subject"
          >
            {data.subjects.map((entry) => (
              <button
                key={entry.key}
                type="button"
                className={`${styles.chip} ${subject.key === entry.key ? styles.chipActive : ""}`}
                aria-pressed={subject.key === entry.key}
                onClick={() => setSubjectKey(entry.key)}
              >
                {entry.name}
              </button>
            ))}
          </div>

          <div className={styles.subjectPanel}>
            <div className={styles.subjectHeader}>
              <h3 className={styles.subjectTitle}>{subject.name}</h3>
              <SubjectHeadlineStats stats={subject.stats[sex]} />
            </div>

            <div className={styles.subjectColumns}>
              <div className={styles.subjectColumn}>
                <h4 className={styles.blockTitle}>Grade ledger</h4>
                <GradeDistribution stats={subject.stats[sex]} />
                {subject.stats[sex].excluded > 0 && (
                  <p className={styles.footnote}>
                    {formatInt(subject.stats[sex].excluded)} sittings excluded
                    (absent or results withheld).
                  </p>
                )}
              </div>
              <div className={styles.subjectColumn}>
                <h4 className={styles.blockTitle}>
                  Regions ranked · A–C share
                </h4>
                <RegionRankList
                  data={subjectRegionRanks}
                  emptyNote={`Fewer than ${data.metadata.thresholds.regionalRateMinimum} sittings`}
                />
              </div>
            </div>

            <div className={styles.subjectLeaders}>
              <h4 className={styles.blockTitle}>
                Where {subject.name} is taught best
              </h4>
              <FableLeaderboard
                rows={subjectLeaders}
                rateHeading="A–C share"
                emptyMessage={`No school reached the ${data.metadata.thresholds.centreSubjectMinimum}-sitting minimum for ${subject.name} in this view.`}
              />
            </div>
          </div>
        </section>

        <section id="combinations" className={styles.chapter}>
          <header className={styles.chapterHead}>
            <p className={styles.chapterNumeral}>№ 04</p>
            <h2>The Combinations</h2>
            <p className={styles.chapterDek}>
              Complete three-subject combinations, judged across every grade a
              candidate earned — and on sweeping A–C in all three.
            </p>
          </header>

          <div
            className={styles.chipRow}
            role="group"
            aria-label="Choose a combination"
          >
            {data.combinations.map((entry) => (
              <button
                key={entry.key}
                type="button"
                className={`${styles.chip} ${styles.chipCombo} ${combination.key === entry.key ? styles.chipActive : ""}`}
                aria-pressed={combination.key === entry.key}
                onClick={() => setCombinationKey(entry.key)}
              >
                <strong>{entry.label}</strong>
                <span>{entry.name}</span>
              </button>
            ))}
          </div>

          <div className={styles.subjectPanel}>
            <div className={styles.subjectHeader}>
              <h3 className={styles.subjectTitle}>
                {combination.label}
                <span className={styles.subjectSubtitle}>
                  {combinationSubjectNames}
                </span>
              </h3>
              <dl className={styles.subjectStatRow}>
                <div className={styles.subjectStatCell}>
                  <dd>{formatInt(combination.stats[sex].candidates)}</dd>
                  <dt>Complete candidates</dt>
                </div>
                <div className={styles.subjectStatCell}>
                  <dd>{formatRate(combination.stats[sex].abcRate)}</dd>
                  <dt>A–C share of grades</dt>
                </div>
                <div className={styles.subjectStatCell}>
                  <dd>{formatRate(combination.stats[sex].allAbcRate)}</dd>
                  <dt>A–C in all three</dt>
                </div>
                <div className={styles.subjectStatCell}>
                  <dd>
                    {formatRate(combination.stats[sex].principalPassRate)}
                  </dd>
                  <dt>Principal pass (A–E)</dt>
                </div>
              </dl>
            </div>

            <div className={styles.subjectLeaders}>
              <h4 className={styles.blockTitle}>
                The best {combination.label} schools
              </h4>
              <FableLeaderboard
                rows={combinationLeaders}
                rateHeading="A–C share"
                emptyMessage={`No school reached the ${data.metadata.thresholds.centreCombinationMinimum}-candidate minimum for ${combination.label} in this view.`}
              />
            </div>
          </div>
        </section>

        <section id="honour-roll" className={styles.chapter}>
          <header className={styles.chapterHead}>
            <p className={styles.chapterNumeral}>№ 05</p>
            <h2>The Honour Roll</h2>
            <p className={styles.chapterDek}>
              The examination centres with the strongest overall results —
              ranked on the share of candidates finishing in Division I or II,
              with at least {data.metadata.thresholds.centreOverallMinimum}{" "}
              candidates.
            </p>
          </header>
          <FableLeaderboard
            rows={overallLeaders}
            rateHeading="Division I–II"
            emptyMessage="No centres ranked."
          />
          <p className={styles.footnote}>
            Ties are broken with a 95% Wilson lower bound, so large cohorts with
            perfect records rank above small ones. The honour roll always counts
            every candidate at a centre, regardless of the lens above.
          </p>
        </section>
      </main>

      <footer className={styles.colophon}>
        <h2>Colophon</h2>
        <div className={styles.colophonColumns}>
          <div>
            <h3>Method</h3>
            <p>
              Grades A–E count as principal passes; A–C as strong passes.
              Regional rates require at least{" "}
              {data.metadata.thresholds.regionalRateMinimum} sittings; school
              rankings require {data.metadata.thresholds.centreSubjectMinimum}{" "}
              sittings per subject,{" "}
              {data.metadata.thresholds.centreCombinationMinimum} candidates per
              combination, and {data.metadata.thresholds.centreOverallMinimum}{" "}
              overall — each ranked on a 95% Wilson lower bound.
            </p>
          </div>
          <div>
            <h3>Sources</h3>
            <ul>
              {data.metadata.sources.map((source) => (
                <li key={source.id}>
                  <a href={source.url} target="_blank" rel="noreferrer">
                    {source.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3>Edition</h3>
            <p>
              {data.metadata.title}, methodology{" "}
              {data.metadata.methodologyVersion}. Compiled {generatedDate} by
              the Kozi Ipi data desk.{" "}
              <Link href="/analytics">Prefer the classic dashboard?</Link>
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
