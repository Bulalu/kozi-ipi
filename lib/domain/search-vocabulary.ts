import { normalizeIdentityName } from "./institution-identity"
import { courseFamilies } from "./taxonomy"

export type AcseeCombinationSearchSeed = {
  code: string
  label: string
  searchQuery: string
  subjects: string[]
}

export type ProgrammeKeywordPack = {
  courseFamily?: string
  careerKeywords: string[]
  swahiliKeywords: string[]
}

const vagueIntentPattern =
  /\b(i want|want to|study|become|nataka|kuwa|kazi ya|courses? za)\b/i

export const acseeCombinationSearchSeeds = [
  {
    code: "PCB",
    label: "Physics, Chemistry, Biology",
    searchQuery:
      "medicine nursing clinical medicine health biology chemistry physics",
    subjects: ["Physics", "Chemistry", "Biology"],
  },
  {
    code: "PCM",
    label: "Physics, Chemistry, Advanced Mathematics",
    searchQuery: "engineering computer science technology physics mathematics",
    subjects: ["Physics", "Chemistry", "Advanced Mathematics"],
  },
  {
    code: "PGM",
    label: "Physics, Geography, Advanced Mathematics",
    searchQuery:
      "engineering architecture land surveying geography physics mathematics",
    subjects: ["Physics", "Geography", "Advanced Mathematics"],
  },
  {
    code: "CBG",
    label: "Chemistry, Biology, Geography",
    searchQuery:
      "health agriculture environmental science biology chemistry geography",
    subjects: ["Chemistry", "Biology", "Geography"],
  },
  {
    code: "CBN",
    label: "Chemistry, Biology, Nutrition",
    searchQuery: "nutrition health food science biology chemistry",
    subjects: ["Chemistry", "Biology", "Nutrition"],
  },
  {
    code: "EGM",
    label: "Economics, Geography, Advanced Mathematics",
    searchQuery: "business economics accounting finance statistics geography",
    subjects: ["Economics", "Geography", "Advanced Mathematics"],
  },
  {
    code: "ECA",
    label: "Economics, Commerce, Accountancy",
    searchQuery: "business economics accounting finance management",
    subjects: ["Economics", "Commerce", "Accountancy"],
  },
  {
    code: "HGE",
    label: "History, Geography, Economics",
    searchQuery: "education law economics development geography",
    subjects: ["History", "Geography", "Economics"],
  },
  {
    code: "HGL",
    label: "History, Geography, English Language",
    searchQuery: "education law social work community development geography",
    subjects: ["History", "Geography", "English Language"],
  },
  {
    code: "HGK",
    label: "History, Geography, Kiswahili",
    searchQuery: "education law social work community development geography",
    subjects: ["History", "Geography", "Kiswahili"],
  },
  {
    code: "HKL",
    label: "History, Kiswahili, English Language",
    searchQuery: "education law social work language communication",
    subjects: ["History", "Kiswahili", "English Language"],
  },
  {
    code: "KLF",
    label: "Kiswahili, English Language, French",
    searchQuery: "education language communication translation",
    subjects: ["Kiswahili", "English Language", "French"],
  },
  {
    code: "CBA",
    label: "Chemistry, Biology, Agriculture",
    searchQuery: "agriculture veterinary medicine health biology chemistry",
    subjects: ["Chemistry", "Biology", "Agriculture"],
  },
] as const satisfies readonly AcseeCombinationSearchSeed[]

export function normalizeCourseFamily(value: string | undefined) {
  const normalized = normalizeIdentityName(value)
  if (!normalized) return undefined
  if (normalized.includes("tourism") || normalized.includes("hospitality")) {
    return "tourism_hospitality"
  }
  if (normalized.includes("ict") || normalized.includes("comput")) return "ICT"
  if (normalized.includes("business") || normalized.includes("account")) {
    return "business"
  }
  if (normalized.includes("health") || normalized.includes("medical")) {
    return "health"
  }
  if (normalized.includes("education") || normalized.includes("teaching")) {
    return "education"
  }
  if (normalized.includes("engineering")) return "engineering"
  return normalized
}

