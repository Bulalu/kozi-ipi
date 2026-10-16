"use client"

import { type ReactNode, useState } from "react"

import {
  type ActiveFilter,
  type SearchFilterKey,
  awardLevels,
  courseFamilies,
  regions,
} from "@/components/search/search-config"

type SearchFiltersProps = {
  activeFilters: ActiveFilter[]
  awardLevel: string
  family?: string
  region: string
  clearAllFilters: () => void
  setFilter: (key: SearchFilterKey, value: string | null) => void
}

const chip =
  "rounded-full border-2 border-kozi-ink px-3.5 py-2 font-poster text-sm font-bold transition-colors"
const chipOn = "bg-kozi-ink text-kozi-yellow"
const chipOff = "bg-white text-kozi-ink hover:bg-kozi-yellow"

export function SearchFilters({
  activeFilters,
  awardLevel,
  family,
  region,
  clearAllFilters,
  setFilter,
}: SearchFiltersProps) {
  // Collapsed by default on phones so results aren't pushed below the fold.
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <aside
      className="flex h-fit flex-col gap-7 lg:sticky lg:top-6"
      aria-label="Search filters"
    >
      <button
        aria-controls="search-filter-panel"
        aria-expanded={mobileOpen}
        className="flex items-center justify-between rounded-2xl border-[3px] border-kozi-ink bg-white px-5 py-3.5 shadow-[4px_4px_0_var(--kozi-ink)] lg:hidden"
        onClick={() => setMobileOpen((open) => !open)}
        type="button"
      >
        <span className="font-display text-base text-kozi-ink">
          VICHUJIO
          {activeFilters.length > 0 ? ` · ${activeFilters.length}` : ""}
        </span>
        <span className="font-poster text-sm font-bold text-kozi-cobalt">
          {mobileOpen ? "Funga" : "Fungua"}
        </span>
      </button>

      <div
        id="search-filter-panel"
        className={`${mobileOpen ? "flex" : "hidden"} flex-col gap-7 lg:flex`}
      >
        <div className="flex items-center justify-between">
          <p className="hidden font-display text-xl tracking-[-0.02em] text-kozi-ink lg:block">
            VICHUJIO
          </p>
          {activeFilters.length > 0 ? (
            <button
              aria-label="Clear all filters"
              className="font-poster text-sm font-bold text-kozi-cobalt underline underline-offset-4"
              onClick={clearAllFilters}
              type="button"
            >
              Futa zote
            </button>
          ) : null}
        </div>

        <FilterSection title="Fani" hint="Field of study">
          <div
            className="flex flex-wrap gap-2"
            role="group"
            aria-label="Field of study options"
          >
            {courseFamilies.map((courseFamily) => {
              const selected = family === courseFamily.key
              return (
                <button
                  aria-pressed={selected}
                  className={`${chip} ${selected ? chipOn : chipOff}`}
                  key={courseFamily.key}
                  onClick={() =>
                    setFilter("family", selected ? null : courseFamily.key)
                  }
                  type="button"
                >
                  {courseFamily.label}
                </button>
              )
            })}
          </div>
        </FilterSection>

        <FilterSection title="Ngazi" hint="Level">
          <div
            className="flex flex-col gap-1.5"
            role="group"
            aria-label="Award level options"
          >
            {awardLevels.map((level) => {
              const selected = awardLevel === level.value
              return (
                <button
                  aria-pressed={selected}
                  className={`flex items-center gap-3 rounded-xl px-2 py-2 text-left font-poster transition-colors ${
                    selected ? "" : "hover:bg-kozi-yellow/40"
                  }`}
                  key={level.value}
                  onClick={() => setFilter("level", level.value)}
                  type="button"
                >
                  <span
                    aria-hidden
                    className={`grid size-6 shrink-0 place-items-center rounded-full border-[2.5px] border-kozi-ink ${
                      selected ? "bg-kozi-cobalt" : "bg-white"
                    }`}
                  >
                    {selected ? (
                      <span className="size-2 rounded-full bg-white" />
                    ) : null}
                  </span>
                  <span
                    className={`flex-1 text-base text-kozi-ink ${
                      selected ? "font-bold" : "font-medium"
                    }`}
                  >
                    {level.label}
                  </span>
                  {level.duration ? (
                    <span className="font-tag text-xs font-semibold text-kozi-graphite">
                      {level.duration}
                    </span>
                  ) : null}
                </button>
              )
            })}
          </div>
        </FilterSection>

        <FilterSection title="Mkoa" hint="Region" last>
          <select
            aria-label="Filter by region"
            className="h-12 w-full cursor-pointer rounded-xl border-[2.5px] border-kozi-ink bg-white px-3 font-poster text-[15px] font-semibold text-kozi-ink outline-none focus-visible:ring-4 focus-visible:ring-kozi-yellow"
            onChange={(event) => setFilter("region", event.target.value)}
            value={region}
          >
            <option value="">Mikoa yote</option>
            {regions.map((regionName) => (
              <option key={regionName} value={regionName}>
                {regionName}
              </option>
            ))}
          </select>
        </FilterSection>
      </div>
    </aside>
  )
}

function FilterSection({
  title,
  hint,
  last = false,
  children,
}: {
  title: string
  hint: string
  last?: boolean
  children: ReactNode
}) {
  return (
    <div
      className={`flex flex-col gap-3.5 ${
        last ? "" : "border-b-[3px] border-kozi-ink pb-7"
      }`}
    >
      <div className="flex items-baseline justify-between">
        <p className="font-display text-[15px] tracking-[0.04em] text-kozi-ink uppercase">
          {title}
        </p>
        <p className="font-tag text-[11px] text-kozi-graphite">{hint}</p>
      </div>
      {children}
    </div>
  )
}
