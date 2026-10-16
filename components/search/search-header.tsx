"use client"

import Link from "next/link"
import { type FormEvent, useState } from "react"

import { HomeNav } from "@/components/home/home-nav"
import { trendingQueries } from "@/components/search/search-config"
import { SearchIcon, XIcon } from "@/components/search/search-icons"

type SearchHeaderProps = {
  initialQuery: string
  onSubmit: (query: string) => void
  onTrending: (query: string) => void
}

export function SearchHeader({
  initialQuery,
  onSubmit,
  onTrending,
}: SearchHeaderProps) {
  const [query, setQuery] = useState(initialQuery)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onSubmit(query)
  }

  return (
    <header className="border-b-[3px] border-kozi-ink bg-kozi-yellow">
      <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-8 px-5 pt-5 pb-9 sm:px-10 lg:gap-10 lg:px-14 lg:pt-7 lg:pb-12">
        <HomeNav active="/search" />

        <div className="flex flex-col gap-8 xl:flex-row xl:items-end xl:justify-between xl:gap-12">
          <div className="flex min-w-0 flex-col gap-1.5">
            <p className="font-poster text-lg font-bold text-kozi-ink lg:text-xl">
              {initialQuery ? "Matokeo ya" : "Tafuta kozi"}
            </p>
            <h1 className="font-display text-[44px] leading-[0.92] tracking-[-0.05em] break-words text-kozi-ink uppercase sm:text-[72px] lg:text-[96px] xl:text-[104px]">
              {initialQuery || "Kozi ipi?"}
            </h1>
          </div>

          <div className="flex w-full shrink-0 flex-col gap-4 lg:max-w-[640px] xl:w-[560px] xl:pb-1.5">
            <form
              className="flex items-center gap-2 rounded-full border-[3px] border-kozi-ink bg-white py-1.5 pr-1.5 pl-5 shadow-[6px_6px_0_var(--kozi-ink)]"
              onSubmit={handleSubmit}
              role="search"
            >
              <SearchIcon className="size-5 shrink-0 text-kozi-ink" />
              <label htmlFor="search-query" className="sr-only">
                Tafuta kozi, chuo, career path
              </label>
              <input
                id="search-query"
                type="search"
                className="h-12 min-w-0 flex-1 bg-transparent font-poster text-base font-semibold text-kozi-ink caret-kozi-cobalt placeholder:font-normal placeholder:text-[#6b6b73] focus:outline-none lg:text-[17px] [&::-webkit-search-cancel-button]:hidden"
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Tafuta kozi, chuo, career path..."
                value={query}
              />
              {query ? (
                <button
                  aria-label="Clear search"
                  className="grid size-9 shrink-0 place-items-center rounded-full text-kozi-ink/50 transition hover:bg-kozi-ink/5 hover:text-kozi-ink"
                  onClick={() => setQuery("")}
                  type="button"
                >
                  <XIcon className="size-4" />
                </button>
              ) : null}
              <button
                className="h-12 shrink-0 rounded-full bg-kozi-cobalt px-5 font-display text-sm text-white transition-colors hover:bg-kozi-ink lg:px-6 lg:text-base"
                type="submit"
              >
                TAFUTA
              </button>
            </form>

            {/* Search has no student profile, so eligibility lives on Form Six. */}
            <Link
              href="/form-six"
              className="flex w-fit -rotate-[1.5deg] items-center gap-3 rounded-xl bg-kozi-ink px-4 py-2.5 transition-transform hover:rotate-0"
            >
              <span className="font-tag text-[11px] font-semibold tracking-[0.1em] text-kozi-yellow/75">
                UNASTAHILI?
              </span>
              <span className="font-display text-sm text-kozi-yellow">
                WEKA INDEX YA FORM SIX →
              </span>
            </Link>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="pr-1 font-display text-[13px] tracking-[0.04em] text-kozi-ink">
            ZINAZOTAFUTWA:
          </span>
          {trendingQueries.map((trending) => (
            <button
              className="rounded-full border-2 border-kozi-ink bg-white/60 px-3.5 py-1.5 font-poster text-[13px] font-bold text-kozi-ink transition hover:bg-kozi-ink hover:text-kozi-yellow"
              key={trending}
              onClick={() => {
                setQuery(trending)
                onTrending(trending)
              }}
              type="button"
            >
              {trending}
            </button>
          ))}
        </div>
      </div>
    </header>
  )
}
