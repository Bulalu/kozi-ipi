import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

const NAV = [
  { label: "Kozi", href: "/search" },
  { label: "Vyuo", href: "/vyuo" },
  { label: "Sifa", href: "/eligibility" },
]

const FEATURED_INSTITUTIONS: Array<{
  name: string
  short: string
  region: string
  image: string
  query: string
  normalizedInstitutionName: string
}> = [
  {
    name: "University of Dar es Salaam",
    short: "UDSM",
    region: "Dar es Salaam",
    image: "/institution-campus/udsm.jpg",
    query: "University of Dar es Salaam",
    normalizedInstitutionName: "dar es salaam",
  },
  {
    name: "University of Dodoma",
    short: "UDOM",
    region: "Dodoma",
    image: "/institution-campus/udom.jpg",
    query: "University of Dodoma",
    normalizedInstitutionName: "dodoma",
  },
  {
    name: "Ardhi University",
    short: "ARU",
    region: "Dar es Salaam",
    image: "/institution-campus/ardhi.jpg",
    query: "Ardhi University",
    normalizedInstitutionName: "ardhi aru",
  },
  {
    name: "Mbeya University of Science and Technology",
    short: "MUST",
    region: "Mbeya",
    image: "/institution-campus/must.jpg",
    query: "Mbeya University of Science and Technology",
    normalizedInstitutionName: "mbeya science technology",
  },
  {
    name: "St Joseph University in Tanzania",
    short: "SJUIT",
    region: "Dar es Salaam",
    image: "/institution-campus/st-joseph.jpg",
    query: "St Joseph University",
    normalizedInstitutionName: "st joseph tanzania engineering technology",
  },
]

const TRENDING = [
  "Computer Science",
  "Clinical Medicine",
  "Law",
  "Civil Engineering",
  "Accounting",
]

export function Hero() {
  return (
    <section
      className="relative min-h-svh w-full bg-brand-cream font-body text-brand-ink"
      style={{ fontFamily: "var(--font-body)" }}
    >
      <div className="mx-auto flex w-full max-w-[1320px] flex-col gap-10 px-6 pb-20 sm:px-10 lg:gap-14 lg:px-14 lg:pb-24">
        <SiteHeader />

        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-[1fr_1.45fr] lg:gap-12">
          <HeroCopy />
          <HeroArtwork />
        </div>

        <CategoryStrip className="lg:mt-6" />

        <FeaturedInstitutions />
      </div>
    </section>
  )
}

/* ────────────────────────────── Header ────────────────────────────── */

function SiteHeader() {
  return (
    <header className="flex h-20 items-center justify-between gap-6 lg:h-24">
      <Link
        href="/"
        aria-label="Kozi Ipi home"
        className="inline-flex items-center gap-2"
      >
        <Image
          src="/kozi-ipi-logo.png"
          alt="Kozi Ipi"
          width={56}
          height={56}
          priority
          className="size-12 lg:size-14"
        />
        <span className="rounded-full bg-brand-blue/10 px-2 py-0.5 text-[10px] font-semibold tracking-[0.12em] text-brand-blue uppercase">
          Beta
        </span>
      </Link>

      <nav className="flex items-center gap-5 lg:gap-8">
        {NAV.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className="group relative text-[14px] font-medium text-brand-ink/85 transition-colors hover:text-brand-blue"
          >
            {item.label}
            <span className="absolute -bottom-1.5 left-0 h-[2px] w-0 bg-brand-blue transition-[width] duration-300 group-hover:w-full" />
          </Link>
        ))}
      </nav>

      <div className="flex items-center gap-2">
        <Link
          href="/search"
          aria-label="Search"
          className="grid size-10 place-items-center rounded-full text-brand-ink transition-colors hover:bg-black/5"
        >
          <SearchIcon className="size-[18px]" />
        </Link>
      </div>
    </header>
  )
}

/* ───────────────────────────── Hero copy ───────────────────────────── */

function HeroCopy() {
  return (
    <div className="relative order-2 lg:order-1">
      <h1 className="relative">
        <span className="sr-only">Oyaaa, kozi ipi unachukua?</span>
        <Image
          src="/oyaaa-headline.png"
          alt=""
          width={1448}
          height={1086}
          priority
          aria-hidden
          className="h-auto w-full max-w-[34rem] select-none"
        />
      </h1>

      <p
        className="mt-7 max-w-[36rem] text-[15.5px] leading-[1.7] text-brand-ink/70 sm:text-base"
        style={{ fontFamily: "var(--font-body)" }}
      >
        Jukwaa lako la kugundua kozi, vyuo, levels na career paths baada ya
        secondary school, A-level au diploma. Chagua smart, jenga kesho yako.
      </p>

      <SearchBar className="mt-9" />

      <div className="mt-7 flex flex-wrap items-center gap-2.5 text-[13px]">
        <span className="font-semibold text-brand-ink">Trending:</span>
        {TRENDING.map((t) => (
          <Link
            key={t}
            href={`/search?q=${encodeURIComponent(t)}`}
            className="rounded-full border border-brand-ink/15 bg-white/70 px-3.5 py-1.5 text-brand-ink/75 transition-colors hover:border-brand-blue hover:bg-brand-blue hover:text-white"
          >
            {t}
          </Link>
        ))}
      </div>
    </div>
  )
}

