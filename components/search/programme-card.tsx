"use client"

import Image from "next/image"
import type { ReactNode } from "react"
import { useEffect, useRef, useState } from "react"
import type { useQuery } from "convex/react"

import { familyMeta } from "@/components/search/search-config"
import {
  ArrowRightIcon,
  ClockIcon,
  PinIcon,
  ShareIcon,
} from "@/components/search/search-icons"
import { api } from "@/convex/_generated/api"

type ProgrammeSearchResult = NonNullable<
  ReturnType<typeof useQuery<typeof api.programmes.smartSearch>>
>["results"][number]

export function ProgrammeCard({
  isSelected = false,
  programme,
  shareUrl,
}: {
  isSelected?: boolean
  programme: ProgrammeSearchResult
  shareUrl: string
}) {
  const meta = familyMeta(programme.courseFamily)
  const cardRef = useRef<HTMLElement>(null)
  const [showDetails, setShowDetails] = useState(isSelected)
  const [shareStatus, setShareStatus] = useState<"idle" | "copied">("idle")
  const detailsVisible = showDetails

  useEffect(() => {
    if (!isSelected) {
      return
    }

    window.requestAnimationFrame(() => setShowDetails(true))
    cardRef.current?.scrollIntoView({ block: "center", behavior: "smooth" })
  }, [isSelected])

  async function shareProgramme() {
    const shareTitle = `${programme.programmeName} at ${programme.institutionName}`
    const shareText = `Check this course on Kozi Ipi: ${shareTitle}`
    const absoluteShareUrl = new URL(shareUrl, window.location.origin).toString()

    if (navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: absoluteShareUrl,
        })
        return
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return
        }
      }
    }

    await copyToClipboard(absoluteShareUrl)
    setShareStatus("copied")
    window.setTimeout(() => setShareStatus("idle"), 1800)
  }

  return (
    <article
      className={`group max-w-full scroll-mt-6 overflow-hidden rounded-2xl border bg-white p-4 transition hover:border-brand-blue/35 hover:shadow-[0_22px_50px_-32px_rgba(29,78,216,0.45)] sm:p-5 ${
        isSelected ? "border-brand-blue shadow-[0_22px_50px_-32px_rgba(29,78,216,0.45)]" : "border-brand-ink/10"
      }`}
      ref={cardRef}
    >
      <div className="flex min-w-0 items-start justify-between gap-3 sm:gap-4">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <InstitutionLogo
            fallback={meta.mark}
            institutionName={programme.institutionName}
            logoUrl={programme.institutionLogoUrl}
          />
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 flex-wrap items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.11em] text-brand-ink/45 sm:gap-2 sm:text-[11.5px] sm:tracking-[0.14em]">
              <span className="min-w-0 max-w-full break-words">{programme.awardLevel}</span>
              <span className="size-1 rounded-full bg-brand-ink/30" />
              <span className="min-w-0 max-w-full break-words">{programme.regulator}</span>
              {programme.ownershipType ? (
                <>
                  <span className="size-1 rounded-full bg-brand-ink/30" />
                  <span className="min-w-0 max-w-full break-words">
                    {programme.ownershipType}
                  </span>
                </>
              ) : null}
            </div>
            <h3 className="mt-1.5 line-clamp-2 break-words text-[17px] font-bold tracking-tight">
              {programme.programmeName}
            </h3>
            <p className="mt-0.5 line-clamp-2 break-words text-[13.5px] font-medium text-brand-ink/65">
              {programme.institutionName}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-4 flex min-w-0 flex-wrap gap-1.5 text-[12px] text-brand-ink/70">
        {programme.region ? (
          <Tag icon={<PinIcon className="size-3.5 shrink-0" />}>{programme.region}</Tag>
        ) : null}
        {programme.duration ? (
          <Tag icon={<ClockIcon className="size-3.5 shrink-0" />}>
            {programme.duration} years
          </Tag>
        ) : null}
        {programme.feesIfAvailable ? <Tag>{programme.feesIfAvailable}</Tag> : null}
      </div>

      {programme.minimumEntryRequirements ? (
        <div className="mt-4 rounded-xl bg-[#fafafa] p-3.5">
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.18em] text-brand-ink/40">
            Entry requirements
          </p>
          <p className="mt-1.5 line-clamp-2 break-words text-[13px] leading-6 text-brand-ink/70">
            {programme.minimumEntryRequirements}
          </p>
        </div>
      ) : null}

      <div className="mt-4 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="break-words text-[11.5px] text-brand-ink/45">
          Verified {programme.lastVerifiedDate}
          {programme.needsReview ? " · Needs review" : ""}
        </p>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <button
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-full border border-brand-ink/15 px-4 py-2 text-[13px] font-semibold text-brand-ink transition hover:border-brand-blue hover:text-brand-blue sm:w-auto"
            onClick={shareProgramme}
            type="button"
          >
            <ShareIcon className="size-3.5" />
            {shareStatus === "copied" ? "Link copied" : "Share"}
          </button>
          <button
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-brand-ink px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-brand-blue sm:w-auto"
            onClick={() => setShowDetails((visible) => !visible)}
            type="button"
          >
            {detailsVisible ? "Hide details" : "View details"}
            <ArrowRightIcon
              className={`size-3.5 transition ${detailsVisible ? "rotate-90" : ""}`}
            />
          </button>
        </div>
      </div>

      {detailsVisible ? <ProgrammeDetails programme={programme} /> : null}
    </article>
  )
}

