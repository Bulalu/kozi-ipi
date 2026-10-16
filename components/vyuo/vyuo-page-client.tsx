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
import { HOME_STATS } from "@/components/home/home-content"
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

  // Filtered summaries remain bounded until indexed filtered pagination is added.
  const summary = useQuery(
    api.institutions.browseSummary,
    hasFilters ? { filters } : "skip"
  )

  const institutions = hasFilters
    ? (filteredBrowseResult?.results ?? [])
    : paginatedResults.results
  const isLoading = hasFilters
    ? filteredBrowseResult === undefined
    : paginatedResults.status === "LoadingFirstPage"
  const isLoadingMore = !hasFilters && paginatedResults.status === "LoadingMore"
  const totalResults = hasFilters
    ? (summary?.total ?? institutions.length)
    : institutions.length
  const canLoadMore = hasFilters
    ? institutions.length < totalResults
    : paginatedResults.status === "CanLoadMore"

  const regions = useMemo(() => {
    return [...new Set([...popularRegions, ...(summary?.regions ?? [])])].sort()
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
    <main className="min-h-screen overflow-x-hidden bg-white font-poster text-kozi-ink">
      <VyuoHeader
        query={query}
        region={region}
        setQuery={setQuery}
        setRegion={setRegion}
        totalInstitutions={HOME_STATS.institutions}
      />

      <div className="mx-auto grid w-full max-w-[1440px] gap-10 px-5 py-10 sm:px-10 lg:grid-cols-[18rem_1fr] lg:gap-12 lg:px-14 lg:py-12">
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
          counts={
            summary
              ? {
                  typeCounts: summary.typeCounts,
                  ownershipCounts: summary.ownershipCounts,
                  awardLevelCounts: summary.awardLevelCounts,
                }
              : undefined
          }
        />

        <section className="max-w-full min-w-0">
          <div className="flex min-w-0 flex-wrap items-baseline gap-x-4 gap-y-1 border-b-[3px] border-kozi-ink pb-5">
            <h2 className="font-display text-[44px] leading-none tracking-[-0.05em] text-kozi-ink sm:text-[64px]">
              {isLoading
                ? "TUNATAFUTA…"
                : hasFilters
                  ? `${totalResults} VYUO`
                  : "VYUO VYOTE"}
            </h2>
            <p className="font-poster text-base font-medium text-kozi-graphite">
              vimepangwa kwa idadi ya kozi
            </p>
          </div>

          {isLoading ? (
            <LoadingState />
          ) : totalResults === 0 ? (
            <EmptyState onClear={clearAll} />
          ) : (
            <>
              <div className="mt-8 grid min-w-0 gap-7 md:grid-cols-2 2xl:grid-cols-3">
                {institutions.map((institution) => (
                  <InstitutionCard
                    institution={institution}
                    key={institution.id}
                  />
                ))}
              </div>
              {canLoadMore ? (
                <div className="mt-10 flex justify-center">
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
                    className="rounded-full border-[3px] border-kozi-ink bg-kozi-yellow px-8 py-4 font-display text-base text-kozi-ink shadow-[5px_5px_0_var(--kozi-ink)] transition-transform hover:-translate-y-0.5 disabled:cursor-wait disabled:opacity-60"
                    type="button"
                  >
                    {isLoadingMore
                      ? "INAPAKIA..."
                      : `ONYESHA VINGINE ${
                          hasFilters
                            ? Math.min(
                                PAGE_SIZE,
                                totalResults - institutions.length
                              )
                            : PAGE_SIZE
                        }`}
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

function EmptyState({ onClear }: { onClear: () => void }) {
  return (
    <div className="mt-8 rounded-[20px] border-[3px] border-dashed border-kozi-ink bg-white p-12 text-center">
      <p className="font-display text-lg text-kozi-ink">
        Hakuna chuo kinacholingana na vichujio.
      </p>
      <p className="mt-2 font-poster text-sm text-kozi-graphite">
        Jaribu kupanua utafutaji au kuondoa baadhi ya vichujio.
      </p>
      <button
        onClick={onClear}
        className="mt-6 inline-flex items-center rounded-full bg-kozi-ink px-6 py-3 font-display text-sm text-kozi-yellow"
        type="button"
      >
        FUTA VICHUJIO VYOTE
      </button>
    </div>
  )
}

function LoadingState() {
  return (
    <div className="mt-8 grid gap-7 md:grid-cols-2 2xl:grid-cols-3">
      {[0, 1, 2, 3].map((item) => (
        <div
          className="h-80 animate-pulse rounded-[20px] border-[3px] border-kozi-ink/15 bg-kozi-yellow/10"
          key={item}
        />
      ))}
    </div>
  )
}
