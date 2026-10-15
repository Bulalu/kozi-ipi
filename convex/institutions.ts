import { paginationOptsValidator } from "convex/server"
import { v } from "convex/values"

import { matchesField, tanzaniaRegions } from "../lib/domain/taxonomy"
import { query } from "./_generated/server"
import type { Doc } from "./_generated/dataModel"

const confidenceLevel = v.union(v.literal("high"), v.literal("medium"), v.literal("low"))

const filtersValidator = v.optional(
  v.object({
    region: v.optional(v.string()),
    regulator: v.optional(v.string()),
    ownershipType: v.optional(v.string()),
    institutionType: v.optional(v.string()),
    mainlandOrZanzibar: v.optional(v.string()),
    confidenceLevel: v.optional(confidenceLevel),
  }),
)

const browseFiltersValidator = v.optional(
  v.object({
    query: v.optional(v.string()),
    types: v.optional(v.array(v.string())),
    region: v.optional(v.string()),
    ownership: v.optional(v.string()),
    awardLevels: v.optional(v.array(v.string())),
    field: v.optional(v.string()),
  }),
)

const fieldLabels: Record<string, string> = {
  accounting: "Accounting",
  agriculture: "Agriculture",
  arts: "Arts",
  business: "Business",
  "beauty/fashion": "Beauty/Fashion",
  "community development": "Community Development",
  construction: "Construction",
  education: "Education",
  electrical: "Electrical",
  engineering: "Engineering",
  health: "Health",
  hospitality: "Hospitality",
  ICT: "ICT",
  ict: "ICT",
  law: "Law",
  mechanical: "Mechanical",
  media: "Media",
  other: "General",
  procurement: "Procurement",
  "religious studies": "Religious Studies",
  "social work": "Social Work",
  tourism: "Tourism",
  tourism_hospitality: "Tourism",
  transport: "Transport",
}

const validRegions = new Set<string>(tanzaniaRegions)

const tones = ["blue", "green", "amber", "indigo", "red", "ink"] as const

type InstitutionType = "University" | "College" | "TVET"
type InstitutionOwnership = "Public" | "Private" | "Unknown"

// Helper to apply browse filters to a list of institutions
function applyBrowseFilters(
  institutions: ReturnType<typeof toBrowseInstitution>[],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  filters: any
) {
  const query = normalize(filters?.query)
  const types = new Set(filters?.types ?? [])
  const awardLevels = new Set(filters?.awardLevels ?? [])

  return institutions.filter((institution) => {
    if (types.size > 0 && !types.has(institution.type)) return false
    if (filters?.region && institution.region !== filters.region) return false
    if (filters?.ownership && institution.ownership !== filters.ownership) return false
    if (
      awardLevels.size > 0 &&
      !institution.awardLevels.some((award) => awardLevels.has(award))
    ) {
      return false
    }
    if (filters?.field && !fieldMatches(institution, filters.field)) return false
    if (!query) return true
    return institution.searchText.includes(query)
  })
}

export const listForBrowse = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = Math.min(args.limit ?? 1000, 1000)
    const institutions = await ctx.db
      .query("institutions")
      .withIndex("by_programmeCount")
      .order("desc")
      .take(limit)

    return institutions.map(toBrowseInstitution)
  },
})

export const browsePaginated = query({
  args: {
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    // True backend pagination: paginate directly from the index without memory filtering
    // This supports unlimited result sets as the dataset grows
    const result = await ctx.db
      .query("institutions")
      .withIndex("by_programmeCount")
      .order("desc")
      .paginate(args.paginationOpts)

    return {
      page: result.page.map(toBrowseInstitution),
      isDone: result.isDone,
      continueCursor: result.continueCursor,
    }
  },
})

export const browseSummary = query({
  args: {
    filters: browseFiltersValidator,
  },
  handler: async (ctx, args) => {
    // Fetch institutions for summary/facets only
    const allInstitutions = await ctx.db
      .query("institutions")
      .withIndex("by_programmeCount")
      .order("desc")
      .take(5000)

    const browseInstitutions = allInstitutions.map(toBrowseInstitution)
    const filtered = applyBrowseFilters(browseInstitutions, args.filters)

    return {
      regions: [
        ...new Set(
          filtered
            .map((institution) => institution.region)
            .filter(isValidRegion),
        ),
      ].sort(),
      typeCounts: countBy(filtered, (institution) => institution.type),
      ownershipCounts: countBy(filtered, (institution) => institution.ownership),
      awardLevelCounts: countByMany(filtered, (institution) => institution.awardLevels),
      total: filtered.length,
    }
  },
})