export function buildProgrammeKeywordPack({
  courseFamily,
  fieldCategory,
  programmeName,
}: {
  courseFamily?: string
  fieldCategory: string
  programmeName: string
}): ProgrammeKeywordPack {
  const joined =
    `${fieldCategory} ${programmeName} ${courseFamily ?? ""}`.toLowerCase()
  const careerKeywords = new Set<string>()
  const swahiliKeywords = new Set<string>()
  let detectedCourseFamily =
    normalizeCourseFamily(courseFamily) ?? normalizeCourseFamily(fieldCategory)

  if (
    joined.includes("health") ||
    joined.includes("medical") ||
    joined.includes("nursing")
  ) {
    detectedCourseFamily = "health"
    ;["nurse", "hospital", "medical", "clinical", "health"].forEach((term) =>
      careerKeywords.add(term)
    )
    ;["afya", "hospitali", "nesi", "udaktari"].forEach((term) =>
      swahiliKeywords.add(term)
    )
  }
  if (
    joined.includes("ict") ||
    joined.includes("computer") ||
    joined.includes("information")
  ) {
    detectedCourseFamily = "ICT"
    ;["computer", "IT", "software", "networking"].forEach((term) =>
      careerKeywords.add(term)
    )
    ;["kompyuta", "teknolojia"].forEach((term) => swahiliKeywords.add(term))
  }
  if (
    joined.includes("business") ||
    joined.includes("account") ||
    joined.includes("procurement")
  ) {
    detectedCourseFamily = "business"
    ;["office", "bank", "business", "administration"].forEach((term) =>
      careerKeywords.add(term)
    )
    ;["biashara", "ofisini", "benki", "uhasibu", "manunuzi"].forEach((term) =>
      swahiliKeywords.add(term)
    )
  }
  if (joined.includes("education") || joined.includes("teacher")) {
    detectedCourseFamily = "education"
    ;["teacher", "school", "education"].forEach((term) =>
      careerKeywords.add(term)
    )
    ;["ualimu", "mwalimu", "elimu"].forEach((term) => swahiliKeywords.add(term))
  }
  if (
    joined.includes("tourism") ||
    joined.includes("hospitality") ||
    joined.includes("hotel")
  ) {
    detectedCourseFamily = "tourism_hospitality"
    ;["hotel", "tourism", "travel", "hospitality"].forEach((term) =>
      careerKeywords.add(term)
    )
    ;["utalii", "hoteli"].forEach((term) => swahiliKeywords.add(term))
  }
  if (joined.includes("engineering")) {
    detectedCourseFamily = "engineering"
    ;["engineering", "engineer", "civil", "mechanical", "electrical"].forEach(
      (term) => careerKeywords.add(term)
    )
    ;["uhandisi"].forEach((term) => swahiliKeywords.add(term))
  }
  if (joined.includes("agriculture")) {
    detectedCourseFamily = "agriculture"
    careerKeywords.add("agriculture")
    swahiliKeywords.add("kilimo")
  }

  return {
    courseFamily: detectedCourseFamily,
    careerKeywords: [...careerKeywords],
    swahiliKeywords: [...swahiliKeywords],
  }
}

export function isNursingIntentText(query: string) {
  return /\b(nurse|nursing|nesi|midwife|midwifery)\b/i.test(query)
}

export function includesSearchIntentTerm(query: string, term: string) {
  const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  return new RegExp(
    `(^|[^\\p{L}\\p{N}])${escapedTerm}($|[^\\p{L}\\p{N}])`,
    "iu"
  ).test(query)
}

export function programmeIntentForQuery(query: string) {
  const trimmedQuery = query.trim()
  const normalizedQuery = trimmedQuery.toLowerCase()
  const matchedIntent = courseFamilies
    .map((family) => ({
      courseFamily: family.key,
      term: family.intentTerms.find((term) =>
        includesSearchIntentTerm(normalizedQuery, term)
      ),
    }))
    .find((intent) => intent.term)

  return {
    courseFamily: matchedIntent?.courseFamily,
    rewrittenQuery:
      matchedIntent?.term &&
      (normalizedQuery === matchedIntent.term ||
        vagueIntentPattern.test(trimmedQuery))
        ? matchedIntent.term
        : trimmedQuery,
  }
}

export function acseeCombinationSearchSeed(code: string) {
  const normalizedCode = code.trim().toUpperCase()
  return acseeCombinationSearchSeeds.find(
    (combination) => combination.code === normalizedCode
  )
}

export function inferAcseeCombinationSearchQuery({
  combination,
  subjects,
}: {
  combination: string
  subjects: readonly string[]
}) {
  const normalizedCombination = combination.trim().toUpperCase()
  const selectedCombination = acseeCombinationSearchSeed(normalizedCombination)
  if (selectedCombination) {
    return selectedCombination.searchQuery
  }

  const subjectWords = subjects
    .map((subject) => subject.trim().toLowerCase())
    .filter(Boolean)
  const subjectText = subjectWords.join(" ")
  const source = `${normalizedCombination} ${subjectText}`

  if (
    normalizedCombination.includes("PCB") ||
    (source.includes("biology") &&
      source.includes("chemistry") &&
      source.includes("physics"))
  ) {
    return "medicine nursing clinical medicine health biology chemistry physics"
  }

  if (
    normalizedCombination.includes("PCM") ||
    (source.includes("physics") && source.includes("mathematics"))
  ) {
    return "engineering computer science technology physics mathematics"
  }

  if (
    normalizedCombination.includes("CBG") ||
    (source.includes("chemistry") && source.includes("geography"))
  ) {
    return "health agriculture environmental science biology chemistry geography"
  }

  if (
    normalizedCombination.includes("EGM") ||
    normalizedCombination.includes("ECA") ||
    source.includes("economics") ||
    source.includes("commerce") ||
    source.includes("account")
  ) {
    return "business economics accounting finance management"
  }

  if (
    normalizedCombination.includes("HGL") ||
    normalizedCombination.includes("HKL") ||
    source.includes("history") ||
    source.includes("kiswahili") ||
    source.includes("language")
  ) {
    return "education law social work community development"
  }

  return subjectWords.length > 0
    ? subjectWords.join(" ")
    : normalizedCombination
}
