import assert from "node:assert/strict"

import {
  calculateAcseePoints,
  countAcseePrincipalPasses,
  countAcseeSubsidiaryPasses,
  countCseePasses,
  evaluateRequirementRuleSet,
  normalizeStudentProfile,
  normalizeSubjectName,
  parseRequirementRuleSet,
  summarizeEligibilityEvaluation,
} from "../lib/eligibility"
import {
  diplomaHealthProfile,
  formFourHospitalityProfile,
  formSixEngineeringProfile,
  sampleRequirementRuleSets,
} from "./fixtures/eligibility-gold-fixtures"

assert.equal(
  normalizeSubjectName("Basic Mathematics"),
  "mathematics",
  "Basic Mathematics should normalize to mathematics."
)
assert.equal(
  normalizeSubjectName("Advanced Mathematics"),
  "advanced_mathematics",
  "Advanced Mathematics should stay distinct from O-Level Mathematics."
)
assert.equal(
  normalizeSubjectName("English Language"),
  "english",
  "English Language should normalize to english."
)
assert.equal(
  normalizeSubjectName("Food & Nutrition"),
  "nutrition",
  "Food & Nutrition should normalize to nutrition."
)
assert.equal(
  normalizeSubjectName("Computer Studies"),
  "computer_science",
  "Computer Studies should normalize to computer_science."
)

assert.equal(
  countCseePasses(["A", "B", "C", "D", "E", "F"]),
  4,
  "CSEE pass count should treat A-D as passes."
)
assert.equal(
  countAcseePrincipalPasses(["A", "E", "S", "F"]),
  2,
  "ACSEE principal pass count should treat A-E as principal passes."
)
assert.equal(
  countAcseeSubsidiaryPasses(["A", "E", "S", "F"]),
  1,
  "ACSEE subsidiary pass count should count S grades separately."
)
assert.equal(
  calculateAcseePoints(["A", "B", "C", "D", "E", "S", "F"]),
  15.5,
  "ACSEE points should follow the 5,4,3,2,1,0.5,0 scale."
)

const normalizedFormFourProfile = normalizeStudentProfile(
  formFourHospitalityProfile
)
assert.equal(
  normalizedFormFourProfile.cseeSummary?.division,
  "III",
  "CSEE division should be preserved in normalized profiles."
)
assert.equal(
  normalizedFormFourProfile.cseeSummary?.passCount,
  4,
  "Form Four profile should derive CSEE pass count."
)
assert.equal(
  normalizedFormFourProfile.cseeSummary?.subjectGrades.mathematics,
  "D",
  "Form Four profile should normalize O-Level subject grades."
)

const normalizedFormSixProfile = normalizeStudentProfile(
  formSixEngineeringProfile
)
assert.equal(
  normalizedFormSixProfile.acseeSummary?.division,
  "II",
  "ACSEE division should be preserved in normalized profiles."
)
assert.equal(
  normalizedFormSixProfile.acseeSummary?.principalPassCount,
  2,
  "Form Six profile should derive principal pass count from grades."
)
assert.equal(
  normalizedFormSixProfile.acseeSummary?.subsidiaryPassCount,
  1,
  "Form Six profile should derive subsidiary pass count from grades."
)
assert.equal(
  normalizedFormSixProfile.acseeSummary?.points,
  5.5,
  "Form Six profile should derive ACSEE points from subject grades."
)
assert.equal(
  normalizedFormSixProfile.acseeSummary?.subjectGrades.advanced_mathematics,
  "C",
  "Form Six profile should normalize Advanced Mathematics distinctly."
)

const normalizedDiplomaProfile = normalizeStudentProfile(diplomaHealthProfile)
assert.equal(
  normalizedDiplomaProfile.cseeSummary?.subjectGrades.english,
  "C",
  "Diploma-route profiles should retain O-Level support subjects."
)
assert.equal(
  normalizedDiplomaProfile.diploma?.gpa,
  3.2,
  "Diploma-route profiles should preserve prior award GPA."
)

const engineeringRuleSet = sampleRequirementRuleSets.find(
  (ruleSet) => ruleSet.programmeKey === "bachelor_engineering"
)
assert(engineeringRuleSet, "Expected engineering rule-set fixture.")
assert.equal(
  engineeringRuleSet.variants.length,
  1,
  "Engineering fixture should model one route variant."
)
assert(
  engineeringRuleSet.variants[0]?.clauses.some(
    (clause) => clause.kind === "o_level_subject_grade"
  ),
  "Engineering fixture should preserve an O-Level support-subject clause."
)

