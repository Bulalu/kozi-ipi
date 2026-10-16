"use client"

import { useQuery } from "convex/react"

import {
  awardLevelLabel,
  statusCopy,
} from "@/components/form-six/form-six-copy"
import { fieldCategoryLabel } from "@/components/search/search-config"
import { ClockIcon, PinIcon } from "@/components/search/search-icons"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import type {
  ClauseEvidence,
  EligibilityStatus,
  StudentEligibilityProfile,
} from "@/lib/eligibility"

export type OverviewRow = {
  _id: Id<"programmes">
  programmeName: string
  institutionName: string
  awardLevel: string
  regulator: string
  region?: string
  duration?: string
  fieldCategory: string
  status: EligibilityStatus
  basis: "rules" | "partial_rules" | "unparsed" | "route_flag"
  needsCsee: boolean
  missing: string[]
  fit: number
}

export function EligibilityResultCard({
  profile,
  row,
}: {
  profile: StudentEligibilityProfile
  row: OverviewRow
}) {
  const detail = useQuery(api.programmes.eligibilityDetail, {
    profile,
    programmeId: row._id,
  })
  const copy = statusCopy[row.status]
  const field = fieldCategoryLabel(row.fieldCategory)
  const sourceHref = normalizeExternalHref(detail?.officialSourceUrl)

  return (
    <article className="max-w-full overflow-hidden rounded-[20px] border-[3px] border-kozi-ink bg-white shadow-[5px_5px_0_var(--kozi-ink)]">
      <div className="flex min-w-0 flex-col gap-3 p-5 sm:p-6">
        <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
          <p className="font-tag text-[11px] font-semibold tracking-[0.1em] break-words text-kozi-graphite uppercase sm:text-xs">
            {awardLevelLabel(row.awardLevel)} · {row.regulator}
          </p>
          <StatusPill status={row.status} />
        </div>
        <h3 className="font-display text-xl leading-[1.15] tracking-[-0.02em] break-words text-kozi-ink sm:text-[22px]">
          {row.programmeName}
        </h3>
        <p className="font-poster text-[15px] font-semibold break-words text-kozi-ink/80">
          {row.institutionName}
        </p>
        <div className="flex min-w-0 flex-wrap gap-2">
          {row.region ? (
            <Tag>
              <PinIcon className="size-3.5 shrink-0" />
              {row.region}
            </Tag>
          ) : null}
          {row.duration ? (
            <Tag>
              <ClockIcon className="size-3.5 shrink-0" />
              Miaka {row.duration.replaceAll(";", " /")}
            </Tag>
          ) : null}
          <Tag>{field.swahili}</Tag>
        </div>
      </div>

      <div className="border-t-[3px] border-kozi-ink bg-[#eef2ff] px-5 py-4 sm:px-6">
        <div className="flex items-baseline justify-between gap-3">
          <p className="font-display text-[13px] tracking-[0.04em] text-kozi-ink">
            KWA NINI?
          </p>
          <p className="font-tag text-[11px] text-kozi-graphite">
            {copy.english}
          </p>
        </div>
        {detail === undefined ? (
          <div
            aria-hidden
            className="mt-3 h-14 animate-pulse rounded-lg bg-kozi-ink/5"
          />
        ) : detail === null ? null : (
          <EvidenceBody
            basis={detail.basis}
            confidence={detail.confidence}
            evidence={detail.evidence}
            needsCsee={detail.needsCsee}
            status={detail.status}
          />
        )}
      </div>

      <details className="group border-t-[3px] border-kozi-ink">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-3.5 font-poster text-sm font-bold text-kozi-cobalt sm:px-6 [&::-webkit-details-marker]:hidden">
          Tazama sharti rasmi
          <span
            aria-hidden
            className="font-display text-base transition group-open:rotate-45"
          >
            +
          </span>
        </summary>
        <div className="flex flex-col gap-3 px-5 pb-5 sm:px-6">
          <p className="font-tag text-[11px] tracking-[0.06em] text-kozi-graphite uppercase">
            Official requirement
          </p>
          <p className="font-poster text-sm leading-6 break-words whitespace-pre-line text-kozi-ink/85">
            {detail?.requirementText
              ? formatRequirementText(detail.requirementText)
              : "Sharti rasmi halipo kwenye data yetu."}
          </p>
          <div className="flex flex-wrap items-center justify-between gap-2 font-poster text-xs text-kozi-graphite">
            <span>
              {detail?.lastVerifiedDate
                ? `Taarifa za ${detail.lastVerifiedDate}`
                : null}
            </span>
            {sourceHref ? (
              <a
                className="font-bold text-kozi-cobalt underline underline-offset-4"
                href={sourceHref}
                rel="noreferrer"
                target="_blank"
              >
                Chanzo rasmi ↗
              </a>
            ) : null}
          </div>
        </div>
      </details>
    </article>
  )
}

