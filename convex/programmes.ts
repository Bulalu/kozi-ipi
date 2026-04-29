import { paginationOptsValidator } from "convex/server"
import { v } from "convex/values"

import { query } from "./_generated/server"
import type { Doc } from "./_generated/dataModel"
import type { QueryCtx } from "./_generated/server"
import { formatProgrammeSearchResults } from "./programmeSearch/display"
import {
  filtersValidator,
  type ProgrammeFilters,
} from "./programmeSearch/filters"
import { interpretProgrammeQuery } from "./programmeSearch/interpret"
import { matchesProgrammeFilters } from "./programmeSearch/matching"
import { sliceSearchPage } from "./programmeSearch/pagination"
import { isNursingIntent, rankProgrammes } from "./programmeSearch/ranking"
import { queryProgrammesBySearchText } from "./programmeSearch/search"

const INSTITUTION_PROGRAMME_SCAN_LIMIT = 1000
const DEFAULT_RESULT_LIMIT = 25
const MAX_VISIBLE_RESULT_LIMIT = 200
const MAX_CANDIDATE_SCAN_LIMIT = 1000
const NURSING_CANDIDATE_SCAN_MINIMUM = 80
const ELIGIBILITY_BROWSE_SCAN_LIMIT = 1000

const applicationRoute = v.union(
  v.literal("form_four"),
  v.literal("form_six"),
  v.literal("certificate"),
  v.literal("diploma"),
  v.literal("equivalent")
)

const cseeDivision = v.union(
  v.literal("I"),
  v.literal("II"),
  v.literal("III"),
  v.literal("IV"),
  v.literal("0")
)
const acseeDivision = cseeDivision
const cseeGrade = v.union(
  v.literal("A"),
  v.literal("B"),
  v.literal("C"),
  v.literal("D"),
  v.literal("E"),
  v.literal("F")
)
const acseeGrade = v.union(
  v.literal("A"),
  v.literal("B"),
  v.literal("C"),
  v.literal("D"),
  v.literal("E"),
  v.literal("S"),
  v.literal("F")
)

const eligibilityProfileValidator = v.object({
  applicationRoute,
  csee: v.optional(
    v.object({
      division: v.optional(cseeDivision),
      subjects: v.array(
        v.object({
          subject: v.string(),
          grade: cseeGrade,
        })
      ),
    })
  ),
  acsee: v.optional(
    v.object({
      division: v.optional(acseeDivision),
      combination: v.optional(v.string()),
      subjects: v.array(
        v.object({
          subject: v.string(),
          grade: acseeGrade,
        })
      ),
    })
  ),
  certificate: v.optional(
    v.object({
      awardName: v.string(),
      field: v.optional(v.string()),
      ntaLevel: v.optional(v.string()),
      gpa: v.optional(v.number()),
    })
  ),
  diploma: v.optional(
    v.object({
      awardName: v.string(),
      field: v.optional(v.string()),
      ntaLevel: v.optional(v.string()),
      gpa: v.optional(v.number()),
    })
  ),
  equivalent: v.optional(
    v.object({
      description: v.string(),
    })
  ),
  preferences: v.optional(
    v.object({
      query: v.optional(v.string()),
      fieldCategory: v.optional(v.string()),
      region: v.optional(v.string()),
      awardLevel: v.optional(v.string()),
    })
  ),
})

type EligibilityProfile = {
  applicationRoute:
    | "form_four"
    | "form_six"
    | "certificate"
    | "diploma"
    | "equivalent"
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
    const limit = clampCount(
      args.limit,
      DEFAULT_RESULT_LIMIT,
      MAX_VISIBLE_RESULT_LIMIT
    )

    const results = await queryProgrammesBySearchText(
      ctx,
      text,
      args.filters,
      limit
    )

    return formatProgrammeSearchResults(results)
  },
})

export const smartSearch = query({
  args: {
    query: v.string(),
    filters: filtersValidator,
    formFourOnly: v.optional(v.boolean()),
    limit: v.optional(v.number()),
    maxCount: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const visibleLimit = clampCount(
      args.limit,
      DEFAULT_RESULT_LIMIT,
      MAX_VISIBLE_RESULT_LIMIT
    )
    const { interpreted, rankedResults, capped } =
      await getSmartSearchCandidates(ctx, {
        query: args.query,
        filters: args.filters,
        formFourOnly: args.formFourOnly,
        limit: visibleLimit,
        maxCount: args.maxCount,
      })
    const visibleResults = rankedResults.slice(0, visibleLimit)

    return {
      interpreted,
      results: formatProgrammeSearchResults(visibleResults),
      total: rankedResults.length,
      capped,
      hasMore: rankedResults.length > visibleResults.length,
    }
  },
})

export const smartSearchSummary = query({
  args: {
    query: v.string(),
    filters: filtersValidator,
    formFourOnly: v.optional(v.boolean()),
    maxCount: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { interpreted, rankedResults, capped } =
      await getSmartSearchCandidates(ctx, {
        query: args.query,
        filters: args.filters,
        formFourOnly: args.formFourOnly,
        maxCount: args.maxCount,
      })

    return {
      interpreted,
      total: rankedResults.length,
      capped,
    }
  },
})

