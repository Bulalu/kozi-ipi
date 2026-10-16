"use client"

import { HomeNav } from "@/components/home/home-nav"
import { SearchIcon, XIcon } from "@/components/search/search-icons"
import { popularRegions } from "@/components/vyuo/institutions"

type VyuoHeaderProps = {
  query: string
  region: string
  setQuery: (value: string) => void
  setRegion: (value: string) => void
  totalInstitutions: string
}

export function VyuoHeader({
  query,
  region,
  setQuery,
  setRegion,
  totalInstitutions,
}: VyuoHeaderProps) {
  return (
    <header className="border-b-[3px] border-kozi-ink bg-kozi-yellow">
      <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-8 px-5 pt-5 pb-9 sm:px-10 lg:gap-10 lg:px-14 lg:pt-7 lg:pb-12">
        <HomeNav active="/vyuo" />

        <div className="flex flex-col gap-8 xl:flex-row xl:items-end xl:justify-between xl:gap-12">
          <div className="flex min-w-0 flex-col gap-1.5">
            <p className="font-poster text-lg font-bold text-kozi-ink lg:text-xl">
              Vyuo vikuu, vyuo vya kati na ufundi
            </p>
            <h1 className="font-display text-[56px] leading-[0.9] tracking-[-0.06em] whitespace-nowrap text-kozi-ink sm:text-[88px] lg:text-[112px]">
              VYUO {totalInstitutions}.
            </h1>
          </div>

          {/* Filters apply as you type; the form only stops a page reload. */}
          <form
            className="flex w-full shrink-0 items-center gap-2 rounded-full border-[3px] border-kozi-ink bg-white py-1.5 pr-1.5 pl-5 shadow-[6px_6px_0_var(--kozi-ink)] lg:max-w-[640px] xl:mb-1.5 xl:w-[560px]"
            onSubmit={(event) => event.preventDefault()}
            role="search"
          >
            <SearchIcon className="size-5 shrink-0 text-kozi-ink" />
            <label htmlFor="vyuo-query" className="sr-only">
              Tafuta chuo, college, au eneo
            </label>
            <input
              id="vyuo-query"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Tafuta chuo, college, au eneo..."
              className="h-12 min-w-0 flex-1 bg-transparent font-poster text-base font-semibold text-kozi-ink caret-kozi-cobalt placeholder:font-normal placeholder:text-[#6b6b73] focus:outline-none lg:text-[17px] [&::-webkit-search-cancel-button]:hidden"
            />
            {query ? (
              <button
                aria-label="Futa utafutaji"
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
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="pr-1 font-display text-[13px] tracking-[0.04em] text-kozi-ink">
            MIKOA MAARUFU:
          </span>
          {popularRegions.map((item) => {
            const selected = region === item
            return (
              <button
                aria-pressed={selected}
                key={item}
                onClick={() => setRegion(selected ? "" : item)}
                className={`rounded-full border-2 border-kozi-ink px-3.5 py-1.5 font-poster text-[13px] font-bold transition ${
                  selected
                    ? "bg-kozi-ink text-kozi-yellow"
                    : "bg-white/60 text-kozi-ink hover:bg-kozi-ink hover:text-kozi-yellow"
                }`}
                type="button"
              >
                {item}
              </button>
            )
          })}
        </div>
      </div>
    </header>
  )
}
