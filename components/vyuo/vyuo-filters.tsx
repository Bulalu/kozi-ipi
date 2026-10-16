"use client"

import { type ReactNode, useState } from "react"

import type {
  InstitutionOwnership,
  InstitutionType,
} from "@/components/vyuo/institutions"
import { fieldFocus } from "@/components/vyuo/institutions"
import { CheckIcon } from "@/components/vyuo/vyuo-icons"

const institutionTypes: Array<{ key: InstitutionType; label: string }> = [
  { key: "University", label: "Vyuo Vikuu" },
  { key: "College", label: "Colleges" },
  { key: "TVET", label: "TVET" },
]

const awardLevelOptions = ["Certificate", "Diploma", "Degree", "Short Course"]
const ownershipOptions: Array<{ key: InstitutionOwnership; label: string }> = [
  { key: "Public", label: "Serikali" },
  { key: "Private", label: "Binafsi" },
  { key: "Unknown", label: "Haijulikani" },
]

type VyuoFiltersProps = {
  awardLevels: Set<string>
  clearAll: () => void
  field: string
  hasFilters: boolean
  ownership: InstitutionOwnership | ""
  region: string
  regions: string[]
  setAwardLevels: (value: Set<string>) => void
  setField: (value: string) => void
  setOwnership: (value: InstitutionOwnership | "") => void
  setRegion: (value: string) => void
  setTypes: (value: Set<InstitutionType>) => void
  types: Set<InstitutionType>
  counts?: {
    typeCounts: Record<string, number>
    ownershipCounts: Record<string, number>
    awardLevelCounts: Record<string, number>
  }
}

const selectClass =
  "h-12 w-full cursor-pointer rounded-xl border-[2.5px] border-kozi-ink bg-white px-3 font-poster text-[15px] font-semibold text-kozi-ink outline-none focus-visible:ring-4 focus-visible:ring-kozi-yellow"

export function VyuoFilters({
  awardLevels,
  clearAll,
  field,
  hasFilters,
  ownership,
  region,
  regions,
  setAwardLevels,
  setField,
  setOwnership,
  setRegion,
  setTypes,
  types,
  counts,
}: VyuoFiltersProps) {
  // Collapsed by default on phones so the list isn't pushed below the fold.
  const [mobileOpen, setMobileOpen] = useState(false)
  const activeCount =
    types.size +
    awardLevels.size +
    (region ? 1 : 0) +
    (ownership ? 1 : 0) +
    (field ? 1 : 0)

  return (
    <aside
      className="flex h-fit min-w-0 flex-col gap-7 lg:sticky lg:top-6"
      aria-label="Vichujio vya vyuo"
    >
      <button
        aria-controls="vyuo-filter-panel"
        aria-expanded={mobileOpen}
        className="flex items-center justify-between rounded-2xl border-[3px] border-kozi-ink bg-white px-5 py-3.5 shadow-[4px_4px_0_var(--kozi-ink)] lg:hidden"
        onClick={() => setMobileOpen((open) => !open)}
        type="button"
      >
        <span className="font-display text-base text-kozi-ink">
          VICHUJIO{activeCount > 0 ? ` · ${activeCount}` : ""}
        </span>
        <span className="font-poster text-sm font-bold text-kozi-cobalt">
          {mobileOpen ? "Funga" : "Fungua"}
        </span>
      </button>

      <div
        id="vyuo-filter-panel"
        className={`${mobileOpen ? "flex" : "hidden"} flex-col gap-7 lg:flex`}
      >
        <div className="flex items-center justify-between">
          <p className="hidden font-display text-xl tracking-[-0.02em] text-kozi-ink lg:block">
            VICHUJIO
          </p>
          {hasFilters ? (
            <button
              onClick={clearAll}
              className="font-poster text-sm font-bold text-kozi-cobalt underline underline-offset-4"
              type="button"
            >
              Futa zote
            </button>
          ) : null}
        </div>

        <FilterBlock title="Aina ya taasisi">
          {institutionTypes.map((item) => (
            <CheckRow
              key={item.key}
              label={item.label}
              count={counts?.typeCounts[item.key]}
              checked={types.has(item.key)}
              onChange={() => setTypes(toggleSet(types, item.key))}
            />
          ))}
        </FilterBlock>

        <FilterBlock title="Umiliki">
          {ownershipOptions.map((item) => (
            <CheckRow
              key={item.key}
              label={item.label}
              count={counts?.ownershipCounts[item.key]}
              checked={ownership === item.key}
              onChange={() =>
                setOwnership(ownership === item.key ? "" : item.key)
              }
            />
          ))}
        </FilterBlock>

        <FilterBlock title="Ngazi za kozi">
          {awardLevelOptions.map((item) => (
            <CheckRow
              key={item}
              label={item}
              count={counts?.awardLevelCounts[item]}
              checked={awardLevels.has(item)}
              onChange={() => setAwardLevels(toggleSet(awardLevels, item))}
            />
          ))}
        </FilterBlock>

        <FilterBlock title="Mkoa">
          <select
            aria-label="Chagua mkoa"
            value={region}
            onChange={(event) => setRegion(event.target.value)}
            className={selectClass}
          >
            <option value="">Mikoa yote</option>
            {regions.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </FilterBlock>

        <FilterBlock title="Fani" last>
          <select
            aria-label="Chagua fani ya masomo"
            value={field}
            onChange={(event) => setField(event.target.value)}
            className={selectClass}
          >
            <option value="">Fani zote</option>
            {fieldFocus.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </FilterBlock>
      </div>
    </aside>
  )
}

function toggleSet<T>(current: Set<T>, key: T) {
  const next = new Set(current)
  if (next.has(key)) next.delete(key)
  else next.add(key)
  return next
}

function FilterBlock({
  children,
  last = false,
  title,
}: {
  children: ReactNode
  last?: boolean
  title: string
}) {
  return (
    <div
      className={`flex min-w-0 flex-col gap-2 ${
        last ? "" : "border-b-[3px] border-kozi-ink pb-7"
      }`}
    >
      <p className="pb-1.5 font-display text-[15px] tracking-[0.04em] text-kozi-ink uppercase">
        {title}
      </p>
      {children}
    </div>
  )
}

function CheckRow({
  checked,
  count,
  label,
  onChange,
}: {
  checked: boolean
  count?: number
  label: string
  onChange: () => void
}) {
  return (
    <label
      className={`flex cursor-pointer items-center gap-3 rounded-xl px-2 py-1.5 transition-colors ${
        checked ? "" : "hover:bg-kozi-yellow/40"
      }`}
    >
      <input
        type="checkbox"
        className="peer sr-only"
        checked={checked}
        onChange={onChange}
      />
      <span
        aria-hidden
        className={`grid size-6 shrink-0 place-items-center rounded-md border-[2.5px] border-kozi-ink peer-focus-visible:ring-4 peer-focus-visible:ring-kozi-yellow ${
          checked ? "bg-kozi-cobalt" : "bg-white"
        }`}
      >
        {checked ? <CheckIcon className="size-3.5 text-white" /> : null}
      </span>
      <span
        className={`min-w-0 flex-1 truncate font-poster text-base text-kozi-ink ${
          checked ? "font-bold" : "font-medium"
        }`}
      >
        {label}
      </span>
      {/* Counts only exist once a filter is applied; don't show fake zeros. */}
      {count !== undefined ? (
        <span className="w-9 shrink-0 text-right font-tag text-[13px] font-semibold text-kozi-graphite">
          {count}
        </span>
      ) : null}
    </label>
  )
}