export const smartSearchPaginated = query({
  args: {
    query: v.string(),
    filters: filtersValidator,
    formFourOnly: v.optional(v.boolean()),
    paginationOpts: paginationOptsValidator,
    maxCount: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const pageSize = clampCount(
      args.paginationOpts.numItems,
      DEFAULT_RESULT_LIMIT,
      MAX_VISIBLE_RESULT_LIMIT
    )
    const { rankedResults } = await getSmartSearchCandidates(ctx, {
      query: args.query,
      filters: args.filters,
      formFourOnly: args.formFourOnly,
      limit: pageSize,
      maxCount: args.maxCount,
    })
    const page = sliceSearchPage(rankedResults, {
      cursor: args.paginationOpts.cursor,
      pageSize,
    })

    return {
      page: formatProgrammeSearchResults(page.results),
      isDone: !page.hasMore,
      continueCursor: page.nextCursor ?? page.cursor ?? "",
    }
  },
})

export const eligibleSearchPaginated = query({
  args: {
    query: v.optional(v.string()),
    filters: filtersValidator,
    profile: eligibilityProfileValidator,
    paginationOpts: paginationOptsValidator,
    maxCount: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const text = args.query?.trim() ?? ""
    const pageSize = clampCount(
      args.paginationOpts.numItems,
      DEFAULT_RESULT_LIMIT,
      MAX_VISIBLE_RESULT_LIMIT
    )
    const requestedMaxCount = clampCount(
      args.maxCount,
      MAX_CANDIDATE_SCAN_LIMIT,
      MAX_CANDIDATE_SCAN_LIMIT
    )
    const candidateLimit = Math.min(
      Math.max(requestedMaxCount, pageSize),
      ELIGIBILITY_BROWSE_SCAN_LIMIT
    )
    const candidates = text
      ? (
          await getSmartSearchCandidates(ctx, {
            query: text,
            filters: args.filters,
            limit: pageSize,
            maxCount: candidateLimit,
          })
        ).rankedResults
      : await getRouteBrowseCandidates(ctx, {
          route: args.profile.applicationRoute,
          filters: args.filters,
          limit: candidateLimit,
        })

    const page = sliceSearchPage(candidates, {
      cursor: args.paginationOpts.cursor,
      pageSize,
    })
    const formattedPage = formatProgrammeSearchResults(page.results).map(
      (programme) => ({
        ...programme,
        eligibility: getRouteFlagEligibility(programme, args.profile),
      })
    )

    return {
      page: formattedPage,
      buckets: countEligibilityBuckets(candidates, args.profile),
      isDone: !page.hasMore,
      continueCursor: page.nextCursor ?? page.cursor ?? "",
    }
  },
})

async function getSmartSearchCandidates(
  ctx: QueryCtx,
  args: {
    query: string
    filters?: ProgrammeFilters
    formFourOnly?: boolean
    limit?: number
    maxCount?: number
  }
) {
  const interpreted = interpretProgrammeQuery(
    args.query,
    args.filters,
    args.formFourOnly
  )
  if (!interpreted.query) {
    return {
      interpreted,
      rankedResults: [] as Doc<"programmes">[],
      capped: false,
    }
  }

  const visibleLimit = clampCount(
    args.limit,
    DEFAULT_RESULT_LIMIT,
    MAX_VISIBLE_RESULT_LIMIT
  )
  const maxCount = Math.max(
    clampCount(
      args.maxCount,
      MAX_CANDIDATE_SCAN_LIMIT,
      MAX_CANDIDATE_SCAN_LIMIT
    ),
    visibleLimit
  )

  if (interpreted.appliedFilters.normalizedInstitutionName) {
    const candidateLimit = Math.min(
      Math.max(maxCount, visibleLimit),
      INSTITUTION_PROGRAMME_SCAN_LIMIT
    )
    const institutionResults = await ctx.db
      .query("programmes")
      .withIndex("by_normalizedInstitutionName", (q) =>
        q.eq(
          "normalizedInstitutionName",
          interpreted.appliedFilters.normalizedInstitutionName!
        )
      )
      .take(candidateLimit)
    const filteredResults = institutionResults.filter((programme) =>
      matchesProgrammeFilters(programme, interpreted.appliedFilters)
    )

    return {
      interpreted,
      rankedResults: rankProgrammes(filteredResults, interpreted.query),
      capped: institutionResults.length === candidateLimit,
    }
  }

  const candidateLimit = Math.min(
    Math.max(
      maxCount,
      visibleLimit,
      isNursingIntent(interpreted.query)
        ? NURSING_CANDIDATE_SCAN_MINIMUM
        : DEFAULT_RESULT_LIMIT
    ),
    MAX_CANDIDATE_SCAN_LIMIT
  )
  const searchResults = await queryProgrammesBySearchText(
    ctx,
    interpreted.query,
    interpreted.appliedFilters,
    candidateLimit
  )

  return {
    interpreted,
    rankedResults: rankProgrammes(searchResults, interpreted.query),
    capped: searchResults.length === candidateLimit,
  }
}

