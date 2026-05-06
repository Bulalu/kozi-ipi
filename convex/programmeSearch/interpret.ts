import { programmeIntentForQuery } from "../../lib/domain/search-vocabulary"

import type { ProgrammeFilters } from "./filters"

export function interpretProgrammeQuery(
  query: string,
  filters?: ProgrammeFilters,
  formFourOnly?: boolean
) {
  const intent = programmeIntentForQuery(query)

  const appliedFilters: ProgrammeFilters = {
    ...filters,
    courseFamily: filters?.courseFamily ?? intent.courseFamily,
    suitableForFormFourLeaver: formFourOnly
      ? "yes"
      : filters?.suitableForFormFourLeaver,
  }

  return {
    query: intent.rewrittenQuery,
    appliedFilters,
    inferredCourseFamily: intent.courseFamily,
  }
}
