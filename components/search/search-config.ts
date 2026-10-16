import {
  awardLevels,
  courseFamilies,
  fieldCategoryLabel,
  searchRegions as regions,
  trendingQueries,
} from "@/lib/domain/taxonomy"

export {
  awardLevels,
  courseFamilies,
  fieldCategoryLabel,
  regions,
  trendingQueries,
}

export type SearchFilterKey = "family" | "level" | "region" | "institution"

export type ActiveFilter = {
  key: string
  label: string
  clear: () => void
}

const familyLabels = Object.fromEntries(courseFamilies.map((family) => [family.key, family.label]))

export function getInitialQuery(searchParams: URLSearchParams) {
  const query = searchParams.get("q")?.trim()
  const family = searchParams.get("family")?.trim()

  if (query) {
    return query
  }

  if (family) {
    return familyLabels[family] ?? family
  }

  return "clinical medicine"
}

export function updateParams(
  searchParams: URLSearchParams,
  updates: Record<string, string | null>,
) {
  const nextParams = new URLSearchParams(searchParams.toString())

  for (const [key, value] of Object.entries(updates)) {
    if (!value || value === "all" || value === "false") {
      nextParams.delete(key)
    } else {
      nextParams.set(key, value)
    }
  }

  return nextParams
}

export function familyMeta(key?: string) {
  return courseFamilies.find((family) => family.key === key) ?? {
    key: key ?? "other",
    label: key ?? "Other",
    swahili: "",
    mark: "•",
  }
}

export function isActiveFilter(
  filter: ActiveFilter | false | "" | undefined,
): filter is ActiveFilter {
  return Boolean(filter)
}
