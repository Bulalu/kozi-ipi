import { defineSchema, defineTable } from "convex/server"
import { v } from "convex/values"

const confidenceLevel = v.union(v.literal("high"), v.literal("medium"), v.literal("low"))
const suitability = v.union(v.literal("yes"), v.literal("no"), v.literal("unknown"))
const logoStatus = v.union(
  v.literal("verified"),
  v.literal("missing"),
  v.literal("needs_review"),
)

export default defineSchema({
  institutions: defineTable({
    institutionName: v.string(),
    normalizedInstitutionName: v.string(),
    registrationNumber: v.optional(v.string()),
    registrationNumberAsShown: v.optional(v.string()),
    regulator: v.string(),
    accreditationStatus: v.optional(v.string()),
    ownershipType: v.string(),
    institutionType: v.string(),
    institutionCategory: v.optional(v.string()),
    region: v.optional(v.string()),
    districtOrCouncil: v.optional(v.string()),
    physicalLocation: v.optional(v.string()),
    mainlandOrZanzibar: v.optional(v.string()),
    website: v.optional(v.string()),
    logoUrl: v.optional(v.string()),
    logoSourceUrl: v.optional(v.string()),
    logoStatus: v.optional(logoStatus),
    logoVerifiedAt: v.optional(v.string()),
    phoneNumbers: v.optional(v.string()),
    email: v.optional(v.string()),
    applicationMethod: v.optional(v.string()),
    admissionsUrl: v.optional(v.string()),
    applicationUrl: v.optional(v.string()),
    hasFormFourDirectProgramme: suitability,
    programmeCount: v.optional(v.number()),
    awardLevels: v.optional(v.array(v.string())),
    fieldCategories: v.optional(v.array(v.string())),
    courseFamilies: v.optional(v.array(v.string())),
    browseSearchText: v.optional(v.string()),
    officialSourceUrl: v.string(),
    sourceType: v.string(),
    sourceDatasets: v.array(v.string()),
    confidenceLevel,
    lastVerifiedDate: v.string(),
    notes: v.optional(v.string()),
    needsReview: v.boolean(),
    reviewReasons: v.array(v.string()),
    searchText: v.string(),
  })
    .index("by_normalizedInstitutionName", ["normalizedInstitutionName"])
    .index("by_registrationNumber", ["registrationNumber"])
    .index("by_region", ["region"])
    .index("by_regulator", ["regulator"])
    .index("by_programmeCount", ["programmeCount"])
    .searchIndex("search_searchText", {
      searchField: "searchText",
      filterFields: [
        "region",
        "regulator",
        "ownershipType",
        "institutionType",
        "mainlandOrZanzibar",
        "confidenceLevel",
      ],
    }),

  programmes: defineTable({
    programmeName: v.string(),
    normalizedProgrammeName: v.string(),
    programmeCode: v.optional(v.string()),
    awardLevel: v.string(),
    qualificationLevel: v.optional(v.string()),
    pathwayType: v.optional(v.string()),
    fieldCategory: v.string(),
    courseFamily: v.optional(v.string()),
    institutionName: v.string(),
    normalizedInstitutionName: v.string(),
    institutionRegistrationNumber: v.optional(v.string()),
    regulator: v.string(),
    institutionType: v.optional(v.string()),
    ownershipType: v.optional(v.string()),
    region: v.optional(v.string()),
    districtOrCouncil: v.optional(v.string()),
    institutionLogoUrl: v.optional(v.string()),
    institutionLogoSourceUrl: v.optional(v.string()),
    institutionWebsite: v.optional(v.string()),
    minimumEntryRequirements: v.optional(v.string()),
    requiredSubjects: v.optional(v.string()),
    suitableForFormFourLeaver: suitability,
    acceptsFormSix: v.optional(suitability),
    acceptsCertificate: v.optional(suitability),
    acceptsDiploma: v.optional(suitability),
    acceptsEquivalent: v.optional(suitability),
    duration: v.optional(v.string()),
    feesIfAvailable: v.optional(v.string()),
    feeBand: v.optional(v.string()),
    studyMode: v.optional(v.string()),
    campusLocation: v.optional(v.string()),
    admissionCapacity: v.optional(v.string()),
    entryRouteTypes: v.optional(v.string()),
    acceptsFormFourDirect: suitability,
    accreditationStatusIfAvailable: v.optional(v.string()),
    applicationLink: v.optional(v.string()),
    officialSourceUrl: v.string(),
    sourceType: v.string(),
    sourceDatasets: v.array(v.string()),
    confidenceLevel,
    lastVerifiedDate: v.string(),
    notes: v.optional(v.string()),
    needsReview: v.boolean(),
    reviewReasons: v.array(v.string()),
    careerKeywords: v.array(v.string()),
    swahiliKeywords: v.array(v.string()),
    searchText: v.string(),
  })
    .index("by_normalizedInstitutionName", ["normalizedInstitutionName"])
    .index("by_region", ["region"])
    .index("by_fieldCategory", ["fieldCategory"])
    .index("by_suitableForFormFourLeaver", ["suitableForFormFourLeaver"])
    .index("by_acceptsFormFourDirect", ["acceptsFormFourDirect"])
    .index("by_acceptsFormSix", ["acceptsFormSix"])
    .index("by_acceptsCertificate", ["acceptsCertificate"])
    .index("by_acceptsDiploma", ["acceptsDiploma"])
    .index("by_acceptsEquivalent", ["acceptsEquivalent"])
    .searchIndex("search_searchText", {
      searchField: "searchText",
      filterFields: [
        "region",
        "awardLevel",
        "fieldCategory",
        "courseFamily",
        "regulator",
        "institutionType",
        "ownershipType",
        "suitableForFormFourLeaver",
        "acceptsFormFourDirect",
        "acceptsFormSix",
        "acceptsCertificate",
        "acceptsDiploma",
        "acceptsEquivalent",
        "confidenceLevel",
      ],
    }),

  entryRequirements: defineTable({
    programmeName: v.string(),
    normalizedProgrammeName: v.string(),
    institutionName: v.string(),
    normalizedInstitutionName: v.string(),
    rawRequirementText: v.string(),
    acceptsFormFourDirect: suitability,
    acceptsFormSix: suitability,
    acceptsCertificate: suitability,
    acceptsDiploma: suitability,
    acceptsEquivalent: suitability,
    minimumCseeDivisionIfAvailable: v.optional(v.string()),
    minimumAcseePrincipalPassesIfAvailable: v.optional(v.string()),
    minimumPointsIfAvailable: v.optional(v.string()),
    requiredSubjects: v.optional(v.string()),
    requiredSubjectGradesIfAvailable: v.optional(v.string()),
    requiredPriorFieldIfAvailable: v.optional(v.string()),
    bridgeOrFoundationRequired: suitability,
    eligibilityConfidence: confidenceLevel,
    officialSourceUrl: v.string(),
    notes: v.optional(v.string()),
    searchText: v.string(),
  })
    .index("by_normalizedInstitutionName", ["normalizedInstitutionName"])
    .index("by_normalizedProgrammeName_and_normalizedInstitutionName", [
      "normalizedProgrammeName",
      "normalizedInstitutionName",
    ])
    .index("by_acceptsFormFourDirect", ["acceptsFormFourDirect"])
    .index("by_acceptsFormSix", ["acceptsFormSix"])
    .index("by_acceptsCertificate", ["acceptsCertificate"])
    .index("by_acceptsDiploma", ["acceptsDiploma"])
    .searchIndex("search_searchText", {
      searchField: "searchText",
      filterFields: [
        "normalizedInstitutionName",
        "acceptsFormFourDirect",
        "acceptsFormSix",
        "acceptsCertificate",
        "acceptsDiploma",
        "acceptsEquivalent",
        "eligibilityConfidence",
      ],
    }),

  correctionSubmissions: defineTable({
    targetType: v.union(v.literal("institution"), v.literal("programme"), v.literal("general")),
    targetId: v.optional(v.string()),
    targetName: v.optional(v.string()),
    correctionType: v.string(),
    message: v.string(),
    sourceUrl: v.optional(v.string()),
    submitterName: v.optional(v.string()),
    submitterContact: v.optional(v.string()),
    status: v.union(
      v.literal("pending"),
      v.literal("approved"),
      v.literal("rejected"),
      v.literal("needs_more_info"),
    ),
  }).index("by_status", ["status"]),

  searchEvents: defineTable({
    query: v.string(),
    normalizedQuery: v.string(),
    detectedIntent: v.optional(v.string()),
    filtersJson: v.optional(v.string()),
    resultCount: v.number(),
    resultCountCapped: v.optional(v.boolean()),
    clickedResultId: v.optional(v.string()),
    languageMode: v.optional(v.string()),
    source: v.optional(v.string()),
    createdAt: v.optional(v.number()),
  })
    .index("by_createdAt", ["createdAt"])
    .index("by_normalizedQuery", ["normalizedQuery"]),
})
