"use client"

import { useMemo, useState } from "react"
import { usePaginatedQuery, useQuery } from "convex/react"

import { InstitutionCard } from "@/components/vyuo/institution-card"
import {
  popularRegions,
  type InstitutionOwnership,
  type InstitutionType,
} from "@/components/vyuo/institutions"
import { VyuoFilters } from "@/components/vyuo/vyuo-filters"
import { VyuoHeader } from "@/components/vyuo/vyuo-header"
import { SearchIcon } from "@/components/search/search-icons"
import { api } from "@/convex/_generated/api"

const PAGE_SIZE = 80

export function VyuoPageClient() {
  const [query, setQuery] = useState("")
  const [types, setTypes] = useState<Set<InstitutionType>>(new Set())
  const [region, setRegion] = useState("")
  const [ownership, setOwnership] = useState<InstitutionOwnership | "">("")
  const [awardLevels, setAwardLevels] = useState<Set<string>>(new Set())
  const [field, setField] = useState("")

  const hasFilters =
    types.size > 0 ||
    Boolean(region) ||
    Boolean(ownership) ||
    awardLevels.size > 0 ||
    Boolean(field) ||
    Boolean(query)
  const filterKey = `${query.trim()}|${[...types].sort().join(",")}|${region}|${ownership}|${[
    ...awardLevels,
  ]
    .sort()
    .join(",")}|${field}`
  const [visibleCountState, setVisibleCountState] = useState({
    key: filterKey,
    count: PAGE_SIZE,
  })
  const visibleCount =
    visibleCountState.key === filterKey ? visibleCountState.count : PAGE_SIZE

  const filters = useMemo(() => {
    return {
      ...(query.trim() ? { query: query.trim() } : {}),
      ...(types.size > 0 ? { types: [...types] } : {}),
      ...(region ? { region } : {}),
      ...(ownership ? { ownership } : {}),
      ...(awardLevels.size > 0 ? { awardLevels: [...awardLevels] } : {}),
      ...(field ? { field } : {}),
    }
  }, [query, types, region, ownership, awardLevels, field])

  // Use paginated query for unfiltered browse (true backend pagination)
  const paginatedResults = usePaginatedQuery(
    api.institutions.browsePaginated,
    hasFilters ? "skip" : {},
    { initialNumItems: PAGE_SIZE }
  )

  const filteredBrowseResult = useQuery(
    api.institutions.browse,
    hasFilters
      ? {
          filters,
          limit: visibleCount,
        }
      : "skip"
  )

  // Use regular query for summary/facets with filters applied
  const summary = useQuery(api.institutions.browseSummary, { filters })

  const institutions = hasFilters
    ? (filteredBrowseResult?.results ?? [])
    : paginatedResults.results
  const isLoading = hasFilters
    ? filteredBrowseResult === undefined
    : paginatedResults.status === "LoadingFirstPage"
  const isLoadingMore = !hasFilters && paginatedResults.status === "LoadingMore"
  const totalResults = summary?.total ?? institutions.length
  const canLoadMore = hasFilters
    ? institutions.length < totalResults
    : paginatedResults.status === "CanLoadMore"

  const regions = useMemo(() => {
    return [
      ...new Set([
        ...popularRegions,
        ...(summary?.regions ?? []),
      ]),
    ].sort()
  }, [summary?.regions])

  function clearAll() {
    setTypes(new Set())
    setRegion("")
    setOwnership("")
    setAwardLevels(new Set())
    setField("")
    setQuery("")
    setVisibleCountState({ key: "", count: PAGE_SIZE })
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-white text-brand-ink">
      <VyuoHeader />
      <VyuoHero query={query} region={region} setQuery={setQuery} setRegion={setRegion} />

      <div className="mx-auto grid w-full max-w-[1280px] gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[16.5rem_1fr] lg:gap-10 lg:px-8 lg:py-10">
        <VyuoFilters
          awardLevels={awardLevels}
          clearAll={clearAll}
          field={field}
          hasFilters={hasFilters}
          ownership={ownership}
          region={region}
          regions={regions}
          setAwardLevels={setAwardLevels}
          setField={setField}
          setOwnership={setOwnership}
          setRegion={setRegion}
          setTypes={setTypes}
          types={types}
          counts={summary ? { typeCounts: summary.typeCounts, ownershipCounts: summary.ownershipCounts, awardLevelCounts: summary.awardLevelCounts } : undefined}
        />

        <section className="min-w-0 max-w-full">
          <div>
            <p className="text-[12.5px] font-semibold uppercase tracking-[0.16em] text-brand-blue">
              <span>{isLoading ? "..." : totalResults}</span>
              <span className="mx-2 text-brand-ink/30">.</span>
              <span>Vyuo na Colleges</span>
            </p>
          </div>

          {isLoading ? (
            <LoadingState />
          ) : totalResults === 0 ? (
            <EmptyState onClear={clearAll} />
          ) : (
            <>
              <div className="mt-6 grid min-w-0 gap-4 md:grid-cols-2">
                {institutions.map((institution) => (
                  <InstitutionCard institution={institution} key={institution.id} />
                ))}
              </div>
              {canLoadMore ? (
                <div className="mt-7 flex justify-center">
                  <button
                    onClick={() => {
                      if (hasFilters) {
                        setVisibleCountState({
                          key: filterKey,
                          count: visibleCount + PAGE_SIZE,
                        })
                        return
                      }

                      paginatedResults.loadMore(PAGE_SIZE)
                    }}
                    disabled={isLoadingMore}
                    className="rounded-full border border-brand-ink/15 px-5 py-2 text-[13px] font-semibold text-brand-ink transition hover:border-brand-ink hover:bg-brand-ink hover:text-white disabled:cursor-wait disabled:opacity-60"
                    type="button"
                  >
                    {isLoadingMore ? "Loading..." : `Onyesha vingine ${Math.min(PAGE_SIZE, totalResults - institutions.length)}`}
                  </button>
                </div>
              ) : null}
            </>
          )}
        </section>
      </div>
    </main>
  )
}

