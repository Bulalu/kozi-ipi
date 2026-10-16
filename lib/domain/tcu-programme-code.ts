// TCU programme codes as printed in the Bachelor's degree admission
// guidebooks, e.g. UD001, DM079, KC004, CBD11, MAR001, TAMZ1, TPSD1.
const tcuProgrammeCodeBody = "(?:[A-Z]{2,6}\\d{2,3}|[A-Z]{3,5}\\d)"

const exactCodePattern = new RegExp(`^${tcuProgrammeCodeBody}$`)
const embeddedCodePattern = new RegExp(
  `(?<![A-Za-z0-9])${tcuProgrammeCodeBody}(?![0-9])`,
  "g"
)

// Tokens that match the code shape but are not programme codes.
const nonCodeTokens = new Set(["COVID19", "NTA4", "NTA5", "NTA6", "ISO9001"])

export function isTcuProgrammeCode(value: string | undefined) {
  const text = (value ?? "").trim()
  return exactCodePattern.test(text) && !nonCodeTokens.has(text)
}

export function normalizeTcuProgrammeCode(value: string | undefined) {
  const text = (value ?? "").replace(/\s+/g, "").toUpperCase()
  return isTcuProgrammeCode(text) ? text : undefined
}

export function findEmbeddedTcuProgrammeCodes(value: string | undefined) {
  return [...(value ?? "").matchAll(embeddedCodePattern)]
    .map((match) => match[0])
    .filter((code) => !nonCodeTokens.has(code))
}

export function textContainsTcuProgrammeCode(value: string | undefined) {
  return findEmbeddedTcuProgrammeCodes(value).length > 0
}
