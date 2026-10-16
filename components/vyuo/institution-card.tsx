"use client"

import type { useQuery } from "convex/react"
import Image from "next/image"
import Link from "next/link"
import { useState } from "react"

import { ArrowRightIcon, PinIcon } from "@/components/search/search-icons"
import { campusPhotos } from "@/components/vyuo/institutions"
import { api } from "@/convex/_generated/api"

type BrowseInstitution = NonNullable<
  ReturnType<typeof useQuery<typeof api.institutions.browse>>
>["results"][number]
type InstitutionTone = BrowseInstitution["monogramTone"]

// The backend assigns a rotating tone; map it onto the poster palette.
const TILE_TONES: Record<InstitutionTone, string> = {
  amber: "bg-kozi-yellow text-kozi-ink",
  blue: "bg-kozi-cobalt text-kozi-yellow",
  green: "bg-white text-kozi-ink",
  indigo: "bg-kozi-ink text-kozi-yellow",
  ink: "bg-kozi-yellow text-kozi-ink",
  red: "bg-kozi-cobalt text-white",
}

const OWNERSHIP_LABELS: Record<string, string> = {
  Public: "Serikali",
  Private: "Binafsi",
}

export function InstitutionCard({
  institution,
}: {
  institution: BrowseInstitution
}) {
  const photo = campusPhotos[institution.normalizedName]
  const ownership = OWNERSHIP_LABELS[institution.ownership]
  const href = `/search?q=${encodeURIComponent(institution.name)}&institution=${encodeURIComponent(
    institution.normalizedName
  )}&institutionLabel=${encodeURIComponent(institution.name)}`

  return (
    <article className="group flex h-full max-w-full flex-col overflow-hidden rounded-[20px] border-[3px] border-kozi-ink bg-white shadow-[6px_6px_0_var(--kozi-ink)] transition-transform hover:-translate-y-1">
      <div className="relative h-40 shrink-0 border-b-[3px] border-kozi-ink sm:h-44">
        {photo ? (
          <Image
            src={photo}
            alt={`${institution.name} campus`}
            fill
            sizes="(min-width: 1280px) 400px, (min-width: 768px) 50vw, 100vw"
            className="object-cover"
          />
        ) : (
          <div
            className={`flex h-full items-end justify-between gap-3 overflow-hidden px-5 py-4 ${TILE_TONES[institution.monogramTone]}`}
          >
            <span
              className={`font-display leading-[0.85] tracking-[-0.06em] whitespace-nowrap ${codeSize(institution.short)}`}
            >
              {institution.short}
            </span>
          </div>
        )}
        <Crest institution={institution} />
      </div>

      <div className="flex flex-1 flex-col gap-2.5 px-5 pt-5 pb-4 sm:px-6">
        <div className="flex flex-wrap gap-1.5">
          <Badge tone="yellow">{institution.short}</Badge>
          <Badge>{institution.type}</Badge>
          {ownership ? <Badge>{ownership}</Badge> : null}
        </div>
        <h3 className="line-clamp-2 font-display text-[21px] leading-[1.15] tracking-[-0.02em] text-kozi-ink">
          {institution.name}
        </h3>
        <p className="inline-flex items-center gap-1.5 font-poster text-sm font-medium text-kozi-graphite">
          <PinIcon className="size-3.5 shrink-0" />
          {institution.region}
        </p>
        {institution.fields.length > 0 ? (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {institution.fields.slice(0, 3).map((item, index) => (
              <span
                key={`${institution.id}-${item}-${index}`}
                className="rounded-full bg-[#f3f4f6] px-2.5 py-1 font-poster text-xs font-semibold text-kozi-ink"
              >
                {item}
              </span>
            ))}
          </div>
        ) : null}
      </div>

      <Link
        href={href}
        className="mt-auto flex items-center justify-between gap-3 border-t-2 border-[#e2e2e6] px-5 py-4 sm:px-6"
      >
        <span className="font-display text-base whitespace-nowrap text-kozi-cobalt">
          {institution.programmes > 0
            ? `${institution.programmes} KOZI`
            : "KOZI ZINAHAKIKIWA"}
        </span>
        <span className="flex items-center gap-2 font-poster text-sm font-bold whitespace-nowrap text-kozi-ink">
          {/* Label drops out where two columns get narrow; the arrow stays. */}
          <span className="md:max-xl:sr-only">Tazama kozi</span>
          <span className="grid size-10 place-items-center rounded-full bg-kozi-ink text-kozi-yellow transition-transform group-hover:translate-x-0.5">
            <ArrowRightIcon className="size-4" />
          </span>
        </span>
      </Link>
    </article>
  )
}

// Longer codes (AMUCTA, DESEIT) step down so the tile never truncates them.
function codeSize(code: string) {
  if (code.length <= 3) return "text-[64px] sm:text-[76px]"
  if (code.length <= 4) return "text-[56px] sm:text-[64px]"
  if (code.length <= 5) return "text-[46px] sm:text-[52px]"
  return "text-[36px] sm:text-[42px]"
}

function Badge({
  children,
  tone = "outline",
}: {
  children: React.ReactNode
  tone?: "outline" | "yellow"
}) {
  return (
    <span
      className={`rounded-md border-2 border-kozi-ink px-2 py-0.5 font-tag text-[11px] font-semibold tracking-[0.04em] uppercase ${
        tone === "yellow" ? "bg-kozi-yellow text-kozi-ink" : "text-kozi-ink"
      }`}
    >
      {children}
    </span>
  )
}

// Verified logo, pinned to the tile corner; hidden if it fails to load.
function Crest({ institution }: { institution: BrowseInstitution }) {
  const [failed, setFailed] = useState(false)

  if (!institution.logoUrl || failed) {
    return null
  }

  return (
    <div className="absolute top-3 right-3 grid size-14 place-items-center overflow-hidden rounded-xl border-[3px] border-kozi-ink bg-white p-1.5">
      <Image
        src={institution.logoUrl}
        alt={`${institution.name} logo`}
        width={56}
        height={56}
        className="max-h-full max-w-full object-contain"
        onError={() => setFailed(true)}
        unoptimized
      />
    </div>
  )
}