// Keep browse for backwards compatibility
export const browse = query({
  args: {
    filters: browseFiltersValidator,
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = Math.min(Math.max(args.limit ?? 80, 1), 240)
    const allInstitutions = await ctx.db
      .query("institutions")
      .withIndex("by_programmeCount")
      .order("desc")
      .take(1000)

    const browseInstitutions = allInstitutions.map(toBrowseInstitution)
    const filtered = applyBrowseFilters(browseInstitutions, args.filters)

    return {
      results: filtered.slice(0, limit),
      total: filtered.length,
      facets: {
        regions: [
          ...new Set(
            filtered
              .map((institution) => institution.region)
              .filter(isValidRegion),
          ),
        ].sort(),
        typeCounts: countBy(filtered, (institution) => institution.type),
        ownershipCounts: countBy(filtered, (institution) => institution.ownership),
        awardLevelCounts: countByMany(filtered, (institution) => institution.awardLevels),
      },
    }
  },
})

export const search = query({
  args: {
    query: v.string(),
    filters: filtersValidator,
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const text = args.query.trim()
    if (!text) {
      return []
    }

    return await ctx.db
      .query("institutions")
      .withSearchIndex("search_searchText", (q) => {
        let search = q.search("searchText", text)

        if (args.filters?.region) {
          search = search.eq("region", args.filters.region)
        }
        if (args.filters?.regulator) {
          search = search.eq("regulator", args.filters.regulator)
        }
        if (args.filters?.ownershipType) {
          search = search.eq("ownershipType", args.filters.ownershipType)
        }
        if (args.filters?.institutionType) {
          search = search.eq("institutionType", args.filters.institutionType)
        }
        if (args.filters?.mainlandOrZanzibar) {
          search = search.eq("mainlandOrZanzibar", args.filters.mainlandOrZanzibar)
        }
        if (args.filters?.confidenceLevel) {
          search = search.eq("confidenceLevel", args.filters.confidenceLevel)
        }

        return search
      })
      .take(args.limit ?? 25)
  },
})

