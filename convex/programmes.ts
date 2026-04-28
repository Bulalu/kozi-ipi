import { paginationOptsValidator } from "convex/server"
import { v } from "convex/values"

import { query } from "./_generated/server"
import type { Doc } from "./_generated/dataModel"
import type { QueryCtx } from "./_generated/server"

const suitability = v.union(v.literal("yes"), v.literal("no"), v.literal("unknown"))
const confidenceLevel = v.union(v.literal("high"), v.literal("medium"), v.literal("low"))
const INSTITUTION_PROGRAMME_SCAN_LIMIT = 1000

const filtersValidator = v.optional(
  v.object({
    region: v.optional(v.string()),
    awardLevel: v.optional(v.string()),
    fieldCategory: v.optional(v.string()),
    courseFamily: v.optional(v.string()),
    regulator: v.optional(v.string()),
    institutionType: v.optional(v.string()),
    ownershipType: v.optional(v.string()),
    normalizedInstitutionName: v.optional(v.string()),
    suitableForFormFourLeaver: v.optional(suitability),
    confidenceLevel: v.optional(confidenceLevel),
  }),
)

type ProgrammeFilters = {
  region?: string
  awardLevel?: string
  fieldCategory?: string
  courseFamily?: string
  regulator?: string
  institutionType?: string
  ownershipType?: string
  normalizedInstitutionName?: string
  suitableForFormFourLeaver?: "yes" | "no" | "unknown"
  confidenceLevel?: "high" | "medium" | "low"
}

async function attachInstitutionLogos(ctx: QueryCtx, results: Doc<"programmes">[]) {
  return await Promise.all(
    results.map(async (programme) => {
      const institution = await ctx.db
        .query("institutions")
        .withIndex("by_normalizedInstitutionName", (q) =>
          q.eq("normalizedInstitutionName", programme.normalizedInstitutionName),
        )
        .take(1)

      const institutionLogo = institution[0]?.logoStatus === "verified" ? institution[0] : undefined

      return {
        ...programme,
        programmeName: cleanProgrammeName(programme.programmeName),
        institutionName: cleanDisplayText(programme.institutionName),
        minimumEntryRequirements: cleanDisplayText(programme.minimumEntryRequirements),
        requiredSubjects: cleanDisplayText(programme.requiredSubjects),
        feesIfAvailable: cleanDisplayText(programme.feesIfAvailable),
        institutionLogoUrl: institutionLogo?.logoUrl,
        institutionLogoSourceUrl: institutionLogo?.logoSourceUrl,
        institutionWebsite: institution[0]?.website,
      }
    }),
  )
}

const courseFamilyIntents = [
  {
    courseFamily: "engineering",
    terms: ["engineering", "engineer", "civil", "mechanical", "electrical"],
  },
  {
    courseFamily: "health",
    terms: ["health", "afya", "nurse", "nursing", "nesi", "hospital", "medical", "clinical"],
  },
  {
    courseFamily: "ICT",
    terms: ["ict", "computer", "kompyuta", "software", "network", "technology"],
  },
  {
    courseFamily: "business",
    terms: ["business", "biashara", "accounting", "procurement", "office", "ofisini"],
  },
  {
    courseFamily: "education",
    terms: ["education", "teacher", "teaching", "ualimu", "mwalimu"],
  },
  {
    courseFamily: "tourism_hospitality",
    terms: ["hotel", "hospitality", "tourism", "utalii"],
  },
  {
    courseFamily: "agriculture",
    terms: ["agriculture", "kilimo"],
  },
]

const vagueIntentPattern = /\b(i want|want to|study|become|nataka|kuwa|kazi ya|courses? za)\b/i

function includesIntentTerm(query: string, term: string) {
  const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  return new RegExp(`(^|[^\\p{L}\\p{N}])${escapedTerm}($|[^\\p{L}\\p{N}])`, "iu").test(
    query,
  )
}

