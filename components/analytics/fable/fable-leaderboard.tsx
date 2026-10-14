"use client"

import styles from "./fable.module.css"

export type LeaderboardRow = {
  code: string
  rank: number
  name: string
  region: string | null
  council: string | null
  cohort: number
  cohortLabel: string
  rate: number
  rateLabel: string
  extras?: Array<{ label: string; value: string }>
}

type LeaderboardProps = {
  rows: LeaderboardRow[]
  rateHeading: string
  emptyMessage: string
}

const LOWERCASE_WORDS = new Set(["of", "and", "the", "for", "in"])

export function schoolCase(name: string): string {
  return name
    .toLowerCase()
    .split(/\s+/)
    .map((word, index) => {
      if (index > 0 && LOWERCASE_WORDS.has(word)) return word
      return word.charAt(0).toUpperCase() + word.slice(1)
    })
    .join(" ")
}

export function FableLeaderboard({
  rows,
  rateHeading,
  emptyMessage,
}: LeaderboardProps) {
  if (rows.length === 0) {
    return <p className={styles.leaderboardEmpty}>{emptyMessage}</p>
  }
  return (
    <ol className={styles.leaderboard}>
      {rows.map((row) => (
        <li key={row.code} className={styles.leaderRow}>
          <span className={styles.leaderRank}>
            {String(row.rank).padStart(2, "0")}
          </span>
          <span className={styles.leaderIdentity}>
            <span className={styles.leaderName}>{schoolCase(row.name)}</span>
            <span className={styles.leaderPlace}>
              {[row.region, row.council].filter(Boolean).join(" · ") ||
                "Region unmapped"}
              {" · "}
              {row.cohortLabel}
            </span>
          </span>
          <span className={styles.leaderMetrics}>
            {row.extras?.map((extra) => (
              <span key={extra.label} className={styles.leaderExtra}>
                <em>{extra.label}</em>
                {extra.value}
              </span>
            ))}
            <span className={styles.leaderRate}>
              <em>{rateHeading}</em>
              {row.rateLabel}
            </span>
          </span>
          <span
            className={styles.leaderBar}
            style={{ width: `${Math.max(2, Math.min(100, row.rate))}%` }}
            aria-hidden="true"
          />
        </li>
      ))}
    </ol>
  )
}
