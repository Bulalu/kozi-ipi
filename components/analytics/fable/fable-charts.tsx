"use client"

import type { CandidateStats, SubjectStats } from "@/lib/analytics/types"

import {
  DIVISION_COLORS,
  DIVISION_LABELS,
  DIVISION_ORDER,
  formatInt,
  formatRate,
  GRADE_COLORS,
  GRADE_ORDER,
} from "./fable-data"
import styles from "./fable.module.css"

type DivisionStripProps = {
  stats: CandidateStats
  caption: string
}

export function DivisionStrip({ stats, caption }: DivisionStripProps) {
  const total = DIVISION_ORDER.reduce(
    (sum, division) => sum + stats.divisions[division],
    0
  )
  if (total === 0) return null
  return (
    <figure className={styles.divisionFigure}>
      <div
        className={styles.divisionStrip}
        role="img"
        aria-label={`${caption}: ${DIVISION_ORDER.map(
          (division) =>
            `${DIVISION_LABELS[division]} ${formatInt(stats.divisions[division])}`
        ).join(", ")}`}
      >
        {DIVISION_ORDER.map((division) => {
          const count = stats.divisions[division]
          const share = (count / total) * 100
          if (count === 0) return null
          return (
            <div
              key={division}
              className={styles.divisionSegment}
              style={{
                width: `${share}%`,
                backgroundColor: DIVISION_COLORS[division],
              }}
            >
              {share >= 9 && (
                <span className={styles.divisionSegmentLabel}>
                  <strong>{division}</strong> {share.toFixed(0)}%
                </span>
              )}
            </div>
          )
        })}
      </div>
      <figcaption className={styles.divisionLegend}>
        {DIVISION_ORDER.map((division) => {
          const count = stats.divisions[division]
          const share = total > 0 ? (count / total) * 100 : 0
          return (
            <span key={division} className={styles.divisionLegendItem}>
              <span
                className={styles.legendSwatch}
                style={{ backgroundColor: DIVISION_COLORS[division] }}
              />
              <span className={styles.divisionLegendName}>
                {DIVISION_LABELS[division]}
              </span>
              <span className={styles.divisionLegendValue}>
                {formatInt(count)} · {share.toFixed(1)}%
              </span>
            </span>
          )
        })}
      </figcaption>
    </figure>
  )
}

type GradeDistributionProps = {
  stats: SubjectStats
}

export function GradeDistribution({ stats }: GradeDistributionProps) {
  const gradedTotal = GRADE_ORDER.reduce(
    (sum, grade) => sum + stats.grades[grade],
    0
  )
  const maxCount = Math.max(
    1,
    ...GRADE_ORDER.map((grade) => stats.grades[grade])
  )
  return (
    <div className={styles.gradeRows}>
      {GRADE_ORDER.map((grade) => {
        const count = stats.grades[grade]
        const share = gradedTotal > 0 ? (count / gradedTotal) * 100 : 0
        return (
          <div key={grade} className={styles.gradeRow}>
            <span
              className={styles.gradeRowLetter}
              style={{ color: GRADE_COLORS[grade] }}
            >
              {grade}
            </span>
            <span className={styles.gradeRowTrack}>
              <span
                className={styles.gradeRowBar}
                style={{
                  width: `${(count / maxCount) * 100}%`,
                  backgroundColor: GRADE_COLORS[grade],
                }}
              />
            </span>
            <span className={styles.gradeRowValue}>
              {formatInt(count)}
              <em>{share.toFixed(1)}%</em>
            </span>
          </div>
        )
      })}
    </div>
  )
}

export type RankedRegionDatum = {
  key: string
  name: string
  value: number | null
  valueLabel: string
  detailLabel: string
}

type RegionRankListProps = {
  data: RankedRegionDatum[]
  hoveredRegion?: string | null
  onHoverRegion?: (key: string | null) => void
  emptyNote?: string
}

export function RegionRankList({
  data,
  hoveredRegion,
  onHoverRegion,
  emptyNote,
}: RegionRankListProps) {
  const ranked = data.filter((entry) => entry.value !== null)
  const unranked = data.filter((entry) => entry.value === null)
  const maxValue = Math.max(1, ...ranked.map((entry) => entry.value as number))
  return (
    <ol className={styles.rankList}>
      {ranked.map((entry, index) => (
        <li
          key={entry.key}
          className={`${styles.rankRow} ${hoveredRegion === entry.key ? styles.rankRowActive : ""}`}
          onPointerEnter={() => onHoverRegion?.(entry.key)}
          onPointerLeave={() => onHoverRegion?.(null)}
        >
          <span className={styles.rankIndex}>{index + 1}</span>
          <span className={styles.rankName}>
            {entry.name}
            <em>{entry.detailLabel}</em>
          </span>
          <span className={styles.rankTrack}>
            <span
              className={styles.rankBar}
              style={{
                width: `${((entry.value as number) / maxValue) * 100}%`,
              }}
            />
          </span>
          <span className={styles.rankValue}>{entry.valueLabel}</span>
        </li>
      ))}
      {unranked.length > 0 && (
        <li className={styles.rankFootnote}>
          {emptyNote ?? "Below the reporting minimum"}:{" "}
          {unranked.map((entry) => entry.name).join(", ")}
        </li>
      )}
    </ol>
  )
}

type SubjectHeadlineProps = {
  stats: SubjectStats
}

export function SubjectHeadlineStats({ stats }: SubjectHeadlineProps) {
  const cells = [
    { label: "Sittings graded", value: formatInt(stats.sittings) },
    { label: "A grades", value: formatInt(stats.aCount) },
    { label: "A–C share", value: formatRate(stats.abcRate) },
    {
      label: "Principal pass (A–E)",
      value: formatRate(stats.principalPassRate),
    },
  ]
  return (
    <dl className={styles.subjectStatRow}>
      {cells.map((cell) => (
        <div key={cell.label} className={styles.subjectStatCell}>
          <dd>{cell.value}</dd>
          <dt>{cell.label}</dt>
        </div>
      ))}
    </dl>
  )
}