function interpretProgrammeQuery(query: string, filters?: ProgrammeFilters, formFourOnly?: boolean) {
  const trimmedQuery = query.trim()
  const normalizedQuery = trimmedQuery.toLowerCase()
  const matchedIntent = courseFamilyIntents
    .map((intent) => ({
      courseFamily: intent.courseFamily,
      term: intent.terms.find((term) => includesIntentTerm(normalizedQuery, term)),
    }))
    .find((intent) => intent.term)
  const inferredCourseFamily = matchedIntent?.courseFamily

  const appliedFilters: ProgrammeFilters = {
    ...filters,
    courseFamily: filters?.courseFamily ?? inferredCourseFamily,
    suitableForFormFourLeaver: formFourOnly
      ? "yes"
      : filters?.suitableForFormFourLeaver,
  }

  const shouldSimplifyQuery =
    matchedIntent?.term &&
    (normalizedQuery === matchedIntent.term || vagueIntentPattern.test(trimmedQuery))
  const rewrittenQuery = shouldSimplifyQuery ? (matchedIntent.term ?? trimmedQuery) : trimmedQuery

  return {
    query: rewrittenQuery,
    appliedFilters,
    inferredCourseFamily,
  }
}

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

    const results = await ctx.db
      .query("programmes")
      .withSearchIndex("search_searchText", (q) => {
        let search = q.search("searchText", text)

        if (args.filters?.region) {
          search = search.eq("region", args.filters.region)
        }
        if (args.filters?.awardLevel) {
          search = search.eq("awardLevel", args.filters.awardLevel)
        }
        if (args.filters?.fieldCategory) {
          search = search.eq("fieldCategory", args.filters.fieldCategory)
        }
        if (args.filters?.courseFamily) {
          search = search.eq("courseFamily", args.filters.courseFamily)
        }
        if (args.filters?.regulator) {
          search = search.eq("regulator", args.filters.regulator)
        }
        if (args.filters?.institutionType) {
          search = search.eq("institutionType", args.filters.institutionType)
        }
        if (args.filters?.ownershipType) {
          search = search.eq("ownershipType", args.filters.ownershipType)
        }
        if (args.filters?.suitableForFormFourLeaver) {
          search = search.eq(
            "suitableForFormFourLeaver",
            args.filters.suitableForFormFourLeaver,
          )
        }
        if (args.filters?.confidenceLevel) {
          search = search.eq("confidenceLevel", args.filters.confidenceLevel)
        }

        return search
      })
      .take(args.limit ?? 25)

    return await attachInstitutionLogos(ctx, results)
  },
})