/* ───────────────────────────── Search bar ──────────────────────────── */

function SearchBar({ className = "" }: { className?: string }) {
  return (
    <form
      action="/search"
      className={`flex w-full max-w-[40rem] flex-col gap-2 rounded-3xl border border-brand-ink/10 bg-white p-2 shadow-[0_18px_38px_-22px_rgba(15,15,18,0.25)] sm:flex-row sm:items-center sm:gap-0 sm:rounded-full ${className}`}
      method="get"
    >
      <label className="flex flex-1 items-center gap-3 px-4">
        <span className="sr-only">Tafuta kozi, chuo, au career path</span>
        <SearchIcon className="size-[18px] shrink-0 text-brand-ink/55" />
        <Input
          aria-label="Tafuta kozi, chuo, au career path"
          className="h-12 border-0 bg-transparent px-0 text-[15px] text-brand-ink caret-brand-blue shadow-none placeholder:text-brand-ink/40 focus-visible:ring-0"
          name="q"
          placeholder="Tafuta kozi, chuo, career path..."
          size="xl"
          variant="ghost"
        />
      </label>

      <Button
        type="submit"
        size="lg"
        className="h-12 shrink-0 rounded-full bg-brand-blue px-7 text-[14px] font-semibold text-white hover:bg-brand-blue-deep"
      >
        Tafuta
      </Button>
    </form>
  )
}

/* ─────────────────────────── Hero artwork ─────────────────────────── */

function HeroArtwork() {
  return (
    <div className="relative order-1 mx-auto w-full max-w-[640px] lg:order-2 lg:mx-0 lg:-mr-4 lg:ml-auto lg:max-w-[860px] xl:-mr-10">
      <div className="relative aspect-[4/3] w-full">
        <Image
          src="/hero-students.png"
          alt="Three Tanzanian students looking ahead"
          fill
          priority
          sizes="(min-width: 1024px) 780px, 90vw"
          className="object-contain"
        />
      </div>
    </div>
  )
}

/* ─────────────────────────── Category strip ─────────────────────────── */

const CATEGORIES: Array<{
  label: string
  hint: string
  tone: "blue" | "yellow" | "ink"
  family: string
  query: string
  image: string
  imagePosition?: string
  Icon: (props: { className?: string }) => React.JSX.Element
}> = [
  {
    label: "Engineering",
    hint: "Uhandisi",
    tone: "blue",
    family: "engineering",
    query: "Engineering",
    image: "/category-images/engineering.jpg",
    imagePosition: "center",
    Icon: GearIcon,
  },
  {
    label: "Biashara",
    hint: "Business",
    tone: "yellow",
    family: "business",
    query: "Business",
    image: "/category-images/business.jpg",
    imagePosition: "center",
    Icon: BriefcaseIcon,
  },
  {
    label: "Afya",
    hint: "Health",
    tone: "ink",
    family: "health",
    query: "Health",
    image: "/category-images/health.jpg",
    imagePosition: "center",
    Icon: PulseIcon,
  },
  {
    label: "Utalii",
    hint: "Tourism",
    tone: "blue",
    family: "tourism_hospitality",
    query: "Tourism",
    image: "/category-images/tourism.jpg",
    imagePosition: "center",
    Icon: PalmIcon,
  },
  {
    label: "Tech",
    hint: "Teknolojia",
    tone: "yellow",
    family: "ICT",
    query: "ICT",
    image: "/category-images/tech.jpg",
    imagePosition: "center",
    Icon: CodeIcon,
  },
]

const TONE_BADGE: Record<"blue" | "yellow" | "ink", string> = {
  blue: "bg-white/90 text-brand-blue",
  yellow: "bg-brand-yellow text-brand-ink",
  ink: "bg-brand-ink text-white",
}