function VyuoHero({
  query,
  region,
  setQuery,
  setRegion,
}: {
  query: string
  region: string
  setQuery: (value: string) => void
  setRegion: (value: string) => void
}) {
  return (
    <section className="overflow-hidden border-b border-brand-ink/8 bg-[#fbfaf6]">
      <div className="mx-auto grid w-full max-w-[1280px] gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-16 lg:px-8 lg:py-16">
        <div className="min-w-0">
          <div className="flex items-center gap-3 text-[12px] font-semibold uppercase tracking-[0.18em] text-brand-blue">
            <span>Vyuo na Colleges</span>
            <span className="h-px w-10 bg-brand-blue/30" />
          </div>
          <h1 className="mt-4 max-w-full break-words text-[31px] font-bold leading-[1.08] tracking-tight sm:text-[52px]">
            Tafuta vyuo na colleges
            <br />
            <span className="text-brand-ink/55">vinavyokufaa.</span>
          </h1>
          <p className="mt-4 max-w-full text-[15.5px] leading-7 text-brand-ink/65 sm:max-w-xl">
            Search taasisi kulingana na eneo, aina ya umiliki, ngazi ya kozi, na programu wanazotoa.
          </p>

          <form
            onSubmit={(event) => event.preventDefault()}
            className="mt-7 box-border flex w-full max-w-full flex-col gap-2 overflow-hidden rounded-3xl border border-brand-ink/10 bg-white p-2 shadow-[0_18px_38px_-22px_rgba(15,15,18,0.25)] sm:max-w-2xl sm:flex-row sm:items-center sm:rounded-full"
          >
            <label className="flex flex-1 items-center gap-3 px-4">
              <span className="sr-only">Tafuta chuo, college, au eneo</span>
              <SearchIcon className="size-[18px] shrink-0 text-brand-ink/45" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Tafuta chuo, college, au eneo..."
                className="h-11 w-full min-w-0 bg-transparent text-[14.5px] text-brand-ink outline-none caret-brand-blue placeholder:text-brand-ink/40"
              />
            </label>
            <button
              type="submit"
              className="h-11 w-full max-w-full shrink-0 rounded-full bg-brand-blue px-7 text-[14px] font-semibold text-white transition hover:bg-brand-blue-deep sm:w-auto"
            >
              Tafuta
            </button>
          </form>

          <div className="mt-5 flex flex-wrap items-center gap-2">
            <span className="mr-1 text-[12px] font-semibold uppercase tracking-[0.16em] text-brand-ink/45">
              Maarufu
            </span>
            {popularRegions.map((item) => (
              <button
                key={item}
                onClick={() => setRegion(region === item ? "" : item)}
                className={`rounded-full border px-3.5 py-1.5 text-[12.5px] font-medium transition ${
                  region === item
                    ? "border-brand-blue bg-brand-blue text-white"
                    : "border-brand-ink/15 bg-white text-brand-ink/70 hover:border-brand-ink/40"
                }`}
                type="button"
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        <div className="hidden lg:block">
          <CampusIllustration />
        </div>
      </div>
    </section>
  )
}

function CampusIllustration() {
  return (
    <div className="relative flex h-full min-h-[260px] w-full items-center justify-center">
      <div
        aria-hidden="true"
        className="absolute inset-0 m-auto size-[280px] rounded-full bg-brand-blue/[0.06] blur-2xl"
      />
      <svg
        viewBox="0 0 360 280"
        className="relative w-full max-w-[360px] text-brand-ink/55"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.4"
      >
        <circle cx="290" cy="60" r="14" fill="#f5c518" stroke="none" />
        <line x1="20" y1="220" x2="340" y2="220" />
        <rect x="110" y="120" width="140" height="90" />
        <polygon points="100,120 180,70 260,120" />
        <polygon points="118,120 180,82 242,120" />
        <line x1="130" y1="130" x2="130" y2="200" />
        <line x1="155" y1="130" x2="155" y2="200" />
        <line x1="180" y1="130" x2="180" y2="200" />
        <line x1="205" y1="130" x2="205" y2="200" />
        <line x1="230" y1="130" x2="230" y2="200" />
        <rect x="100" y="200" width="160" height="10" />
        <ellipse cx="60" cy="180" rx="22" ry="28" />
        <line x1="60" y1="208" x2="60" y2="220" />
        <ellipse cx="90" cy="190" rx="14" ry="18" />
        <line x1="90" y1="208" x2="90" y2="220" />
        <ellipse cx="300" cy="180" rx="22" ry="28" />
        <line x1="300" y1="208" x2="300" y2="220" />
        <ellipse cx="270" cy="190" rx="14" ry="18" />
        <line x1="270" y1="208" x2="270" y2="220" />
        <path d="M30 230 Q180 215 330 230" opacity="0.4" />
      </svg>
    </div>
  )
}

function EmptyState({ onClear }: { onClear: () => void }) {
  return (
    <div className="mt-10 rounded-2xl border border-dashed border-brand-ink/15 bg-[#fbfaf6] p-12 text-center">
      <p className="text-[15px] font-semibold">Hakuna chuo kinacholingana na vichujio.</p>
      <p className="mt-1 text-[13px] text-brand-ink/55">
        Jaribu kupanua utafutaji au kuondoa baadhi ya vichujio.
      </p>
      <button
        onClick={onClear}
        className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-brand-ink px-4 py-2 text-[13px] font-semibold text-white"
        type="button"
      >
        Futa vichujio vyote
      </button>
    </div>
  )
}

function LoadingState() {
  return (
    <div className="mt-6 grid gap-4 md:grid-cols-2">
      {[0, 1, 2, 3].map((item) => (
        <div
          className="h-56 animate-pulse rounded-2xl border border-brand-ink/10 bg-brand-ink/[0.03]"
          key={item}
        />
      ))}
    </div>
  )
}