export const smartSearch = query({
  args: {
    query: v.string(),
    filters: filtersValidator,
    formFourOnly: v.optional(v.boolean()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const interpreted = interpretProgrammeQuery(args.query, args.filters, args.formFourOnly)
    if (!interpreted.query) {
      return {
        interpreted,
        results: [],
      }
    }

    if (interpreted.appliedFilters.normalizedInstitutionName) {
      const institutionResults = await ctx.db
        .query("programmes")
        .withIndex("by_normalizedInstitutionName", (q) =>
          q.eq(
            "normalizedInstitutionName",
            interpreted.appliedFilters.normalizedInstitutionName!,
          ),
        )
        .take(INSTITUTION_PROGRAMME_SCAN_LIMIT)
      const filteredResults = institutionResults.filter((programme) =>
        matchesProgrammeFilters(programme, interpreted.appliedFilters),
      )

      return {
        interpreted,
        results: await attachInstitutionLogos(
          ctx,
          rankProgrammes(filteredResults, interpreted.query).slice(0, args.limit ?? 25),
        ),
      }
    }

    const searchLimit = Math.max(args.limit ?? 25, isNursingIntent(interpreted.query) ? 80 : 25)
    const results = await ctx.db
      .query("programmes")
      .withSearchIndex("search_searchText", (q) => {
        let search = q.search("searchText", interpreted.query)

        if (interpreted.appliedFilters.region) {
          search = search.eq("region", interpreted.appliedFilters.region)
        }
        if (interpreted.appliedFilters.awardLevel) {
          search = search.eq("awardLevel", interpreted.appliedFilters.awardLevel)
        }
        if (interpreted.appliedFilters.fieldCategory) {
          search = search.eq("fieldCategory", interpreted.appliedFilters.fieldCategory)
        }
        if (interpreted.appliedFilters.courseFamily) {
          search = search.eq("courseFamily", interpreted.appliedFilters.courseFamily)
        }
        if (interpreted.appliedFilters.regulator) {
          search = search.eq("regulator", interpreted.appliedFilters.regulator)
        }
        if (interpreted.appliedFilters.institutionType) {
          search = search.eq("institutionType", interpreted.appliedFilters.institutionType)
        }
        if (interpreted.appliedFilters.ownershipType) {
          search = search.eq("ownershipType", interpreted.appliedFilters.ownershipType)
        }
        if (interpreted.appliedFilters.suitableForFormFourLeaver) {
          search = search.eq(
            "suitableForFormFourLeaver",
            interpreted.appliedFilters.suitableForFormFourLeaver,
          )
        }
        if (interpreted.appliedFilters.confidenceLevel) {
          search = search.eq("confidenceLevel", interpreted.appliedFilters.confidenceLevel)
        }

        return search
      })
      .take(searchLimit)

    return {
      interpreted,
      results: await attachInstitutionLogos(
        ctx,
        rankProgrammes(results, interpreted.query).slice(0, args.limit ?? 25),
      ),
    }
  },
})

export const searchCount = query({
  args: {
    query: v.string(),
    filters: filtersValidator,
    maxCount: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const text = args.query.trim()
    if (!text) {
      return { count: 0, capped: false }
    }

    const maxCount = args.maxCount ?? 1000
    const results = await ctx.db
      .query("programmes")
      .withSearchIndex("search_searchText", (q) => {
        let search = q.search("searchText", text)

        if (args.filters?.region) {
          search = search.eq("region", args.filters.region)
        }
        if (args.filters?.awardLevel) {
          search = search.eq("awardLevel", args.filters.awardLevel)
        }
        if (args.filters?.fieldCategory) {
          search = search.eq("fieldCategory", args.filters.fieldCategory)
        }
        if (args.filters?.courseFamily) {
          search = search.eq("courseFamily", args.filters.courseFamily)
        }
        if (args.filters?.regulator) {
          search = search.eq("regulator", args.filters.regulator)
        }
        if (args.filters?.institutionType) {
          search = search.eq("institutionType", args.filters.institutionType)
        }
        if (args.filters?.ownershipType) {
          search = search.eq("ownershipType", args.filters.ownershipType)
        }
        if (args.filters?.suitableForFormFourLeaver) {
          search = search.eq(
            "suitableForFormFourLeaver",
            args.filters.suitableForFormFourLeaver,
          )
        }
        if (args.filters?.confidenceLevel) {
          search = search.eq("confidenceLevel", args.filters.confidenceLevel)
        }

        return search
      })
      .take(maxCount)

    return { count: results.length, capped: results.length === maxCount }
  },
})

export const smartSearchCount = query({
  args: {
    query: v.string(),
    filters: filtersValidator,
    formFourOnly: v.optional(v.boolean()),
    maxCount: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const interpreted = interpretProgrammeQuery(args.query, args.filters, args.formFourOnly)
    if (!interpreted.query) {
      return { interpreted, count: 0, capped: false }
    }

    const maxCount = args.maxCount ?? 1000
    if (interpreted.appliedFilters.normalizedInstitutionName) {
      const results = await ctx.db
        .query("programmes")
        .withIndex("by_normalizedInstitutionName", (q) =>
          q.eq(
            "normalizedInstitutionName",
            interpreted.appliedFilters.normalizedInstitutionName!,
          ),
        )
        .take(maxCount)
      const count = results.filter((programme) =>
        matchesProgrammeFilters(programme, interpreted.appliedFilters),
      ).length

      return {
        interpreted,
        count,
        capped: results.length === maxCount,
      }
    }

    const results = await ctx.db
      .query("programmes")
      .withSearchIndex("search_searchText", (q) => {
        let search = q.search("searchText", interpreted.query)

        if (interpreted.appliedFilters.region) {
          search = search.eq("region", interpreted.appliedFilters.region)
        }
        if (interpreted.appliedFilters.awardLevel) {
          search = search.eq("awardLevel", interpreted.appliedFilters.awardLevel)
        }
        if (interpreted.appliedFilters.fieldCategory) {
          search = search.eq("fieldCategory", interpreted.appliedFilters.fieldCategory)
        }
        if (interpreted.appliedFilters.courseFamily) {
          search = search.eq("courseFamily", interpreted.appliedFilters.courseFamily)
        }
        if (interpreted.appliedFilters.regulator) {
          search = search.eq("regulator", interpreted.appliedFilters.regulator)
        }
        if (interpreted.appliedFilters.institutionType) {
          search = search.eq("institutionType", interpreted.appliedFilters.institutionType)
        }
        if (interpreted.appliedFilters.ownershipType) {
          search = search.eq("ownershipType", interpreted.appliedFilters.ownershipType)
        }
        if (interpreted.appliedFilters.suitableForFormFourLeaver) {
          search = search.eq(
            "suitableForFormFourLeaver",
            interpreted.appliedFilters.suitableForFormFourLeaver,
          )
        }
        if (interpreted.appliedFilters.confidenceLevel) {
          search = search.eq("confidenceLevel", interpreted.appliedFilters.confidenceLevel)
        }

        return search
      })
      .take(maxCount)

    return {
      interpreted,
      count: results.length,
      capped: results.length === maxCount,
    }
  },
})

function matchesProgrammeFilters(programme: Doc<"programmes">, filters: ProgrammeFilters) {
  if (filters.region && programme.region !== filters.region) return false
  if (filters.awardLevel && programme.awardLevel !== filters.awardLevel) return false
  if (filters.fieldCategory && programme.fieldCategory !== filters.fieldCategory) return false
  if (filters.courseFamily && programme.courseFamily !== filters.courseFamily) return false
  if (filters.regulator && programme.regulator !== filters.regulator) return false
  if (filters.institutionType && programme.institutionType !== filters.institutionType) return false
  if (filters.ownershipType && programme.ownershipType !== filters.ownershipType) return false
  if (
    filters.suitableForFormFourLeaver &&
    programme.suitableForFormFourLeaver !== filters.suitableForFormFourLeaver
  ) {
    return false
  }
  if (filters.confidenceLevel && programme.confidenceLevel !== filters.confidenceLevel) {
    return false
  }

  return true
}

function rankProgrammes(results: Doc<"programmes">[], query: string) {
  const ranked = [...results].sort((left, right) => programmeScore(right, query) - programmeScore(left, query))
  const seen = new Set<string>()
  const deduped: Doc<"programmes">[] = []

  for (const programme of ranked) {
    const key = programmeIdentityKey(programme)
    if (seen.has(key)) continue
    seen.add(key)
    deduped.push(programme)
  }

  return deduped
}

function programmeScore(programme: Doc<"programmes">, query: string) {
  const normalizedQuery = query.toLowerCase().trim()
  const programmeName = programme.programmeName.toLowerCase()
  const normalizedProgrammeName = programme.normalizedProgrammeName.toLowerCase()
  const institutionName = programme.institutionName.toLowerCase()
  const code = programme.programmeCode?.toLowerCase()
  let score = 0

  if (code && normalizedQuery === code) score += 300
  if (programmeName === normalizedQuery || normalizedProgrammeName === normalizedQuery) score += 220
  if (programmeName.includes(normalizedQuery) || normalizedProgrammeName.includes(normalizedQuery)) {
    score += 140
  }
  for (const token of normalizedQuery.split(/\s+/).filter((part) => part.length > 2)) {
    if (programmeName.includes(token) || normalizedProgrammeName.includes(token)) score += 35
  }
  if (institutionName.includes(normalizedQuery)) score += 20
  if (programme.programmeCode) score += 12
  if (programme.sourceDatasets.includes("tcu_secondary_guidebook_pdf_extraction")) score += 10
  if (programme.sourceDatasets.includes("education_pathways")) score += 5
  if (isNursingIntent(query)) score += nursingScore(programme)

  return score
}

function programmeIdentityKey(programme: Doc<"programmes">) {
  return [
    programmeNameFingerprint(programme.programmeName),
    programme.normalizedInstitutionName,
    programme.awardLevel,
  ].join("|")
}

function programmeNameFingerprint(value: string) {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(
      /^(ordinary diploma|basic technician certificate|technician certificate|certificate|diploma|bachelor degree|bachelor|degree)\s+/,
      "",
    )
    .replace(/^(of|in)\s+/, "")
    .replace(/\s+in\s+/g, " ")
    .replace(/\s+and\s+/g, " ")
    .replace(/\s+with\s+/g, " ")
    .trim()
}

function isNursingIntent(query: string) {
  return /\b(nurse|nursing|nesi|midwife|midwifery)\b/i.test(query)
}

function nursingScore(programme: Doc<"programmes">) {
  const text = `${programme.programmeName} ${programme.careerKeywords.join(" ")} ${programme.swahiliKeywords.join(" ")}`.toLowerCase()
  let score = 0
  if (/\bnursing\b|\bnurse\b/.test(text)) score += 100
  if (/\bmidwife\b|\bmidwifery\b/.test(text)) score += 90
  if (/\bdoctor\b|\bmedicine\b|\bpharmacy\b/.test(text)) score -= 25
  return score
}

function cleanProgrammeName(value: string) {
  return cleanDisplayText(value)
    .replace(/\s+subjects?:.*$/i, "")
    .replace(/\s+\d+\s+\d+\s+duration\s*\(yrs\).*$/i, "")
    .trim()
}

function cleanDisplayText(value?: string) {
  return (value ?? "")
    .replace(/\.{5,}\s*\d*/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

export const byInstitution = query({
  args: {
    normalizedInstitutionName: v.string(),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("programmes")
      .withIndex("by_normalizedInstitutionName", (q) =>
        q.eq("normalizedInstitutionName", args.normalizedInstitutionName),
      )
      .paginate(args.paginationOpts)
  },
})

export const byId = query({
  args: {
    id: v.id("programmes"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id)
  },
})
