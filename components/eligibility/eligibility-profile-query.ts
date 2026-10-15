import {
  acseeCombinationSearchSeed,
  acseeCombinationSearchSeeds,
  inferAcseeCombinationSearchQuery,
} from "@/lib/domain/search-vocabulary"
import type { AcseeGrade } from "@/lib/eligibility"
import type { ApplicationRoute } from "@/lib/domain/applicant-pathways"

export type EligibilitySubjectGrade = {
  subject: string
  grade: AcseeGrade
}

export function buildSubjectsForCombination(
  code: string
): EligibilitySubjectGrade[] {
  const selectedCombination =
    acseeCombinationSearchSeed(code) ?? acseeCombinationSearchSeeds[0]

  return selectedCombination.subjects.map((subject) => ({
    subject,
    grade: "D",
  }))
}

export function findAcseeCombination(code: string) {
  return acseeCombinationSearchSeed(code)
}

export function resolveEligibilityQuery({
  certificateAwardName,
  certificateField,
  combination,
  diplomaAwardName,
  diplomaField,
  equivalentDescription,
  route,
  subjects,
}: {
  certificateAwardName: string
  certificateField: string
  combination: string
  diplomaAwardName: string
  diplomaField: string
  equivalentDescription: string
  route: ApplicationRoute
  subjects: readonly { subject: string }[]
}) {
  if (route === "form_four") {
    return ""
  }

  if (route === "certificate") {
    return [certificateAwardName, certificateField]
      .map((value) => value.trim())
      .filter(Boolean)
      .join(" ")
  }

  if (route === "diploma") {
    return [diplomaAwardName, diplomaField]
      .map((value) => value.trim())
      .filter(Boolean)
      .join(" ")
  }

  if (route === "equivalent") {
    return equivalentDescription.trim()
  }

  return inferFormSixQuery(combination, subjects)
}

export function resolveEligibilityBasis({
  certificateAwardName,
  certificateField,
  combination,
  diplomaAwardName,
  diplomaField,
  equivalentDescription,
  route,
  subjects,
}: {
  certificateAwardName: string
  certificateField: string
  combination: string
  diplomaAwardName: string
  diplomaField: string
  equivalentDescription: string
  route: ApplicationRoute
  subjects: readonly { subject: string }[]
}) {
  if (route === "form_four") {
    return "Form Four · CSEE"
  }

  if (route === "certificate") {
    return [certificateAwardName, certificateField]
      .map((value) => value.trim())
      .filter(Boolean)
      .join(" · ")
  }

  if (route === "diploma") {
    return [diplomaAwardName, diplomaField]
      .map((value) => value.trim())
      .filter(Boolean)
      .join(" · ")
  }

  if (route === "equivalent") {
    return equivalentDescription.trim()
  }

  const selectedCombination = findAcseeCombination(combination)
  if (selectedCombination) {
    return `${selectedCombination.code} · ${selectedCombination.label}`
  }

  return subjects
    .map((subject) => subject.subject.trim())
    .filter(Boolean)
    .join(", ")
}

function inferFormSixQuery(
  combination: string,
  subjects: readonly { subject: string }[]
): string {
  return inferAcseeCombinationSearchQuery({
    combination,
    subjects: subjects.map((subject) => subject.subject),
  })
}
