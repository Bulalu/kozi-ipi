export type ManualReviewQueueKind =
  | "institution_identity"
  | "programme_offering_identity"
  | "applicant_pathway"
  | "source_extraction"
  | "data_completeness"
  | "general"

export type ManualReviewReason = {
  reason: string
  queue: ManualReviewQueueKind
}

export type ManualReviewRecord = {
  needsReview?: boolean
  reviewReasons?: readonly string[]
}

export function classifyManualReviewReason(reason: string): ManualReviewReason {
  if (/alias|identity|campus|institution/i.test(reason)) {
    return { reason, queue: "institution_identity" }
  }
  if (/programme.*(name|title)|title_leak|requirement_fragment/i.test(reason)) {
    return { reason, queue: "programme_offering_identity" }
  }
  if (/equivalent|pathway|route|accepts/i.test(reason)) {
    return { reason, queue: "applicant_pathway" }
  }
  if (/pdf|extraction|dotted_filler|parsed/i.test(reason)) {
    return { reason, queue: "source_extraction" }
  }
  if (/missing|unknown|confidence/i.test(reason)) {
    return { reason, queue: "data_completeness" }
  }
  return { reason, queue: "general" }
}

export function mergeReviewReasons(values: Array<string | undefined>) {
  return [
    ...new Set(
      values
        .flatMap((value) => value?.split(/[;,|]/) ?? [])
        .map((value) => value.trim())
        .filter(Boolean)
    ),
  ]
}

export function needsManualReview(reasons: readonly string[]) {
  return reasons.length > 0
}

export function summarizeManualReviewQueues(
  records: readonly ManualReviewRecord[]
) {
  const queues: Record<ManualReviewQueueKind, number> = {
    institution_identity: 0,
    programme_offering_identity: 0,
    applicant_pathway: 0,
    source_extraction: 0,
    data_completeness: 0,
    general: 0,
  }

  for (const record of records) {
    for (const reason of record.reviewReasons ?? []) {
      queues[classifyManualReviewReason(reason).queue] += 1
    }
  }

  return {
    needsReview: records.filter((record) => record.needsReview).length,
    queues,
  }
}
