export function normalizeIdentityName(value: string | undefined) {
  return (value ?? "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
}

export const campusMarkers = [
  "campus",
  "centre",
  "center",
  "branch",
  "college",
] as const

const looseInstitutionWordsPattern =
  /\b(university|college|institute|institution|campus|zanzibar|tanzania)\b/g

const knownInstitutionShortCodes = new Set([
  "aku",
  "amucta",
  "aru",
  "atc",
  "cawm",
  "cbe",
  "cfr",
  "cuhas",
  "cuom",
  "dartu",
  "dit",
  "dmi",
  "duce",
  "eastc",
  "iaa",
  "iae",
  "ifm",
  "ifs",
  "ipa",
  "irdp",
  "isw",
  "ita",
  "juco",
  "kcmc",
  "kicob",
  "kist",
  "kiut",
  "ku",
  "lgti",
  "maruco",
  "mnma",
  "mnuat",
  "mocu",
  "mu",
  "mudcco",
  "muhas",
  "mum",
  "mumcco",
  "must",
  "muce",
  "mwecau",
  "mzu",
  "nit",
  "out",
  "rucu",
  "saut",
  "sjcet",
  "sjchas",
  "sjut",
  "sfuchas",
  "stemmuco",
  "sua",
  "sumait",
  "suza",
  "teku",
  "tia",
  "ticd",
  "tipm",
  "tpsc",
  "tuma",
  "uad",
  "uaut",
  "udom",
  "udsm",
  "uoa",
  "uoi",
  "wi",
  "zu",
])

export function hasCampusMarker(value: string | undefined) {
  const tokens = new Set(normalizeIdentityName(value).split(" "))
  return campusMarkers.some((marker) => tokens.has(marker))
}

export function normalizeLooseInstitutionIdentityKey(value: string) {
  return normalizeIdentityName(value)
    .replace(looseInstitutionWordsPattern, " ")
    .replace(/\s+/g, " ")
    .trim()
}

export function compatibleInstitutionIdentityKeys(left: string, right: string) {
  const normalizedLeft = normalizeLooseInstitutionIdentityKey(left)
  const normalizedRight = normalizeLooseInstitutionIdentityKey(right)
  return (
    normalizedLeft === normalizedRight ||
    normalizedLeft.includes(normalizedRight) ||
    normalizedRight.includes(normalizedLeft)
  )
}

export function institutionNameCandidates(value: string | undefined) {
  const base = normalizeIdentityName(value)
  const withoutParenthetical = normalizeIdentityName(
    value?.replace(/\([^)]*\)/g, " ")
  )
  const stripTrailingInstitutionWords = (name: string) =>
    name
      .replace(/\b(main\s+)?campus$/, "")
      .replace(/\btraining\s+centre$/, "")
      .replace(/\btraining\s+center$/, "")
      .replace(/\btraining\s+institute$/, "")
      .replace(
        /\b(university|college|institute|institution|centre|center)$/,
        ""
      )
      .replace(/\s+/g, " ")
      .trim()
  const stripTrailingShortCode = (name: string) => {
    const parts = name.split(" ")
    const last = parts.at(-1) ?? ""
    if (parts.length > 1 && knownInstitutionShortCodes.has(last)) {
      return parts.slice(0, -1).join(" ")
    }

    return name
  }

  const shortCodeStripped = stripTrailingShortCode(base)
  const withoutParentheticalShortCodeStripped =
    stripTrailingShortCode(withoutParenthetical)
  const variants = [
    base,
    withoutParenthetical,
    stripTrailingInstitutionWords(base),
    stripTrailingInstitutionWords(withoutParenthetical),
    shortCodeStripped,
    withoutParentheticalShortCodeStripped,
    stripTrailingInstitutionWords(shortCodeStripped),
    stripTrailingInstitutionWords(withoutParentheticalShortCodeStripped),
  ]

  return [...new Set(variants)].filter(
    (candidate) =>
      candidate &&
      (candidate.split(" ").length > 1 ||
        candidate === shortCodeStripped ||
        candidate === withoutParentheticalShortCodeStripped)
  )
}

export function institutionAliases(
  institutionName: string | undefined,
  registrationNumber: string | undefined,
  abbreviationOrAliases?: string
) {
  const aliases = new Set<string>()
  const combined =
    `${institutionName ?? ""} ${registrationNumber ?? ""} ${abbreviationOrAliases ?? ""}`.toUpperCase()

  for (const alias of (abbreviationOrAliases ?? "").split(/[;,|]/)) {
    const normalized = alias.trim()
    if (normalized) aliases.add(normalized)
  }

  if (
    combined.includes("INSTITUTE OF FINANCE MANAGEMENT") ||
    combined.includes("IFM")
  ) {
    aliases.add("IFM")
  }

  return [...aliases]
}
