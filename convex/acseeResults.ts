import { paginationOptsValidator } from "convex/server"
import { v } from "convex/values"

import { query } from "./_generated/server"
import type { Doc } from "./_generated/dataModel"
import type { QueryCtx } from "./_generated/server"
import { queryProgrammesByApplicantPathway } from "./applicantPathways"
import { evaluateEligibilityPage } from "./programmeEligibility/search"
import {
  clampResultCount,
  getSmartSearchCandidates,
} from "./programmeSearch/candidates"
import {
  filtersValidator,
  type ProgrammeFilters,
} from "./programmeSearch/filters"
import { matchesProgrammeFilters } from "./programmeSearch/matching"
import { sliceSearchPage } from "./programmeSearch/pagination"
import {
  buildFormSixProfileFromAcseeResult,
  formatAcseeIndexNumber,
  isPlausibleAcseeIndexNumber,
  normalizeAcseeIndexNumber,
} from "../lib/necta/acsee"
import type { StudentEligibilityProfile } from "../lib/eligibility"

const DEFAULT_PAGE_SIZE = 12
const MAX_VISIBLE_RESULT_LIMIT = 80
const MAX_CANDIDATE_SCAN_LIMIT = 1000
const EXAM_YEAR = 2026

export const lookup = query({
  args: {
    indexNumber: v.string(),
  },
  handler: async (ctx, args) => {
    const normalizedIndexNumber = normalizeAcseeIndexNumber(args.indexNumber)
    if (!isPlausibleAcseeIndexNumber(normalizedIndexNumber)) {
      return {
        status: "invalid_index" as const,
        result: null,
        profile: null,
      }
    }

    const result = await lookupAcseeResult(ctx, normalizedIndexNumber)
    if (!result) {
      return {
        status: "not_found" as const,
        result: null,
        profile: null,
      }
    }

    return {
      status:
        result.resultStatus === "released"
          ? ("found" as const)
          : ("not_released" as const),
      result: formatAcseeResult(result),
      profile: buildProfile(result),
    }
  },
})

export const eligibleByIndexPaginated = query({
  args: {
    indexNumber: v.string(),
    query: v.optional(v.string()),
    filters: filtersValidator,
    paginationOpts: paginationOptsValidator,
    maxCount: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const pageSize = clampResultCount(
      args.paginationOpts.numItems,
      DEFAULT_PAGE_SIZE,
      MAX_VISIBLE_RESULT_LIMIT
    )
    const normalizedIndexNumber = normalizeAcseeIndexNumber(args.indexNumber)

    if (!isPlausibleAcseeIndexNumber(normalizedIndexNumber)) {
      return emptyEligibilityResponse({
        status: "invalid_index",
      })
    }

    const result = await lookupAcseeResult(ctx, normalizedIndexNumber)
    if (!result) {
      return emptyEligibilityResponse({
        status: "not_found",
      })
    }

    const profile = buildProfile(result)
    if (!profile) {
      return emptyEligibilityResponse({
        status: "not_released",
        result,
      })
    }

    const requestedMaxCount = clampResultCount(
      args.maxCount,
      MAX_CANDIDATE_SCAN_LIMIT,
      MAX_CANDIDATE_SCAN_LIMIT
    )
    const candidateLimit = Math.min(
      Math.max(requestedMaxCount, pageSize),
      MAX_CANDIDATE_SCAN_LIMIT
    )
    const text = args.query?.trim() ?? ""
    const candidates = text
      ? (
          await getSmartSearchCandidates(ctx, {
            query: text,
            filters: args.filters,
            limit: pageSize,
            maxCount: candidateLimit,
          })
        ).rankedResults
      : await getFormSixBrowseCandidates(ctx, {
          filters: args.filters,
          limit: candidateLimit,
        })
    const slicedPage = sliceSearchPage(candidates, {
      cursor: args.paginationOpts.cursor,
      pageSize,
    })
    const evaluated = await evaluateEligibilityPage(ctx, {
      programmes: slicedPage.results,
      profile,
    })

    return {
      status: "found" as const,
      result: formatAcseeResult(result),
      profile,
      page: evaluated.page,
      buckets: evaluated.buckets,
      isDone: !slicedPage.hasMore,
      continueCursor: slicedPage.nextCursor ?? slicedPage.cursor ?? "",
    }
  },
})

async function lookupAcseeResult(
  ctx: QueryCtx,
  normalizedIndexNumber: string
) {
  const matches = await ctx.db
    .query("acseeResults")
    .withIndex("by_examYear_and_normalizedIndexNumber", (q) =>
      q
        .eq("examYear", EXAM_YEAR)
        .eq("normalizedIndexNumber", normalizedIndexNumber)
    )
    .take(2)

  return matches[0] ?? null
}

async function getFormSixBrowseCandidates(
  ctx: QueryCtx,
  args: {
    filters?: ProgrammeFilters
    limit: number
  }
) {
  const routeResults = await queryProgrammesByApplicantPathway(
    ctx,
    "form_six",
    args.limit
  )

  return routeResults.filter((programme) =>
    matchesProgrammeFilters(programme, args.filters ?? {})
  )
}

function buildProfile(
  result: Doc<"acseeResults">
): StudentEligibilityProfile | null {
  if (result.resultStatus !== "released") {
    return null
  }

  return buildFormSixProfileFromAcseeResult({
    division: result.division,
    subjects: result.subjects,
  })
}

function formatAcseeResult(result: Doc<"acseeResults">) {
  return {
    _id: result._id,
    indexNumber: result.indexNumber,
    formattedIndexNumber: formatAcseeIndexNumber(result.indexNumber),
    centreCode: result.centreCode,
    centreName: result.centreName,
    centreType: result.centreType,
    sex: result.sex,
    aggregate: result.aggregate,
    aggregatePoints: result.aggregatePoints,
    division: result.division,
    resultStatus: result.resultStatus,
    subjects: result.subjects,
    subjectSummary: result.subjectSummary,
    sourceUrl: result.sourceUrl,
    fetchedAt: result.fetchedAt,
  }
}

function emptyEligibilityResponse({
  result,
  status,
}: {
  result?: Doc<"acseeResults">
  status: "invalid_index" | "not_found" | "not_released"
}) {
  return {
    status,
    result: result ? formatAcseeResult(result) : null,
    profile: null,
    page: [],
    buckets: {
      eligible: 0,
      likely_eligible_but_verify: 0,
      cannot_determine: 0,
      interest_match_only: 0,
      not_eligible: 0,
    },
    isDone: true,
    continueCursor: "",
  }
}
