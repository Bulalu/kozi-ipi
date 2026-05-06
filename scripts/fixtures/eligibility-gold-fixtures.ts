import type {
  RequirementRuleSet,
  StudentEligibilityProfile,
} from "../../lib/eligibility/types"

export const formFourHospitalityProfile: StudentEligibilityProfile = {
  applicationRoute: "form_four",
  csee: {
    division: "III",
    subjects: [
      { subject: "English Language", grade: "C" },
      { subject: "Kiswahili", grade: "B" },
      { subject: "Basic Mathematics", grade: "D" },
      { subject: "Biology", grade: "D" },
      { subject: "Chemistry", grade: "E" },
    ],
  },
  preferences: {
    query: "hotel management",
    awardLevel: "ordinary diploma",
  },
}

export const formSixEngineeringProfile: StudentEligibilityProfile = {
  applicationRoute: "form_six",
  csee: {
    division: "II",
    subjects: [
      { subject: "Basic Mathematics", grade: "B" },
      { subject: "Chemistry", grade: "C" },
      { subject: "Physics", grade: "B" },
    ],
  },
  acsee: {
    division: "II",
    combination: "PCM",
    subjects: [
      { subject: "Advanced Mathematics", grade: "C" },
      { subject: "Physics", grade: "D" },
      { subject: "Chemistry", grade: "S" },
    ],
  },
  preferences: {
    query: "biomedical engineering",
    awardLevel: "degree",
  },
}

export const diplomaHealthProfile: StudentEligibilityProfile = {
  applicationRoute: "diploma",
  csee: {
    division: "III",
    subjects: [
      { subject: "Biology", grade: "C" },
      { subject: "Chemistry", grade: "D" },
      { subject: "Physics", grade: "D" },
      { subject: "English Language", grade: "C" },
    ],
  },
  diploma: {
    awardName: "Diploma in Clinical Medicine",
    field: "health",
    ntaLevel: "6",
    gpa: 3.2,
  },
  preferences: {
    query: "doctor of medicine",
    awardLevel: "degree",
  },
}

export const sampleRequirementRuleSets: RequirementRuleSet[] = [
  {
    programmeKey: "ordinary_diploma_hospitality_management",
    institutionKey: "sample_hospitality_college",
    confidence: "high",
    parseVersion: "gold-fixture-v1",
    sourceUrl: "https://example.test/source/hospitality",
    rawRequirementText:
      "CSEE with at least four passes in non-religious subjects.",
    variants: [
      {
        route: "form_four",
        parseStatus: "structured",
        clauses: [{ kind: "min_csee_passes", count: 4 }],
      },
    ],
  },
  {
    programmeKey: "bachelor_engineering",
    institutionKey: "sample_university",
    confidence: "high",
    parseVersion: "gold-fixture-v1",
    sourceUrl: "https://example.test/source/engineering",
    rawRequirementText:
      "Two principal passes in Advanced Mathematics and Physics. If Chemistry is not passed at A-Level, a credit in Chemistry at O-Level is required.",
    variants: [
      {
        route: "form_six",
        parseStatus: "structured",
        clauses: [
          { kind: "min_acsee_principal_passes", count: 2 },
          {
            kind: "subject_group",
            level: "acsee",
            mode: "all_of",
            subjects: ["advanced_mathematics", "physics"],
            minGrade: "D",
          },
          {
            kind: "o_level_subject_grade",
            subject: "chemistry",
            minGrade: "C",
          },
        ],
      },
    ],
  },
  {
    programmeKey: "bachelor_health_progression",
    institutionKey: "sample_health_university",
    confidence: "medium",
    parseVersion: "gold-fixture-v1",
    sourceUrl: "https://example.test/source/health",
    rawRequirementText:
      "Diploma in a related health field with minimum GPA of 3.0 or equivalent qualification.",
    variants: [
      {
        route: "diploma",
        parseStatus: "partial",
        clauses: [
          {
            kind: "prior_award",
            acceptedAwardLevels: ["diploma"],
            acceptedFields: ["health"],
            relatedFieldRequired: true,
            minGpa: 3,
          },
        ],
      },
      {
        route: "equivalent",
        parseStatus: "unparsed",
        clauses: [],
      },
    ],
  },
]

