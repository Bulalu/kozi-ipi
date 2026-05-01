export const courseFamilies = [
  {
    key: "engineering",
    label: "Engineering",
    swahili: "Uhandisi",
    mark: "⚙",
    intentTerms: ["engineering", "engineer", "civil", "mechanical", "electrical"],
  },
  {
    key: "health",
    label: "Afya",
    swahili: "Health",
    mark: "✚",
    intentTerms: [
      "health",
      "afya",
      "nurse",
      "nursing",
      "nesi",
      "hospital",
      "medical",
      "clinical",
      "medicine",
      "pharmacy",
      "laboratory",
      "lab",
      "clinic",
    ],
  },
  {
    key: "ICT",
    label: "Tech",
    swahili: "Teknolojia",
    mark: "</>",
    intentTerms: [
      "ict",
      "computer",
      "kompyuta",
      "software",
      "network",
      "technology",
      "tech",
      "information technology",
      "information systems",
      "programming",
    ],
  },
  {
    key: "business",
    label: "Biashara",
    swahili: "Business",
    mark: "$",
    intentTerms: [
      "business",
      "biashara",
      "accounting",
      "procurement",
      "office",
      "ofisini",
      "ofisi",
      "marketing",
      "commerce",
      "supply",
    ],
  },
  {
    key: "education",
    label: "Education",
    swahili: "Elimu",
    mark: "✎",
    intentTerms: ["education", "teacher", "teaching", "ualimu", "mwalimu"],
  },
  {
    key: "tourism_hospitality",
    label: "Utalii",
    swahili: "Tourism",
    mark: "✈",
    intentTerms: [
      "hotel",
      "hospitality",
      "tourism",
      "utalii",
      "hotel management",
      "hospitality management",
      "catering",
    ],
  },
  {
    key: "agriculture",
    label: "Kilimo",
    swahili: "Agriculture",
    mark: "🌿",
    intentTerms: ["agriculture", "kilimo"],
  },
] as const

export const awardLevels = [
  { label: "All levels", value: "all", duration: undefined },
  { label: "Diploma", value: "ordinary diploma", duration: "2-3 yrs" },
  { label: "Degree", value: "degree", duration: "3-5 yrs" },
  { label: "Certificate", value: "certificate", duration: "1 yr" },
] as const

export const searchRegions = [
  "Dar es Salaam",
  "Arusha",
  "Mwanza",
  "Dodoma",
  "Kilimanjaro",
  "Mbeya",
  "Iringa",
  "Tanga",
  "Morogoro",
  "Zanzibar Urban/West",
] as const

export const popularRegions = [
  "Dar es Salaam",
  "Arusha",
  "Mwanza",
  "Dodoma",
  "Kilimanjaro",
  "Zanzibar",
] as const

export const tanzaniaRegions = [
  "Arusha",
  "Dar es Salaam",
  "Dodoma",
  "Geita",
  "Iringa",
  "Kagera",
  "Katavi",
  "Kigoma",
  "Kilimanjaro",
  "Lindi",
  "Manyara",
  "Mara",
  "Mbeya",
  "Morogoro",
  "Mtwara",
  "Mwanza",
  "Njombe",
  "Pemba North",
  "Pemba South",
  "Pwani",
  "Rukwa",
  "Ruvuma",
  "Shinyanga",
  "Simiyu",
  "Singida",
  "Songwe",
  "Tabora",
  "Tanga",
  "Zanzibar",
  "Zanzibar Central/South",
  "Zanzibar North",
  "Zanzibar North Pemba",
  "Zanzibar South Pemba",
  "Zanzibar South Unguja",
  "Zanzibar Urban/West",
] as const

export const trendingQueries = [
  "Clinical medicine",
  "Civil engineering",
  "Computer science",
  "Nataka kuwa nurse",
  "Hotel management",
] as const

export const fieldFocus = [
  "Engineering",
  "Health",
  "ICT",
  "Business",
  "Education",
  "Agriculture",
  "Law",
  "Tourism",
] as const

export const fieldTaxonomy: Record<string, string[]> = {
  Agriculture: ["agriculture"],
  Business: ["business", "accounting", "procurement", "commerce", "insurance", "banking"],
  Education: ["education", "teacher", "teaching", "languages"],
  Engineering: [
    "engineering",
    "technical",
    "mechanical",
    "electrical",
    "construction",
    "transport",
    "auto",
    "automotive",
  ],
  Health: ["health", "medicine", "nursing", "pharmacy", "clinical", "laboratory"],
  ICT: ["ict", "computer", "technology", "information technology", "software"],
  Law: ["law"],
  Tourism: ["tourism", "hospitality", "tour guiding", "culinary", "wildlife"],
}

export function fieldTerms(field: string) {
  return fieldTaxonomy[field] ?? [field.toLowerCase()]
}

export function matchesField(haystack: string, field: string) {
  const normalizedHaystack = haystack.toLowerCase()
  return fieldTerms(field).some((term) => normalizedHaystack.includes(term.toLowerCase()))
}
