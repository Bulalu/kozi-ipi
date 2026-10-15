import { normalizeIdentityName } from "./institution-identity"

export function programmeNameFingerprint(value: string | undefined) {
  return normalizeIdentityName(value)
    .replace(
      /^(ordinary diploma|basic technician certificate|technician certificate|certificate|diploma|bachelor degree|bachelor|degree)\s+/,
      ""
    )
    .replace(/^(of|in)\s+/, "")
    .replace(/\s+in\s+/g, " ")
    .replace(/\s+of\s+/g, " ")
    .replace(/\s+and\s+/g, " ")
    .replace(/\s+with\s+/g, " ")
    .trim()
}

export function programmeOfferingIdentityKey({
  awardLevel,
  institutionName,
  programmeName,
}: {
  awardLevel: string | undefined
  institutionName: string | undefined
  programmeName: string | undefined
}) {
  return [
    programmeNameFingerprint(programmeName),
    normalizeIdentityName(institutionName),
    normalizeIdentityName(awardLevel),
  ].join("|")
}

export function requirementIdentityKey({
  institutionName,
  programmeName,
}: {
  institutionName: string | undefined
  programmeName: string | undefined
}) {
  return [
    programmeNameFingerprint(programmeName),
    normalizeIdentityName(institutionName),
  ].join("|")
}

export function programmeNameContainsRequirementLeak(
  value: string | undefined
) {
  const text = (value ?? "").replace(/\s+/g, " ").trim()

  return (
    /\b[A-Z]{2,4}\d{2,3}\b\s+(Diploma|Certificate|Foundation|Holder|Holders|One principal|Two principal|Three principal)/i.test(
      text
    ) ||
    /\b(applicant must|principal passes|minimum GPA|average of ["'“”]?B|minimum of ["'“”]?D["'“”]? grade)\b/i.test(
      text
    )
  )
}
