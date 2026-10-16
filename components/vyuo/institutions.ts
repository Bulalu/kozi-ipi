import { fieldFocus, matchesField, popularRegions } from "@/lib/domain/taxonomy"

export { fieldFocus, popularRegions }

export type InstitutionType = "University" | "College" | "TVET"
export type InstitutionOwnership = "Public" | "Private" | "Unknown"

type InstitutionSearchShape = {
  fieldSlugs: string[]
  searchText: string
}

export function fieldMatches(
  institution: InstitutionSearchShape,
  field: string
) {
  const haystack =
    `${institution.fieldSlugs.join(" ")} ${institution.searchText}`.toLowerCase()

  return matchesField(haystack, field)
}

// Campus photos we have on hand, keyed by normalizedInstitutionName.
// Everyone else gets a code tile on the card.
export const campusPhotos: Record<string, string> = {
  "dar es salaam": "/institution-campus/udsm.jpg",
  dodoma: "/institution-campus/udom.jpg",
  "mbeya science technology": "/institution-campus/must.jpg",
  "ardhi aru": "/institution-campus/ardhi.jpg",
  "st joseph tanzania engineering technology":
    "/institution-campus/st-joseph.jpg",
}
