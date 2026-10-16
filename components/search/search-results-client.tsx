"use client"

import { useEffect, useMemo, useRef } from "react"
import { useMutation, usePaginatedQuery, useQuery } from "convex/react"
import { usePathname, useRouter } from "next/navigation"

import { ProgrammeCard } from "@/components/search/programme-card"
import {
  awardLevels,
  familyMeta,
  getInitialQuery,
  isActiveFilter,
  type SearchFilterKey,
  updateParams,
} from "@/components/search/search-config"
import { SearchFilters } from "@/components/search/search-filters"
import { SearchHeader } from "@/components/search/search-header"
import { XIcon } from "@/components/search/search-icons"
import { api } from "@/convex/_generated/api"

const INITIAL_RESULT_LIMIT = 20
const MAX_VISIBLE_RESULTS = 200
const SEARCH_CANDIDATE_LIMIT = 1000

export function SearchResultsClient({
  initialSearchParams,
}: {
  initialSearchParams: readonly (readonly [string, string])[]
}) {
  const router = useRouter()
  const pathname = usePathname()
  const logSearchEvent = useMutation(api.searchEvents.log)
  const lastLoggedSearchRef = useRef("")
  const searchParams = useMemo(
    () =>
      new URLSearchParams(
        initialSearchParams.map(([key, value]) => [key, value])
      ),
    [initialSearchParams]
  )
  const submittedQuery = searchParams.get("q")?.trim() ?? ""
  const queryFromUrl = getInitialQuery(searchParams)

  const family = searchParams.get("family") ?? undefined
  const awardLevel = searchParams.get("level") ?? "all"
  const region = searchParams.get("region") ?? ""
  const institution = searchParams.get("institution") ?? undefined
  const institutionLabel = searchParams.get("institutionLabel") ?? undefined
  const selectedProgrammeId = searchParams.get("programme") ?? undefined
  const defaultResultLimit = selectedProgrammeId
    ? MAX_VISIBLE_RESULTS
    : INITIAL_RESULT_LIMIT

  const filters = useMemo(() => {
    return {
      ...(family ? { courseFamily: family } : {}),
      ...(awardLevel !== "all" ? { awardLevel } : {}),
      ...(region ? { region } : {}),
      ...(institution ? { normalizedInstitutionName: institution } : {}),
    }
  }, [awardLevel, family, institution, region])

  const activeQuery = queryFromUrl
  const hasFilters =
    Boolean(family) ||
    awardLevel !== "all" ||
    Boolean(region) ||
    Boolean(institution)
  const filtersJson = useMemo(() => {
    return hasFilters ? JSON.stringify(filters) : undefined
  }, [filters, hasFilters])

  const searchArgs = activeQuery
    ? {
        query: activeQuery,
        filters: hasFilters ? filters : undefined,
        maxCount: SEARCH_CANDIDATE_LIMIT,
      }
    : "skip"

  const searchSummary = useQuery(api.programmes.smartSearchSummary, searchArgs)
  const paginatedSearch = usePaginatedQuery(
    api.programmes.smartSearchPaginated,
    searchArgs,
    { initialNumItems: defaultResultLimit }
  )
  const results = paginatedSearch.results.slice(0, MAX_VISIBLE_RESULTS)
  const isResultsLoading =
    Boolean(activeQuery) && paginatedSearch.status === "LoadingFirstPage"
  const isLoadingMore = paginatedSearch.status === "LoadingMore"
  const renderedCount = results.length
  const totalMatches = searchSummary?.total ?? renderedCount
  const canLoadMore =
    Boolean(activeQuery) &&
    paginatedSearch.status === "CanLoadMore" &&
    renderedCount > 0 &&
    renderedCount < MAX_VISIBLE_RESULTS

  const inferredFamily = searchSummary?.interpreted.inferredCourseFamily
  const activeFilters = [
    family && {
      key: "family",
      label: familyMeta(family).label,
      clear: () => setFilter("family", null),
    },
    awardLevel !== "all" && {
      key: "level",
      label:
        awardLevels.find((level) => level.value === awardLevel)?.label ??
        awardLevel,
      clear: () => setFilter("level", "all"),
    },
    region && {
      key: "region",
      label: region,
      clear: () => setFilter("region", null),
    },
    institution && {
      key: "institution",
      label: institutionLabel ?? "Selected institution",
      clear: () => setFilter("institution", null),
    },
  ].filter(isActiveFilter)

  useEffect(() => {
    if (!submittedQuery || isResultsLoading || !searchSummary) {
      return
    }

    const resultCount = searchSummary.total
    const logKey = JSON.stringify([
      submittedQuery.toLowerCase(),
      filtersJson ?? "",
      resultCount,
      searchSummary.capped,
    ])
    if (lastLoggedSearchRef.current === logKey) {
      return
    }

    lastLoggedSearchRef.current = logKey
    void logSearchEvent({
      query: submittedQuery,
      filtersJson,
      resultCount,
      resultCountCapped: searchSummary.capped,
      source: "search_page",
    })
  }, [
    filtersJson,
    isResultsLoading,
    logSearchEvent,
    searchSummary,
    submittedQuery,
  ])

  function routeWith(nextParams: URLSearchParams) {
    const queryString = nextParams.toString()
    router.push(queryString ? `${pathname}?${queryString}` : pathname)
  }

  function setFilter(key: SearchFilterKey, value: string | null) {
    routeWith(
      updateParams(searchParams, {
        [key]: value,
        ...(key === "institution" ? { institutionLabel: null } : {}),
        programme: null,
      })
    )
  }

  function clearAllFilters() {
    routeWith(
      updateParams(searchParams, {
        family: null,
        level: null,
        region: null,
        institution: null,
        institutionLabel: null,
        programme: null,
      })
    )
  }

  function submitSearch(nextQuery: string) {
    const normalizedQuery = nextQuery.trim()
    if (!normalizedQuery) {
      return
    }

    routeWith(
      updateParams(searchParams, {
        q: normalizedQuery,
        family: null,
        institution: null,
        institutionLabel: null,
        programme: null,
      })
    )
  }

  function runTrending(nextQuery: string) {
    routeWith(
      updateParams(searchParams, {
        q: nextQuery,
        family: null,
        institution: null,
        institutionLabel: null,
        programme: null,
      })
    )
  }

  function loadMoreResults() {
    paginatedSearch.loadMore(
      Math.min(INITIAL_RESULT_LIMIT, MAX_VISIBLE_RESULTS - renderedCount)
    )
  }

  return (
    <main className="min-h-screen bg-white font-poster text-kozi-ink">
      <SearchHeader
        key={queryFromUrl}
        initialQuery={queryFromUrl}
        onSubmit={submitSearch}
        onTrending={runTrending}
      />

      <div className="mx-auto grid w-full max-w-[1440px] gap-10 px-5 py-10 sm:px-10 lg:grid-cols-[18rem_1fr] lg:gap-12 lg:px-14 lg:py-12">
        <SearchFilters
          activeFilters={activeFilters}
          awardLevel={awardLevel}
          family={family}
          region={region}
          clearAllFilters={clearAllFilters}
          setFilter={setFilter}
        />

        <section className="min-w-0">
          <SearchResultsHeader
            activeQuery={activeQuery}
            inferredFamily={inferredFamily}
            isResultsLoading={isResultsLoading}
            totalMatches={searchSummary?.total}
            isCapped={Boolean(searchSummary?.capped)}
            resultCount={results.length}
          />

          {activeFilters.length > 0 ? (
            <div className="mt-5 flex min-w-0 flex-wrap items-center gap-2">
              {activeFilters.map((filter) => (
                <button
                  aria-label={`Remove ${filter.label} filter`}
                  className="inline-flex max-w-full items-center gap-2 rounded-full border-2 border-kozi-ink bg-kozi-yellow px-3.5 py-1.5 font-poster text-[13px] font-bold text-kozi-ink transition hover:bg-kozi-ink hover:text-kozi-yellow"
                  key={filter.key}
                  onClick={filter.clear}
                  type="button"
                >
                  <span className="min-w-0 truncate">{filter.label}</span>
                  <XIcon className="size-3.5 shrink-0" />
                </button>
              ))}
            </div>
          ) : null}

          <div className="mt-6 grid min-w-0 gap-5">
            {!activeQuery ? (
              <EmptyState />
            ) : isResultsLoading ? (
              <LoadingState />
            ) : results.length ? (
              <>
                {results.map((programme) => (
                  <ProgrammeCard
                    isSelected={programme._id === selectedProgrammeId}
                    key={programme._id}
                    programme={programme}
                    shareUrl={buildProgrammeShareUrl(
                      searchParams,
                      programme._id
                    )}
                  />
                ))}
                <SearchResultsFooter
                  canLoadMore={canLoadMore}
                  isCapped={Boolean(searchSummary?.capped)}
                  isLoadingMore={isLoadingMore}
                  onLoadMore={loadMoreResults}
                  renderedCount={renderedCount}
                  totalMatches={totalMatches}
                />
              </>
            ) : (
              <EmptyState message="Hakuna kozi inayolingana. Jaribu neno pana zaidi au ondoa kichujio." />
            )}
          </div>
        </section>
      </div>
    </main>
  )
}