function toBrowseInstitution(institution: Doc<"institutions">, index: number) {
  const fieldSlugs = [...new Set([
    ...(institution.fieldCategories ?? []),
    ...(institution.courseFamilies ?? []),
  ])]
  const fields = topLabels(fieldSlugs, 4)
  const type = normalizeInstitutionType(institution.institutionType)
  const ownership = normalizeOwnership(institution.ownershipType)
  const region = normalizeRegion(institution.region)
  const programmeCount = institution.programmeCount ?? 0

  return {
    id: institution._id,
    name: cleanDisplayText(institution.institutionName),
    normalizedName: institution.normalizedInstitutionName,
    short: abbreviation(cleanDisplayText(institution.institutionName)),
    type,
    accredited: institution.sourceType === "regulator" || institution.confidenceLevel === "high",
    region,
    ownership,
    blurb: institutionBlurb(type, region, programmeCount, cleanDisplayText(institution.regulator)),
    fields: fields.length > 0 ? fields : fallbackFields(institution),
    fieldSlugs: fieldSlugs.length > 0 ? fieldSlugs : fallbackFieldSlugs(institution),
    programmes: programmeCount,
    monogramTone: tones[index % tones.length],
    awardLevels: [
      ...new Set((institution.awardLevels ?? []).map(normalizeAwardLevel).filter(Boolean)),
    ],
    ...(institution.logoStatus === "verified" && institution.logoUrl
      ? { logoUrl: institution.logoUrl }
      : {}),
    searchText: [
      institution.institutionName,
      institution.normalizedInstitutionName,
      institution.regulator,
      institution.institutionType,
      institution.institutionCategory,
      institution.ownershipType,
      institution.region,
      institution.districtOrCouncil,
      institution.physicalLocation,
      institution.searchText,
      institution.browseSearchText,
      fields.join(" "),
      fieldSlugs.join(" "),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase(),
  }
}

function topLabels(values: string[], limit: number) {
  const labels = [...new Set(values)]
    .filter((value) => value && value.toLowerCase() !== "unknown")
    .map((value) => fieldLabels[value] ?? titleCase(value))

  return [...new Set(labels)].slice(0, limit)
}

function fallbackFields(institution: Doc<"institutions">) {
  const labels = fallbackFieldSlugs(institution)
    .map((value) => fieldLabels[value] ?? titleCase(value))

  return [...new Set(labels)].slice(0, 3)
}

function fallbackFieldSlugs(institution: Doc<"institutions">) {
  const text = `${institution.institutionType} ${institution.institutionCategory ?? ""}`.toLowerCase()
  const terms = [
    "agriculture",
    "business",
    "education",
    "engineering",
    "health",
    "ict",
    "law",
    "technical",
    "tourism",
  ]

  return terms.filter((term) => text.includes(term)).slice(0, 3)
}

function normalizeInstitutionType(rawValue?: string): InstitutionType {
  const value = normalize(rawValue)
  if (value.includes("university")) return "University"
  if (value.includes("vocational") || value.includes("technical")) return "TVET"
  return "College"
}

function normalizeOwnership(rawValue?: string): InstitutionOwnership {
  const value = normalize(rawValue)
  if (value === "public") return "Public"
  if (value === "private") return "Private"
  return "Unknown"
}

function normalizeAwardLevel(rawValue?: string) {
  const value = normalize(rawValue)
  if (!value || value === "unknown") return ""
  if (value.includes("degree")) return "Degree"
  if (value.includes("diploma")) return "Diploma"
  if (value.includes("certificate")) return "Certificate"
  if (value.includes("short")) return "Short Course"
  return titleCase(value)
}

function institutionBlurb(
  type: InstitutionType,
  region: string,
  programmeCount: number,
  regulator?: string,
) {
  const programmeText =
    programmeCount > 0 ? `${programmeCount}+ programmes` : "programmes pending verification"
  const regulatorText = regulator ? ` Source: ${regulator}.` : ""
  return `${type} in ${region} with ${programmeText}.${regulatorText}`
}

function abbreviation(name: string) {
  const parenthetical = name.match(/\(([A-Z][A-Z0-9-]{1,10})\)/)
  if (parenthetical) return parenthetical[1]

  const letters = name
    .replace(/[-–]/g, " ")
    .split(/\s+/)
    .filter((word) => /^[A-Za-z]/.test(word) && !["and", "of", "the", "in"].includes(word.toLowerCase()))
    .map((word) => word[0]?.toUpperCase())
    .join("")

  return letters.slice(0, 6) || "KI"
}

function normalize(value?: string) {
  return value?.trim().toLowerCase().replace(/\s+/g, " ") ?? ""
}

type BrowseInstitution = ReturnType<typeof toBrowseInstitution>

function fieldMatches(institution: BrowseInstitution, field: string) {
  const haystack = `${institution.fieldSlugs.join(" ")} ${institution.searchText}`.toLowerCase()

  return matchesField(haystack, field)
}

function countBy<T>(items: T[], getKey: (item: T) => string) {
  return items.reduce<Record<string, number>>((counts, item) => {
    const key = getKey(item)
    counts[key] = (counts[key] ?? 0) + 1
    return counts
  }, {})
}

function countByMany<T>(items: T[], getKeys: (item: T) => string[]) {
  return items.reduce<Record<string, number>>((counts, item) => {
    for (const key of getKeys(item)) {
      counts[key] = (counts[key] ?? 0) + 1
    }
    return counts
  }, {})
}

function cleanDisplayText(value?: string) {
  return (value ?? "")
    .replace(/\.{5,}\s*\d*/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function normalizeRegion(value?: string) {
  const region = cleanDisplayText(value)

  return isValidRegion(region) ? region : "Region not verified"
}

function isValidRegion(value?: string) {
  return Boolean(value && validRegions.has(value))
}

function titleCase(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase())
}

export const byNormalizedName = query({
  args: {
    normalizedInstitutionName: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("institutions")
      .withIndex("by_normalizedInstitutionName", (q) =>
        q.eq("normalizedInstitutionName", args.normalizedInstitutionName),
      )
      .unique()
  },
})

export const listByRegion = query({
  args: {
    region: v.string(),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("institutions")
      .withIndex("by_region", (q) => q.eq("region", args.region))
      .paginate(args.paginationOpts)
  },
})