function CategoryStrip({ className = "" }: { className?: string }) {
  return (
    <section aria-labelledby="categories-heading" className={className}>
      <div className="mb-5 flex items-end justify-between gap-4">
        <h2
          id="categories-heading"
          className="text-[18px] font-semibold tracking-tight text-brand-ink lg:text-[20px]"
        >
          Category
        </h2>
        <Link
          href="/search"
          className="hidden items-center gap-1 text-[13px] font-medium text-brand-blue hover:underline sm:inline-flex"
        >
          Tazama zote
          <ArrowRightIcon className="size-3.5" />
        </Link>
      </div>

      <div className="grid min-w-0 grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5">
        {CATEGORIES.map(
          ({
            label,
            hint,
            tone,
            family,
            query,
            image,
            imagePosition,
            Icon,
          }) => (
            <Link
              key={label}
              href={`/search?q=${encodeURIComponent(query)}&family=${encodeURIComponent(family)}`}
              className="group relative flex min-h-[154px] min-w-0 overflow-hidden rounded-2xl border border-brand-ink/10 bg-brand-ink p-5 text-white transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-blue/40 hover:shadow-[0_22px_42px_-26px_rgba(29,78,216,0.45)]"
            >
              <Image
                src={image}
                alt=""
                fill
                sizes="(min-width: 1024px) 18vw, (min-width: 640px) 30vw, 45vw"
                className="object-cover transition-transform duration-500 group-hover:scale-105"
                style={{ objectPosition: imagePosition }}
                aria-hidden
              />
              <div className="absolute inset-0 bg-gradient-to-br from-black/75 via-black/35 to-black/10" />
              <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/70 to-transparent" />
              <div
                className={`relative grid size-11 place-items-center rounded-xl shadow-sm ${TONE_BADGE[tone]}`}
              >
                <Icon className="size-5" />
              </div>
              <div className="relative mt-auto flex items-end justify-between gap-2">
                <div>
                  <div className="text-[16px] font-semibold tracking-tight text-white">
                    {label}
                  </div>
                  <div className="text-[12px] text-white/75">{hint}</div>
                </div>
                <ArrowRightIcon className="size-4 shrink-0 text-white/70 transition-all group-hover:translate-x-0.5 group-hover:text-white" />
              </div>
            </Link>
          )
        )}
      </div>
    </section>
  )
}

/* ───────────────────────── Featured institutions ───────────────────────── */

function FeaturedInstitutions() {
  return (
    <section aria-labelledby="featured-institutions-heading">
      <div className="mb-5 flex items-end justify-between gap-4">
        <h2
          id="featured-institutions-heading"
          className="text-[18px] font-semibold tracking-tight text-brand-ink lg:text-[20px]"
        >
          Baadhi ya vyuo
        </h2>
        <Link
          href="/vyuo"
          className="hidden items-center gap-1 text-[13px] font-medium text-brand-blue hover:underline sm:inline-flex"
        >
          Tazama vyote
          <ArrowRightIcon className="size-3.5" />
        </Link>
      </div>

      <div className="grid min-w-0 grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5">
        {FEATURED_INSTITUTIONS.map((institution) => (
          <Link
            key={institution.short}
            href={featuredInstitutionHref(institution)}
            className="group flex min-w-0 flex-col overflow-hidden rounded-2xl border border-brand-ink/10 bg-white transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-blue/40 hover:shadow-[0_22px_42px_-26px_rgba(29,78,216,0.45)]"
          >
            <CampusImage
              src={institution.image}
              alt={`${institution.name} campus`}
            />
            <div className="flex min-w-0 flex-1 flex-col gap-1 p-4">
              <div className="text-[11px] font-semibold tracking-wide text-brand-blue uppercase">
                {institution.short}
              </div>
              <h3 className="line-clamp-2 min-w-0 text-[13.5px] leading-snug font-semibold break-words text-brand-ink">
                {institution.name}
              </h3>
              <p className="mt-auto inline-flex min-w-0 items-center gap-1 pt-2 text-[12px] text-brand-ink/55">
                <PinIcon className="size-3" />
                <span className="min-w-0 truncate">{institution.region}</span>
              </p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}

function featuredInstitutionHref(institution: {
  name: string
  query: string
  normalizedInstitutionName: string
}) {
  const params = new URLSearchParams({
    q: institution.query,
    institution: institution.normalizedInstitutionName,
    institutionLabel: institution.name,
  })

  return `/search?${params.toString()}`
}

function CampusImage({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="relative aspect-[16/10] w-full overflow-hidden bg-brand-ink/[0.04]">
      <Image
        src={src}
        alt={alt}
        fill
        loading="eager"
        sizes="(min-width: 1024px) 18vw, (min-width: 640px) 30vw, 45vw"
        className="object-cover transition-transform duration-500 group-hover:scale-105"
      />
    </div>
  )
}

/* ─────────────────────────────── Icons ─────────────────────────────── */

function PinIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      aria-hidden
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 1 1 16 0Z" />
      <circle cx={12} cy={10} r={3} />
    </svg>
  )
}

function SearchIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      aria-hidden
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx={11} cy={11} r={7} />
      <path d="m20 20-3.5-3.5" />
    </svg>
  )
}

function ArrowRightIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      aria-hidden
      fill="none"
      stroke="currentColor"
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  )
}

function GearIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      aria-hidden
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx={12} cy={12} r={3} />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" />
    </svg>
  )
}

function BriefcaseIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      aria-hidden
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width={18} height={13} x={3} y={7} rx={2} />
      <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
      <path d="M3 13h18" />
    </svg>
  )
}

function PulseIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      aria-hidden
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 12h4l2-7 4 14 2-7h6" />
    </svg>
  )
}

function PalmIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      aria-hidden
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 22V10" />
      <path d="M12 10c-1.5-3-5-4-8-3 1.5 1 2 3 2 5" />
      <path d="M12 10c1.5-3 5-4 8-3-1.5 1-2 3-2 5" />
      <path d="M12 10c-2-2.5-2-6 0-9 2 3 2 6.5 0 9Z" />
    </svg>
  )
}

function CodeIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      aria-hidden
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m8 18-6-6 6-6" />
      <path d="m16 6 6 6-6 6" />
    </svg>
  )
}