function SearchResultsFooter({
  canLoadMore,
  isCapped,
  isLoadingMore,
  onLoadMore,
  renderedCount,
  totalMatches,
}: {
  canLoadMore: boolean
  isCapped: boolean
  isLoadingMore: boolean
  onLoadMore: () => void
  renderedCount: number
  totalMatches: number
}) {
  return (
    <div className="flex flex-col items-center gap-4 pt-6 text-center">
      {canLoadMore || isLoadingMore ? (
        <button
          className="rounded-full border-[3px] border-kozi-ink bg-kozi-yellow px-8 py-4 font-display text-base text-kozi-ink shadow-[5px_5px_0_var(--kozi-ink)] transition-transform hover:-translate-y-0.5 disabled:cursor-wait disabled:opacity-60"
          disabled={isLoadingMore}
          onClick={onLoadMore}
          type="button"
        >
          {isLoadingMore ? "INAPAKIA..." : "ONYESHA ZAIDI"}
        </button>
      ) : null}
      <p className="font-poster text-sm text-kozi-graphite">
        Unaona {renderedCount} kati ya {totalMatches}
        {isCapped ? "+" : ""} · Thibitisha sifa na TCU / NACTVET kabla ya
        kuomba.
      </p>
    </div>
  )
}

function SearchResultsHeader({
  activeQuery,
  inferredFamily,
  isResultsLoading,
  totalMatches,
  isCapped,
  resultCount,
}: {
  activeQuery: string
  inferredFamily?: string
  isResultsLoading: boolean
  totalMatches?: number
  isCapped: boolean
  resultCount?: number
}) {
  return (
    <div className="flex min-w-0 flex-wrap items-end justify-between gap-4 border-b-[3px] border-kozi-ink pb-5">
      <div className="flex min-w-0 flex-wrap items-baseline gap-x-4 gap-y-1">
        <h2 className="font-display text-[44px] leading-none tracking-[-0.05em] text-kozi-ink sm:text-[64px]">
          {isResultsLoading
            ? "TUNATAFUTA…"
            : `${totalMatches ?? resultCount ?? 0}${isCapped ? "+" : ""} KOZI`}
        </h2>
        <p className="font-poster text-base font-medium break-words text-kozi-graphite">
          {activeQuery ? `za "${activeQuery}"` : "zote"}
        </p>
      </div>
      {inferredFamily ? (
        <span className="max-w-full shrink-0 truncate rounded-full bg-kozi-cobalt px-3.5 py-1.5 font-poster text-[13px] font-bold text-white">
          Fani: {familyMeta(inferredFamily).label}
        </span>
      ) : null}
    </div>
  )
}

function EmptyState({
  message = "Tafuta kozi, chuo, au career path kuona matokeo.",
}) {
  return (
    <div className="rounded-[20px] border-[3px] border-dashed border-kozi-ink bg-white p-10 text-center">
      <p className="font-display text-lg text-kozi-ink">{message}</p>
      <p className="mt-2 font-poster text-sm text-kozi-graphite">
        Jaribu “clinical medicine”, “civil engineering”, au “nataka kuwa nurse”.
      </p>
    </div>
  )
}

function LoadingState() {
  return (
    <div className="grid gap-4">
      {[0, 1, 2].map((item) => (
        <div
          className="h-56 animate-pulse rounded-[20px] border-[3px] border-kozi-ink/15 bg-kozi-yellow/10"
          key={item}
        />
      ))}
    </div>
  )
}

function buildProgrammeShareUrl(
  searchParams: URLSearchParams,
  programmeId: string
) {
  const nextParams = new URLSearchParams(searchParams.toString())
  nextParams.set("programme", programmeId)

  return `/search?${nextParams.toString()}`
}
