export type Suitability = "yes" | "no" | "unknown"

export type ApplicationRoute =
  | "form_four"
  | "form_six"
  | "certificate"
  | "diploma"
  | "equivalent"

export type ApplicantPathwayFlagField =
  | "acceptsFormFourDirect"
  | "acceptsFormSix"
  | "acceptsCertificate"
  | "acceptsDiploma"
  | "acceptsEquivalent"

export type ApplicantPathway = {
  route: ApplicationRoute
  label: string
  shortLabel: string
  flagField: ApplicantPathwayFlagField
  fallbackRouteLabel: string
}

export const applicantPathways = [
  {
    route: "form_four",
    label: "Form Four",
    shortLabel: "CSEE",
    flagField: "acceptsFormFourDirect",
    fallbackRouteLabel: "CSEE",
  },
  {
    route: "form_six",
    label: "Form Six",
    shortLabel: "ACSEE",
    flagField: "acceptsFormSix",
    fallbackRouteLabel: "ACSEE",
  },
  {
    route: "certificate",
    label: "Certificate",
    shortLabel: "Certificate",
    flagField: "acceptsCertificate",
    fallbackRouteLabel: "Certificate",
  },
  {
    route: "diploma",
    label: "Diploma",
    shortLabel: "Diploma",
    flagField: "acceptsDiploma",
    fallbackRouteLabel: "Diploma",
  },
  {
    route: "equivalent",
    label: "Equivalent",
    shortLabel: "Equivalent",
    flagField: "acceptsEquivalent",
    fallbackRouteLabel: "Equivalent",
  },
] as const satisfies readonly ApplicantPathway[]

export const applicantPathwayRoutes = applicantPathways.map(
  (pathway) => pathway.route
) as ApplicationRoute[]

export const applicantPathwayFlagFields = applicantPathways.map(
  (pathway) => pathway.flagField
) as ApplicantPathwayFlagField[]

export type ApplicantPathwayFlagRecord = Partial<
  Record<ApplicantPathwayFlagField, Suitability>
>

export function applicantPathwayForRoute(route: ApplicationRoute) {
  return applicantPathways.find((pathway) => pathway.route === route)!
}

export function applicantPathwayFlagField(route: ApplicationRoute) {
  return applicantPathwayForRoute(route).flagField
}

export function applicantPathwayFlagValue(
  record: ApplicantPathwayFlagRecord,
  route: ApplicationRoute
): Suitability {
  return record[applicantPathwayFlagField(route)] ?? "unknown"
}

export function acceptedApplicantPathwayLabels(
  record: ApplicantPathwayFlagRecord
) {
  return applicantPathways
    .filter((pathway) => record[pathway.flagField] === "yes")
    .map((pathway) => pathway.fallbackRouteLabel)
}

export function summarizeApplicantPathwayCoverage(
  records: readonly ApplicantPathwayFlagRecord[]
) {
  return Object.fromEntries(
    applicantPathways.map((pathway) => [
      pathway.route,
      {
        yes: records.filter((record) => record[pathway.flagField] === "yes")
          .length,
        no: records.filter((record) => record[pathway.flagField] === "no")
          .length,
        unknown: records.filter(
          (record) =>
            applicantPathwayFlagValue(record, pathway.route) === "unknown"
        ).length,
      },
    ])
  ) as Record<
    ApplicationRoute,
    {
      no: number
      unknown: number
      yes: number
    }
  >
}
