import { paginationOptsValidator } from "convex/server"
import { v } from "convex/values"

import { query } from "./_generated/server"
import type { QueryCtx } from "./_generated/server"
import type { StudentEligibilityProfile } from "../lib/eligibility"
import {
  applicationRouteValidator,
  queryProgrammesByApplicantPathway,
  type ApplicationRoute,
} from "./applicantPathways"
import { evaluateEligibilityPage } from "./programmeEligibility/search"
import { formatProgrammeSearchResults } from "./programmeSearch/display"
import {
  filtersValidator,
  type ProgrammeFilters,
} from "./programmeSearch/filters"
import {
  clampResultCount,
  getSmartSearchCandidates,
} from "./programmeSearch/candidates"
import { matchesProgrammeFilters } from "./programmeSearch/matching"
import { sliceSearchPage } from "./programmeSearch/pagination"
import { queryProgrammesBySearchText } from "./programmeSearch/search"

const DEFAULT_RESULT_LIMIT = 25
const MAX_VISIBLE_RESULT_LIMIT = 200
const MAX_CANDIDATE_SCAN_LIMIT = 1000
const ELIGIBILITY_BROWSE_SCAN_LIMIT = 1000

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
  applicationRoute: applicationRouteValidator,
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
  applicationRoute: ApplicationRoute
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
    const limit = clampResultCount(
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
    const visibleLimit = clampResultCount(
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
    const pageSize = clampResultCount(
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
    const pageSize = clampResultCount(
      args.paginationOpts.numItems,
      DEFAULT_RESULT_LIMIT,
      MAX_VISIBLE_RESULT_LIMIT
    )
    const requestedMaxCount = clampResultCount(
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
    const evaluated = await evaluateEligibilityPage(ctx, {
      programmes: page.results,
      profile: args.profile as StudentEligibilityProfile,
    })

    return {
      page: evaluated.page,
      buckets: evaluated.buckets,
      isDone: !page.hasMore,
      continueCursor: page.nextCursor ?? page.cursor ?? "",
    }
  },
})

async function getRouteBrowseCandidates(
  ctx: QueryCtx,
  args: {
    route: EligibilityProfile["applicationRoute"]
    filters?: ProgrammeFilters
    limit: number
  }
) {
  const routeResults = await queryProgrammesByApplicantPathway(
    ctx,
    args.route,
    args.limit
  )
  return routeResults.filter((programme) =>
    matchesProgrammeFilters(programme, args.filters ?? {})
  )
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
