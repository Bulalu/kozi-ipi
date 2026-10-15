import Image from "next/image"
import Link from "next/link"

import {
  FEATURED_UNIVERSITIES,
  FIELDS,
  HOME_STATS,
  PATHWAYS,
  TICKER_COURSES,
  fieldHref,
  universityHref,
  type PathwayTone,
} from "@/components/home/home-content"
import { ArrowRightIcon, InfoIcon } from "@/components/home/home-icons"

const container = "mx-auto w-full max-w-[1440px] px-5 sm:px-10 lg:px-14"
const sectionTitle =
  "font-display text-[52px] leading-[0.9] tracking-[-0.05em] text-kozi-ink sm:text-[88px] lg:text-[120px]"

/* ───────────────────────────── Ticker ───────────────────────────── */

export function CourseTicker() {
  // Render the list twice so the -50% translate loops without a gap.
  const items = [...TICKER_COURSES, ...TICKER_COURSES]

  return (
    <div className="overflow-hidden bg-kozi-ink py-3 lg:py-[18px]">
      <ul className="kozi-ticker-track flex w-max gap-6 lg:gap-10">
        {items.map((course, index) => (
          <li
            key={`${course}-${index}`}
            aria-hidden={index >= TICKER_COURSES.length}
          >
            <Link
              href={`/search?q=${encodeURIComponent(course)}`}
              tabIndex={index >= TICKER_COURSES.length ? -1 : undefined}
              className={`font-display text-sm whitespace-nowrap uppercase hover:underline lg:text-xl ${
                index % 2 === 0 ? "text-kozi-yellow" : "text-white"
              }`}
            >
              ★ {course}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}

/* ──────────────────────────── Pathways ──────────────────────────── */

const PATHWAY_TONES: Record<
  PathwayTone,
  { card: string; text: string; badge: string; rule: string }
> = {
  yellow: {
    card: "bg-kozi-yellow",
    text: "text-kozi-ink",
    badge: "bg-kozi-ink text-kozi-yellow",
    rule: "border-kozi-ink",
  },
  cobalt: {
    card: "bg-kozi-cobalt lg:-rotate-[1.5deg]",
    text: "text-white",
    badge: "bg-kozi-yellow text-kozi-ink",
    rule: "border-white",
  },
  white: {
    card: "bg-white",
    text: "text-kozi-ink",
    badge: "bg-kozi-cobalt text-white",
    rule: "border-kozi-ink",
  },
}

export function PathwaysSection() {
  return (
    <section
      aria-labelledby="pathways-heading"
      className="bg-white py-14 lg:py-[120px]"
    >
      <div className={`${container} flex flex-col gap-10 lg:gap-14`}>
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <h2 id="pathways-heading" className={sectionTitle}>
            UNATOKA
            <br />
            WAPI?
          </h2>
          <p className="max-w-[420px] font-poster text-lg leading-[1.5] font-medium text-kozi-ink lg:pb-2 lg:text-xl">
            Chagua njia yako — tunakuonyesha kozi unazoweza kuomba kweli, si
            kila kitu.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-3 lg:gap-7">
          {PATHWAYS.map((pathway) => {
            const tone = PATHWAY_TONES[pathway.tone]
            return (
              <Link
                key={pathway.title}
                href={pathway.href}
                className={`group flex flex-col justify-between gap-10 rounded-[20px] border-[3px] border-kozi-ink p-6 shadow-[8px_8px_0_var(--kozi-ink)] transition-transform hover:-translate-y-1 lg:gap-[72px] lg:p-8 ${tone.card} ${tone.text}`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-tag text-sm font-semibold tracking-[0.08em]">
                    {pathway.exam}
                  </span>
                  <span
                    className={`rounded-full px-3 py-1.5 font-display text-sm uppercase ${tone.badge}`}
                  >
                    {pathway.badge}
                  </span>
                </div>
                <div className="flex flex-col gap-3">
                  <h3 className="max-w-[8ch] font-display text-[44px] leading-[0.93] tracking-[-0.04em] uppercase lg:text-[56px]">
                    {pathway.title}
                  </h3>
                  <p className="font-poster text-[17px] leading-[1.55] font-medium">
                    {pathway.description}
                  </p>
                </div>
                <div
                  className={`flex items-center justify-between border-t-2 pt-5 font-poster text-base font-bold ${tone.rule}`}
                >
                  {pathway.cta}
                  <ArrowRightIcon className="size-7 transition-transform group-hover:translate-x-1" />
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </section>
  )
}

/* ───────────────────────────── Fields ───────────────────────────── */

// Alternating tilt so the polaroids feel pinned up by hand.
const POLAROID_TILT = [
  "-rotate-3",
  "rotate-2",
  "-rotate-[1.5deg]",
  "rotate-3",
  "-rotate-[2.5deg]",
]

export function FieldsSection() {
  return (
    <section
      aria-labelledby="fields-heading"
      className="overflow-hidden border-y-[3px] border-kozi-ink bg-kozi-yellow py-14 lg:py-28"
    >
      <div className={`${container} flex flex-col gap-10 lg:gap-16`}>
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <h2 id="fields-heading" className={sectionTitle}>
            NDOTO
            <br />
            YAKO NI?
          </h2>
          <Link
            href="/search"
            className="flex w-fit items-center gap-2.5 rounded-full bg-kozi-ink px-6 py-4 font-display text-base text-kozi-yellow transition-transform hover:-translate-y-0.5 sm:mb-2"
          >
            FANI ZOTE
            <ArrowRightIcon className="size-[18px]" />
          </Link>
        </div>

        {/* Swipeable strip on mobile, five-up row on desktop. */}
        <ul className="-mx-5 flex snap-x gap-4 overflow-x-auto px-5 pt-2 pb-4 sm:-mx-10 sm:px-10 lg:mx-0 lg:grid lg:grid-cols-5 lg:gap-6 lg:overflow-visible lg:px-0">
          {FIELDS.map((field, index) => (
            <li
              key={field.family}
              className="w-[180px] shrink-0 snap-start lg:w-auto"
            >
              <Link
                href={fieldHref(field)}
                className={`flex flex-col gap-4 border-[3px] border-kozi-ink bg-white p-3 pb-5 shadow-[6px_6px_0_var(--kozi-ink)] transition-transform hover:-translate-y-1 hover:rotate-0 ${POLAROID_TILT[index]}`}
              >
                <div className="relative aspect-[3/4] w-full overflow-hidden">
                  <Image
                    src={field.image}
                    alt={field.alt}
                    fill
                    sizes="(min-width: 1024px) 250px, 180px"
                    className="object-cover"
                  />
                </div>
                <div className="flex items-baseline justify-between gap-2 px-1">
                  <span className="font-display text-lg tracking-[-0.02em] text-kozi-ink uppercase lg:text-[22px]">
                    {field.label}
                  </span>
                  <span className="font-tag text-[13px] font-semibold text-kozi-cobalt">
                    {field.count}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

/* ─────────────────────────── Index check ─────────────────────────── */

export function IndexCheckSection() {
  return (
    <section
      aria-labelledby="index-heading"
      className="bg-kozi-cobalt py-16 lg:py-32"
    >
      <div
        className={`${container} flex flex-col gap-12 lg:flex-row lg:items-center lg:justify-between lg:gap-16`}
      >
        <div className="flex flex-col gap-7 lg:w-[760px]">
          <span className="w-fit -rotate-3 border-[3px] border-kozi-ink bg-kozi-yellow px-4 py-2 font-display text-[15px] text-kozi-ink">
            MATOKEO YAMETOKA?
          </span>
          {/* "UNACHOSTAHILI." can't wrap, so its width sets the mobile size. */}
          <h2
            id="index-heading"
            className="font-display text-[34px] leading-[0.97] tracking-[-0.05em] text-white min-[400px]:text-[40px] sm:text-[64px] lg:text-[76px]"
          >
            WEKA NAMBA.
            <br />
            ONA UNACHOSTAHILI.
          </h2>
          <p className="max-w-[560px] font-poster text-lg leading-[1.5] font-medium text-white/85 lg:text-xl">
            Tunasoma matokeo yako ya NECTA na kuyalinganisha na sifa za kila
            kozi — kwa sekunde chache.
          </p>
        </div>

        <form
          action="/form-six"
          method="get"
          className="flex w-full max-w-[520px] shrink-0 flex-col gap-5 rounded-[20px] border-[3px] border-kozi-ink bg-white p-6 shadow-[10px_10px_0_var(--kozi-ink)] lg:rotate-[1.5deg] lg:p-9"
        >
          <label
            htmlFor="home-index"
            className="font-poster text-[15px] font-bold text-kozi-ink"
          >
            Namba ya mtihani (ACSEE)
          </label>
          <input
            id="home-index"
            name="index"
            inputMode="text"
            autoComplete="off"
            placeholder="S0123/0045/2025"
            className="h-16 rounded-[14px] border-[3px] border-kozi-ink bg-[#fff8d6] px-5 font-tag text-[22px] font-semibold tracking-[0.04em] text-kozi-ink placeholder:text-kozi-ink/35 focus:outline-none focus-visible:ring-4 focus-visible:ring-kozi-yellow"
          />
          <button
            type="submit"
            className="flex h-16 items-center justify-center gap-2.5 rounded-full border-[3px] border-kozi-ink bg-kozi-cobalt font-display text-[15px] text-white shadow-[4px_4px_0_var(--kozi-ink)] transition-transform hover:-translate-y-0.5 sm:text-[17px]"
          >
            NIONYESHE KOZI ZANGU
            <ArrowRightIcon className="size-[18px]" />
          </button>
          <p className="flex items-start gap-2 font-poster text-[13px] leading-[1.45] text-kozi-graphite">
            <InfoIcon className="mt-0.5 size-3.5 shrink-0" />
            Ni mwongozo, si barua ya udahili — thibitisha na TCU au NACTVET.
          </p>
        </form>
      </div>
    </section>
  )
}

/* ─────────────────────────── Universities ─────────────────────────── */

export function UniversitiesSection() {
  return (
    <section
      aria-labelledby="vyuo-heading"
      className="bg-white py-14 lg:py-[120px]"
    >
      <div className={`${container} flex flex-col gap-10 lg:gap-14`}>
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <h2 id="vyuo-heading" className={sectionTitle}>
            VYUO
            <br />
            {HOME_STATS.institutions}.
          </h2>
          <Link
            href="/vyuo"
            className="flex w-fit items-center gap-2.5 rounded-full border-[3px] border-kozi-ink px-6 py-4 font-display text-base text-kozi-ink shadow-[4px_4px_0_var(--kozi-ink)] transition-transform hover:-translate-y-0.5 sm:mb-2"
          >
            TAZAMA VYOTE
            <ArrowRightIcon className="size-[18px]" />
          </Link>
        </div>

        <ul className="border-t-[3px] border-kozi-ink">
          {FEATURED_UNIVERSITIES.map((university) => (
            <li
              key={university.short}
              className="border-b-[3px] border-kozi-ink"
            >
              <Link
                href={universityHref(university)}
                className="group flex items-center gap-4 py-5 lg:gap-7 lg:py-[22px]"
              >
                <div className="relative hidden h-20 w-[120px] shrink-0 overflow-hidden rounded-[10px] border-[3px] border-kozi-ink sm:block">
                  <Image
                    src={university.image}
                    alt=""
                    fill
                    sizes="120px"
                    className="object-cover"
                  />
                </div>
                <span className="grid h-10 w-[84px] shrink-0 place-items-center rounded-lg border-2 border-kozi-ink bg-kozi-yellow font-display text-sm text-kozi-ink lg:w-24 lg:text-[15px]">
                  {university.short}
                </span>
                <span className="min-w-0 flex-1 font-display text-lg leading-tight tracking-[-0.03em] text-kozi-ink lg:text-[34px]">
                  {university.name}
                  <span className="mt-1 block font-tag text-xs font-medium tracking-normal text-kozi-graphite uppercase lg:hidden">
                    {university.region} · {university.programmes} kozi
                  </span>
                </span>
                <span className="hidden w-[170px] shrink-0 font-tag text-sm font-medium text-kozi-graphite uppercase lg:block">
                  {university.region}
                </span>
                <span className="hidden w-[110px] shrink-0 text-right font-display text-lg text-kozi-cobalt lg:block">
                  {university.programmes} KOZI
                </span>
                <span className="grid size-11 shrink-0 place-items-center rounded-full bg-kozi-ink text-kozi-yellow transition-transform group-hover:translate-x-1 lg:size-[52px]">
                  <ArrowRightIcon className="size-5" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