const engineeringEvaluation = evaluateRequirementRuleSet(
  engineeringRuleSet,
  normalizedFormSixProfile
)
assert.equal(
  engineeringEvaluation.status,
  "eligible",
  "Structured high-confidence Form Six rules should return eligible when all clauses match."
)
assert.equal(
  engineeringEvaluation.matchedRoute,
  "form_six",
  "Evaluation should report the matched application route."
)
assert(
  engineeringEvaluation.matchedClauses.some((clause) =>
    clause.includes("ACSEE principal pass count")
  ),
  "Evaluation should explain matched ACSEE principal pass clauses."
)

const healthRuleSet = sampleRequirementRuleSets.find(
  (ruleSet) => ruleSet.programmeKey === "bachelor_health_progression"
)
assert(healthRuleSet, "Expected health progression rule-set fixture.")
assert.equal(
  healthRuleSet.variants.length,
  2,
  "Health progression fixture should model OR branches as variants."
)
assert(
  healthRuleSet.variants.some((variant) => variant.route === "equivalent"),
  "Health progression fixture should retain equivalent route branch."
)

const parsedFormSixRuleSet = parseRequirementRuleSet({
  programmeKey: "fixture_engineering",
  institutionKey: "fixture_university",
  rawRequirementText:
    "Two principal passes in Advanced Mathematics and Physics with a minimum of 4.0 points.",
  sourceUrl: "https://example.test/source/form-six",
  confidence: "high",
  requiredSubjects: "Advanced Mathematics; Physics",
  acceptsFormFourDirect: "no",
  acceptsFormSix: "yes",
  acceptsCertificate: "no",
  acceptsDiploma: "no",
  acceptsEquivalent: "no",
})
assert.equal(
  parsedFormSixRuleSet.variants[0]?.parseStatus,
  "structured",
  "Parser should mark simple Form Six principal-pass requirements as structured."
)
assert(
  parsedFormSixRuleSet.variants[0]?.clauses.some(
    (clause) => clause.kind === "min_acsee_points" && clause.points === 4
  ),
  "Parser should extract minimum ACSEE points."
)

const parsedComplexRuleSet = parseRequirementRuleSet({
  programmeKey: "fixture_nursing",
  institutionKey: "fixture_college",
  rawRequirementText:
    "Diploma in Nursing or equivalent with minimum GPA of 3.0 and work experience.",
  sourceUrl: "https://example.test/source/diploma",
  confidence: "high",
  acceptsFormFourDirect: "no",
  acceptsFormSix: "no",
  acceptsCertificate: "no",
  acceptsDiploma: "yes",
  acceptsEquivalent: "yes",
})
assert(
  parsedComplexRuleSet.variants.every(
    (variant) => variant.parseStatus !== "structured"
  ),
  "Parser should keep OR/equivalent/work-experience requirements conservative."
)

const healthEvaluation = evaluateRequirementRuleSet(
  healthRuleSet,
  normalizedDiplomaProfile
)
assert.equal(
  healthEvaluation.status,
  "likely_eligible_but_verify",
  "Partial diploma progression rules should not return eligible even when parsed clauses match."
)
assert(
  healthEvaluation.warnings.some((warning) => warning.includes("partial")),
  "Partial parse evaluations should include a verification warning."
)

const hospitalityRuleSet = sampleRequirementRuleSets.find(
  (ruleSet) =>
    ruleSet.programmeKey === "ordinary_diploma_hospitality_management"
)
assert(hospitalityRuleSet, "Expected hospitality rule-set fixture.")
const hospitalityEvaluation = evaluateRequirementRuleSet(
  hospitalityRuleSet,
  normalizedFormFourProfile
)
assert.equal(
  hospitalityEvaluation.status,
  "eligible",
  "Structured high-confidence Form Four rules should return eligible when CSEE passes match."
)

const wrongRouteEvaluation = evaluateRequirementRuleSet(
  hospitalityRuleSet,
  normalizedFormSixProfile
)
assert.equal(
  wrongRouteEvaluation.status,
  "interest_match_only",
  "Rule sets with no variant for the student's route should only return an interest match."
)

const failedEngineeringProfile = normalizeStudentProfile({
  ...formSixEngineeringProfile,
  acsee: {
    division: "III",
    combination: "PCM",
    subjects: [
      { subject: "Advanced Mathematics", grade: "E" },
      { subject: "Physics", grade: "S" },
      { subject: "Chemistry", grade: "F" },
    ],
  },
})
const failedEngineeringEvaluation = evaluateRequirementRuleSet(
  engineeringRuleSet,
  failedEngineeringProfile
)
assert.equal(
  failedEngineeringEvaluation.status,
  "not_eligible",
  "High-confidence structured rules should return not_eligible when required clauses fail."
)
assert(
  summarizeEligibilityEvaluation(failedEngineeringEvaluation).startsWith(
    "Does not currently meet"
  ),
  "Eligibility summaries should use safe public wording."
)

console.log(
  `Eligibility contract checks passed for ${sampleRequirementRuleSets.length} gold rule-set fixtures.`
)