function ProgrammeDetails({ programme }: { programme: ProgrammeSearchResult }) {
  const officialSourceHref = normalizeExternalHref(programme.officialSourceUrl)
  const institutionWebsiteHref = normalizeExternalHref(programme.institutionWebsite)
  const detailRows = [
    { label: "Institution", value: programme.institutionName },
    { label: "Award level", value: programme.awardLevel },
    { label: "Field", value: programme.fieldCategory },
    { label: "Duration", value: programme.duration ? `${programme.duration} years` : undefined },
    { label: "Region", value: programme.region },
    { label: "Campus", value: programme.campusLocation },
    { label: "Study mode", value: programme.studyMode },
    { label: "Fees", value: programme.feesIfAvailable },
    { label: "Entry routes", value: programme.entryRouteTypes },
    { label: "Required subjects", value: programme.requiredSubjects },
    { label: "Regulator", value: programme.regulator },
    { label: "Source", value: programme.sourceType },
  ].filter((row) => row.value)

  return (
    <div className="mt-4 border-t border-brand-ink/8 pt-4">
      <dl className="grid gap-3 sm:grid-cols-2">
        {detailRows.map((row) => (
          <div className="min-w-0 rounded-xl bg-brand-ink/[0.035] p-3" key={row.label}>
            <dt className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-brand-ink/40">
              {row.label}
            </dt>
            <dd className="mt-1 break-words text-[13px] leading-5 text-brand-ink/75">
              {row.value}
            </dd>
          </div>
        ))}
      </dl>

      {officialSourceHref || institutionWebsiteHref ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {officialSourceHref ? (
            <DetailLink href={officialSourceHref}>Official source</DetailLink>
          ) : null}
          {institutionWebsiteHref ? (
            <DetailLink href={institutionWebsiteHref}>Institution website</DetailLink>
          ) : null}
        </div>
      ) : null}
    </div>
  )
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

async function copyToClipboard(value: string) {
  if (navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(value)
      return
    } catch {
      // Fall back for browsers that expose clipboard but block writes.
    }
  }

  const textarea = document.createElement("textarea")
  textarea.value = value
  textarea.setAttribute("readonly", "")
  textarea.style.position = "fixed"
  textarea.style.left = "-9999px"
  document.body.appendChild(textarea)
  textarea.select()
  document.execCommand("copy")
  document.body.removeChild(textarea)
}

function DetailLink({ children, href }: { children: ReactNode; href: string }) {
  return (
    <a
      className="rounded-full border border-brand-ink/15 px-3 py-1.5 text-[12px] font-semibold text-brand-ink transition hover:border-brand-blue hover:text-brand-blue"
      href={href}
      rel="noreferrer"
      target="_blank"
    >
      {children}
    </a>
  )
}

function InstitutionLogo({
  fallback,
  institutionName,
  logoUrl,
}: {
  fallback: string
  institutionName: string
  logoUrl?: string
}) {
  const [failed, setFailed] = useState(false)

  if (logoUrl && !failed) {
    return (
      <div className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-xl border border-brand-ink/10 bg-white p-1.5 sm:size-11">
        <Image
          alt={`${institutionName} logo`}
          className="max-h-full max-w-full object-contain"
          height={44}
          loading="lazy"
          onError={() => setFailed(true)}
          src={logoUrl}
          unoptimized
          width={44}
        />
      </div>
    )
  }

  return (
    <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-blue/10 font-mono text-[14px] font-semibold text-brand-blue sm:size-11">
      {fallback}
    </div>
  )
}

function Tag({
  children,
  icon,
  tone = "neutral",
}: {
  children: ReactNode
  icon?: ReactNode
  tone?: "neutral" | "green" | "ink"
}) {
  const tones = {
    neutral: "bg-brand-ink/[0.05] text-brand-ink/70",
    green: "bg-emerald-50 text-emerald-700",
    ink: "bg-brand-ink text-white",
  }

  return (
    <span
      className={`inline-flex max-w-full min-w-0 items-center gap-1 truncate rounded-full px-2.5 py-1 font-medium ${tones[tone]}`}
    >
      {icon}
      <span className="min-w-0 truncate">{children}</span>
    </span>
  )
}