function EvidenceBody({
  basis,
  confidence,
  evidence,
  needsCsee,
  status,
}: {
  basis: OverviewRow["basis"]
  confidence: "high" | "medium" | "low"
  evidence: ClauseEvidence[]
  needsCsee: boolean
  status: EligibilityStatus
}) {
  if (basis === "route_flag") {
    return (
      <p className="mt-2 font-poster text-sm leading-6 text-kozi-ink/85">
        {status === "likely_eligible_but_verify"
          ? "Kozi hii imeorodheshwa kupokea wahitimu wa Form Six, lakini masharti yake ya masomo hayajachambuliwa bado."
          : status === "interest_match_only"
            ? "Kozi hii haijaorodheshwa kupokea wahitimu wa Form Six moja kwa moja."
            : "Data yetu haionyeshi wazi kama kozi hii inapokea wahitimu wa Form Six."}{" "}
        Soma sharti rasmi hapa chini.
      </p>
    )
  }
  if (basis === "unparsed" || evidence.length === 0) {
    return (
      <p className="mt-2 font-poster text-sm leading-6 text-kozi-ink/85">
        Mfumo haukuweza kusoma sharti hili kwa uhakika, kwa hiyo hatujalikagua
        dhidi ya matokeo yako. Soma sharti rasmi hapa chini.
      </p>
    )
  }

  return (
    <>
      <ul className="mt-2.5 flex flex-col gap-1.5">
        {evidence.map((line) => (
          <li
            key={line.text}
            className="flex items-start gap-2.5 font-poster text-sm leading-5 text-kozi-ink"
          >
            <EvidenceMark state={line.state} />
            <span className="min-w-0 break-words">{line.text}</span>
          </li>
        ))}
      </ul>
      {status === "likely_eligible_but_verify" ? (
        <p className="mt-3 font-poster text-[13px] leading-5 text-kozi-ink/80">
          <strong>Kwa nini thibitisha?</strong>{" "}
          {basis === "partial_rules"
            ? "Sehemu ya sharti hili haikusomeka kikamilifu, kwa hiyo huenda kuna masharti mengine. Soma sharti rasmi."
            : confidence === "high"
              ? "Sharti limekaguliwa, lakini chuo kinaweza kuwa na masharti ya ziada."
              : "Chanzo cha data hii kina uhakika wa kati. Hakikisha na mwongozo wa TCU/NACTVET au chuo."}
        </p>
      ) : null}
      {needsCsee ? <FormFourNotice /> : null}
    </>
  )
}

function FormFourNotice() {
  return (
    <div className="mt-3.5 rounded-xl border-2 border-kozi-ink bg-kozi-yellow/70 px-4 py-3 font-poster text-[13px] leading-5 text-kozi-ink">
      <p className="font-bold">Inahitaji matokeo ya Form Four (CSEE)</p>
      <p className="mt-1">
        Sharti hili lina masomo ya O-Level. Kozi Ipi inakagua matokeo ya Form
        Six pekee, kwa hiyo angalia cheti chako cha Form Four kwa mistari yenye
        alama ya “?” hapo juu. Kama unayakidhi, sharti hili limetimia.
      </p>
      <p className="mt-1 text-kozi-graphite">
        This course also has O-Level (Form Four) conditions. Check them against
        your CSEE certificate.
      </p>
    </div>
  )
}

function EvidenceMark({ state }: { state: ClauseEvidence["state"] }) {
  const styles = {
    pass: {
      mark: "✓",
      label: "Imekidhi",
      className: "bg-[#0f7a3d] text-white",
    },
    fail: {
      mark: "✗",
      label: "Haijakidhi",
      className: "bg-[#c2261b] text-white",
    },
    unknown: {
      mark: "?",
      label: "Haijakaguliwa",
      className: "bg-kozi-yellow text-kozi-ink",
    },
  }[state]

  return (
    <span
      aria-label={styles.label}
      className={`mt-px grid size-[18px] shrink-0 place-items-center rounded-full font-display text-[11px] ${styles.className}`}
      role="img"
    >
      {styles.mark}
    </span>
  )
}

export function StatusPill({ status }: { status: EligibilityStatus }) {
  const copy = statusCopy[status]
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full border-2 border-kozi-ink px-3 py-1 font-poster text-xs font-bold ${copy.pill}`}
    >
      {copy.label}
    </span>
  )
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex max-w-full items-center gap-1.5 rounded-full border-2 border-kozi-ink/20 bg-white px-3 py-1 font-poster text-[13px] font-semibold break-words text-kozi-ink/80">
      {children}
    </span>
  )
}

// Rule text joined from several source rows uses "||"; show one per line.
function formatRequirementText(text: string) {
  return text
    .split("||")
    .map((part) => part.trim())
    .filter(Boolean)
    .join("\n\n")
}

function normalizeExternalHref(href?: string) {
  const value = href?.trim().split(/[;\s]+/)[0]
  if (!value) return null
  if (/^https?:\/\//i.test(value)) return value
  if (/^\/\//.test(value)) return `https:${value}`
  if (/^(www\.)?[a-z0-9-]+(\.[a-z0-9-]+)+(\/.*)?$/i.test(value)) {
    return `https://${value}`
  }
  return null
}
