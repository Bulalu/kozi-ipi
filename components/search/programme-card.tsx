"use client"

import Image from "next/image"
import type { ReactNode } from "react"
import { useEffect, useRef, useState } from "react"
import type { useQuery } from "convex/react"

import {
  familyMeta,
  fieldCategoryLabel,
} from "@/components/search/search-config"
import {
  ArrowRightIcon,
  ClockIcon,
  PinIcon,
  ShareIcon,
} from "@/components/search/search-icons"
import { api } from "@/convex/_generated/api"

type ProgrammeSearchResult = NonNullable<
  ReturnType<typeof useQuery<typeof api.programmes.smartSearchPaginated>>
>["page"][number]

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
    const absoluteShareUrl = new URL(
      shareUrl,
      window.location.origin
    ).toString()

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

  const metaParts = [
    programme.programmeCode,
    programme.awardLevel,
    programme.regulator,
    programme.ownershipType?.toLowerCase() === "unknown"
      ? undefined
      : programme.ownershipType,
  ].filter(Boolean)

  return (
    <article
      className={`group max-w-full scroll-mt-6 overflow-hidden rounded-[20px] border-[3px] border-kozi-ink bg-white transition-transform ${
        isSelected
          ? "shadow-[8px_8px_0_var(--kozi-cobalt)]"
          : "shadow-[5px_5px_0_var(--kozi-ink)] hover:-translate-y-0.5"
      }`}
      ref={cardRef}
    >
      <div className="flex min-w-0 flex-col gap-4 p-5 sm:p-6">
        <div className="flex min-w-0 items-start gap-4">
          <InstitutionLogo
            fallback={meta.mark}
            institutionName={programme.institutionName}
            logoUrl={programme.institutionLogoUrl}
          />
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <p className="font-tag text-[11px] font-semibold tracking-[0.1em] break-words text-kozi-graphite uppercase sm:text-xs">
              {metaParts.join(" · ")}
            </p>
            <h3 className="line-clamp-3 font-display text-xl leading-[1.15] tracking-[-0.02em] break-words text-kozi-ink sm:line-clamp-2 sm:text-[24px]">
              {programme.programmeName}
            </h3>
            <p className="line-clamp-2 font-poster text-[15px] font-semibold break-words text-kozi-ink/80">
              {programme.institutionName}
            </p>
          </div>
        </div>

        <div className="flex min-w-0 flex-wrap gap-2">
          {programme.region ? (
            <Tag icon={<PinIcon className="size-3.5 shrink-0" />}>
              {programme.region}
            </Tag>
          ) : null}
          {programme.duration ? (
            <Tag icon={<ClockIcon className="size-3.5 shrink-0" />}>
              Miaka {programme.duration}
            </Tag>
          ) : null}
          {programme.studyMode &&
          programme.studyMode.toLowerCase() !== "unknown" ? (
            <Tag>{programme.studyMode}</Tag>
          ) : null}
          {programme.feesIfAvailable ? (
            <Tag>{programme.feesIfAvailable}</Tag>
          ) : null}
        </div>
      </div>

      {programme.minimumEntryRequirements ? (
        <div className="border-t-[3px] border-kozi-ink bg-[#eef2ff] px-5 py-4 sm:px-6">
          <p className="font-display text-[13px] tracking-[0.04em] text-kozi-ink">
            SIFA ZA KUINGIA
          </p>
          <p
            className={`mt-1.5 font-poster text-sm leading-6 break-words text-kozi-ink/80 ${
              detailsVisible ? "" : "line-clamp-2"
            }`}
          >
            {programme.minimumEntryRequirements}
          </p>
        </div>
      ) : null}

      <div
        className={`flex flex-col items-start gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 ${
          programme.minimumEntryRequirements
            ? "bg-[#eef2ff]"
            : "border-t-[3px] border-kozi-ink"
        }`}
      >
        <p className="font-poster text-xs break-words text-kozi-graphite">
          Imehakikiwa {programme.lastVerifiedDate}
          {programme.needsReview ? " · Inahitaji uhakiki" : ""}
        </p>
        <div className="flex w-full gap-2 sm:w-auto">
          <button
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border-[2.5px] border-kozi-ink bg-white px-4 py-2.5 font-poster text-sm font-bold text-kozi-ink transition hover:bg-kozi-yellow sm:flex-none"
            onClick={shareProgramme}
            type="button"
          >
            <ShareIcon className="size-4" />
            {shareStatus === "copied" ? "Link imenakiliwa" : "Shiriki"}
          </button>
          <button
            aria-expanded={detailsVisible}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-kozi-ink px-5 py-2.5 font-display text-sm text-kozi-yellow transition hover:bg-kozi-cobalt hover:text-white sm:flex-none"
            onClick={() => setShowDetails((visible) => !visible)}
            type="button"
          >
            {detailsVisible ? "FICHA" : "MAELEZO"}
            <ArrowRightIcon
              className={`size-4 transition ${detailsVisible ? "rotate-90" : ""}`}
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
  const institutionWebsiteHref = normalizeExternalHref(
    programme.institutionWebsite
  )
  const detailRows = [
    { label: "Institution", value: programme.institutionName },
    { label: "Award level", value: programme.awardLevel },
    {
      label: "Field",
      value: fieldCategoryLabel(programme.fieldCategory).english,
    },
    {
      label: "Duration",
      value: programme.duration ? `${programme.duration} years` : undefined,
    },
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
    <div className="border-t-[3px] border-kozi-ink px-5 py-5 sm:px-6">
      <dl className="grid gap-3 sm:grid-cols-2">
        {detailRows.map((row) => (
          <div
            className="min-w-0 rounded-xl border-2 border-kozi-ink/15 p-3"
            key={row.label}
          >
            <dt className="font-tag text-[11px] font-semibold tracking-[0.1em] text-kozi-graphite uppercase">
              {row.label}
            </dt>
            <dd className="mt-1 font-poster text-sm leading-5 font-medium break-words text-kozi-ink">
              {row.value}
            </dd>
          </div>
        ))}
      </dl>

      {officialSourceHref || institutionWebsiteHref ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {officialSourceHref ? (
            <DetailLink href={officialSourceHref}>Chanzo rasmi ↗</DetailLink>
          ) : null}
          {institutionWebsiteHref ? (
            <DetailLink href={institutionWebsiteHref}>
              Tovuti ya chuo ↗
            </DetailLink>
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
      className="rounded-full border-[2.5px] border-kozi-ink px-4 py-2 font-poster text-sm font-bold text-kozi-ink transition hover:bg-kozi-yellow"
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
      <div className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-[14px] border-[3px] border-kozi-ink bg-white p-1.5 sm:size-16">
        <Image
          alt={`${institutionName} logo`}
          className="max-h-full max-w-full object-contain"
          height={64}
          loading="lazy"
          onError={() => setFailed(true)}
          src={logoUrl}
          unoptimized
          width={64}
        />
      </div>
    )
  }

  return (
    <div className="grid size-14 shrink-0 place-items-center rounded-[14px] border-[3px] border-kozi-ink bg-kozi-yellow font-display text-lg text-kozi-ink sm:size-16">
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
    neutral: "bg-[#f3f4f6] text-kozi-ink",
    green: "bg-emerald-50 text-emerald-700",
    ink: "bg-kozi-ink text-white",
  }

  return (
    <span
      className={`inline-flex max-w-full min-w-0 items-center gap-1.5 truncate rounded-full px-3 py-1.5 font-poster text-[13px] font-semibold ${tones[tone]}`}
    >
      {icon}
      <span className="min-w-0 truncate">{children}</span>
    </span>
  )
}
