import type { ReactNode } from "react"

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

export function SearchFilters({
  activeFilters,
  awardLevel,
  family,
  region,
  clearAllFilters,
  setFilter,
}: SearchFiltersProps) {
  return (
    <aside className="h-fit lg:sticky lg:top-6" aria-label="Search filters">
      <div className="rounded-2xl border border-brand-ink/10 bg-white">
        <div className="flex items-center justify-between border-b border-brand-ink/8 px-5 py-4">
          <p className="text-[13px] font-semibold tracking-tight">Filters</p>
          {activeFilters.length > 0 ? (
            <button
              aria-label="Clear all filters"
              className="text-[12px] font-medium text-brand-blue hover:underline"
              onClick={clearAllFilters}
              type="button"
            >
              Clear all
            </button>
          ) : null}
        </div>

        <FilterSection title="Field of study" hint="Eneo la masomo">
          <div className="grid grid-cols-2 gap-1.5" role="group" aria-label="Field of study options">
            {courseFamilies.map((courseFamily) => (
              <button
                aria-pressed={family === courseFamily.key}
                className={`flex items-center gap-2 rounded-lg border px-2.5 py-2 text-left text-[12.5px] transition ${
                  family === courseFamily.key
                    ? "border-brand-blue bg-brand-blue/5 text-brand-blue"
                    : "border-brand-ink/10 text-brand-ink/75 hover:border-brand-ink/25"
                }`}
                key={courseFamily.key}
                onClick={() =>
                  setFilter("family", family === courseFamily.key ? null : courseFamily.key)
                }
                type="button"
              >
                <span className="font-mono text-[13px] opacity-70">{courseFamily.mark}</span>
                <span className="truncate font-medium">{courseFamily.label}</span>
              </button>
            ))}
          </div>
        </FilterSection>

        <FilterSection title="Level" hint="Ngazi ya kozi">
          <div className="grid grid-cols-1 gap-1" role="group" aria-label="Award level options">
            {awardLevels.map((level) => (
              <button
                aria-pressed={awardLevel === level.value}
                className={`flex items-center justify-between rounded-lg px-3 py-2 text-left text-[13px] transition ${
                  awardLevel === level.value
                    ? "bg-brand-ink text-white"
                    : "text-brand-ink/75 hover:bg-brand-ink/5"
                }`}
                key={level.value}
                onClick={() => setFilter("level", level.value)}
                type="button"
              >
                <span className="font-medium">{level.label}</span>
                {level.duration ? (
                  <span
                    className={`text-[11px] ${
                      awardLevel === level.value ? "text-white/60" : "text-brand-ink/45"
                    }`}
                  >
                    {level.duration}
                  </span>
                ) : null}
              </button>
            ))}
          </div>
        </FilterSection>

        <FilterSection title="Region" hint="Mkoa" last>
          <select
            aria-label="Filter by region"
            className="h-10 w-full rounded-lg border border-brand-ink/15 bg-white px-3 text-[13px] outline-none transition focus:border-brand-blue"
            onChange={(event) => setFilter("region", event.target.value)}
            value={region}
          >
            <option value="">All</option>
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
    <div className={last ? "px-5 py-5" : "border-b border-brand-ink/8 px-5 py-5"}>
      <div className="mb-3 flex items-baseline justify-between">
        <p className="text-[13px] font-semibold tracking-tight">{title}</p>
        <p className="text-[11px] text-brand-ink/45">{hint}</p>
      </div>
      {children}
    </div>
  )
}