function clampCount(value: number | undefined, fallback: number, max: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback
  }

  return Math.min(Math.max(Math.trunc(value), 1), max)
}

async function getRouteBrowseCandidates(
  ctx: QueryCtx,
  args: {
    route: EligibilityProfile["applicationRoute"]
    filters?: ProgrammeFilters
    limit: number
  }
) {
  const routeResults = await queryProgrammesByRoute(ctx, args.route, args.limit)
  return routeResults.filter((programme) =>
    matchesProgrammeFilters(programme, args.filters ?? {})
  )
}

async function queryProgrammesByRoute(
  ctx: QueryCtx,
  route: EligibilityProfile["applicationRoute"],
  limit: number
) {
  if (route === "form_four") {
    return await ctx.db
      .query("programmes")
      .withIndex("by_acceptsFormFourDirect", (q) =>
        q.eq("acceptsFormFourDirect", "yes")
      )
      .take(limit)
  }
  if (route === "form_six") {
    return await ctx.db
      .query("programmes")
      .withIndex("by_acceptsFormSix", (q) => q.eq("acceptsFormSix", "yes"))
      .take(limit)
  }
  if (route === "certificate") {
    return await ctx.db
      .query("programmes")
      .withIndex("by_acceptsCertificate", (q) =>
        q.eq("acceptsCertificate", "yes")
      )
      .take(limit)
  }
  if (route === "diploma") {
    return await ctx.db
      .query("programmes")
      .withIndex("by_acceptsDiploma", (q) => q.eq("acceptsDiploma", "yes"))
      .take(limit)
  }

  return await ctx.db
    .query("programmes")
    .withIndex("by_acceptsEquivalent", (q) => q.eq("acceptsEquivalent", "yes"))
    .take(limit)
}

function getRouteFlagEligibility(
  programme: Doc<"programmes">,
  profile: EligibilityProfile
) {
  const routeFlag = getProgrammeRouteFlag(programme, profile.applicationRoute)

  if (routeFlag === "yes") {
    return {
      status: "likely_eligible_but_verify" as const,
      confidence: programme.confidenceLevel,
      matchedRoute: profile.applicationRoute,
      matchedClauses: [
        "This programme has an entry route matching the selected applicant pathway.",
      ],
      missingClauses: [],
      warnings: [
        "Full subject, GPA, and points rules are not evaluated until parsed requirement rules are available.",
      ],
      sourceUrl: programme.officialSourceUrl,
      rawRequirementText: programme.minimumEntryRequirements ?? "",
    }
  }

  if (routeFlag === "unknown") {
    return {
      status: "cannot_determine" as const,
      confidence: "low" as const,
      matchedRoute: profile.applicationRoute,
      matchedClauses: [],
      missingClauses: [],
      warnings: [
        "Available data does not clearly state whether this pathway is accepted.",
      ],
      sourceUrl: programme.officialSourceUrl,
      rawRequirementText: programme.minimumEntryRequirements ?? "",
    }
  }

  return {
    status: "interest_match_only" as const,
    confidence: programme.confidenceLevel,
    matchedRoute: profile.applicationRoute,
    matchedClauses: [],
    missingClauses: [],
    warnings: [
      "This result matches the search, but the selected applicant pathway is not marked as accepted.",
    ],
    sourceUrl: programme.officialSourceUrl,
    rawRequirementText: programme.minimumEntryRequirements ?? "",
  }
}

function getProgrammeRouteFlag(
  programme: Doc<"programmes">,
  route: EligibilityProfile["applicationRoute"]
) {
  if (route === "form_four") {
    return programme.acceptsFormFourDirect
  }
  if (route === "form_six") {
    return programme.acceptsFormSix ?? "unknown"
  }
  if (route === "certificate") {
    return programme.acceptsCertificate ?? "unknown"
  }
  if (route === "diploma") {
    return programme.acceptsDiploma ?? "unknown"
  }
  return programme.acceptsEquivalent ?? "unknown"
}

function countEligibilityBuckets(
  programmes: Doc<"programmes">[],
  profile: EligibilityProfile
) {
  const buckets = {
    eligible: 0,
    likelyEligibleButVerify: 0,
    cannotDetermine: 0,
    interestMatchOnly: 0,
    notEligible: 0,
  }

  for (const programme of programmes) {
    const status = getRouteFlagEligibility(programme, profile).status
    if (status === "likely_eligible_but_verify") {
      buckets.likelyEligibleButVerify += 1
    } else if (status === "cannot_determine") {
      buckets.cannotDetermine += 1
    } else if (status === "interest_match_only") {
      buckets.interestMatchOnly += 1
    } else {
      buckets.notEligible += 1
    }
  }

  return buckets
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
        q.eq("normalizedInstitutionName", args.normalizedInstitutionName)
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
