import type { Doc } from "../_generated/dataModel"
import type { QueryCtx } from "../_generated/server"
import type { ProgrammeFilters } from "./filters"
import { interpretProgrammeQuery } from "./interpret"
import { matchesProgrammeFilters } from "./matching"
import { isNursingIntent, rankProgrammes } from "./ranking"
import { queryProgrammesBySearchText } from "./search"

const INSTITUTION_PROGRAMME_SCAN_LIMIT = 1000
const DEFAULT_RESULT_LIMIT = 25
const MAX_VISIBLE_RESULT_LIMIT = 200
const MAX_CANDIDATE_SCAN_LIMIT = 1000
const NURSING_CANDIDATE_SCAN_MINIMUM = 80

export function clampResultCount(
  value: number | undefined,
  fallback = DEFAULT_RESULT_LIMIT,
  max = MAX_VISIBLE_RESULT_LIMIT
) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback
  }

  return Math.min(Math.max(Math.trunc(value), 1), max)
}

export async function getSmartSearchCandidates(
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

  const visibleLimit = clampResultCount(args.limit)
  const maxCount = Math.max(
    clampResultCount(
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
