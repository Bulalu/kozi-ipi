import assert from "node:assert/strict"

import {
  calculateAcseePoints,
  countAcseePrincipalPasses,
  countAcseeSubsidiaryPasses,
  countCseePasses,
  normalizeStudentProfile,
  normalizeSubjectName,
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

console.log(
  `Eligibility contract checks passed for ${sampleRequirementRuleSets.length} gold rule-set fixtures.`
)

