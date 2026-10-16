// Static copy and counts for the home page.
// Counts are a snapshot of data/processed (`bun run data:build`); refresh them
// when the processed dataset changes.

export const HOME_STATS = {
  programmes: "3,915",
  institutions: "734",
}

export const TICKER_COURSES = [
  "Clinical Medicine",
  "Computer Science",
  "Civil Engineering",
  "Accounting",
  "Law",
  "Nursing",
  "Tourism",
  "Agriculture",
]

export type PathwayTone = "yellow" | "cobalt" | "white"

export const PATHWAYS: Array<{
  exam: string
  title: string
  description: string
  badge: string
  cta: string
  href: string
  tone: PathwayTone
}> = [
  {
    exam: "CSEE",
    title: "Form Four",
    description: "Cheti, diploma, au njia ya kwenda A-level.",
    badge: "2,870 kozi",
    cta: "Anza hapa",
    href: "/eligibility",
    tone: "yellow",
  },
  {
    exam: "ACSEE",
    title: "Form Six",
    description:
      "Weka index number — tunasoma matokeo yako na kukuonyesha unachostahili.",
    badge: "1,410 shahada",
    cta: "Angalia sifa zangu",
    href: "/form-six",
    tone: "cobalt",
  },
  {
    exam: "NTA 6 · GPA",
    title: "Diploma Holder",
    description: "Tumia GPA ya diploma yako kuingia shahada ya kwanza.",
    badge: "Equivalent",
    cta: "Endelea na safari",
    href: "/search?level=degree",
    tone: "white",
  },
]

export const FIELDS = [
  {
    label: "Afya",
    count: "764",
    family: "health",
    query: "Health",
    image: "/home/field-health.webp",
    alt: "Medical student in scrubs with a stethoscope",
  },
  {
    label: "Uhandisi",
    count: "395",
    family: "engineering",
    query: "Engineering",
    image: "/home/field-engineering.webp",
    alt: "Engineering student in a hard hat holding blueprints",
  },
  {
    label: "Biashara",
    count: "1,023",
    family: "business",
    query: "Business",
    image: "/home/field-business.webp",
    alt: "Business student in a blazer holding a tablet",
  },
  {
    label: "Teknolojia",
    count: "326",
    family: "ICT",
    query: "ICT",
    image: "/home/field-ict.webp",
    alt: "Computer science student holding a laptop",
  },
  {
    label: "Utalii",
    count: "135",
    family: "tourism_hospitality",
    query: "Tourism",
    image: "/home/field-tourism.webp",
    alt: "Hospitality student in a chef jacket",
  },
]

export const FEATURED_UNIVERSITIES = [
  {
    short: "UDSM",
    name: "University of Dar es Salaam",
    region: "Dar es Salaam",
    programmes: "104",
    image: "/institution-campus/udsm.jpg",
    normalizedInstitutionName: "dar es salaam",
  },
  {
    short: "UDOM",
    name: "University of Dodoma",
    region: "Dodoma",
    programmes: "147",
    image: "/institution-campus/udom.jpg",
    normalizedInstitutionName: "dodoma",
  },
  {
    short: "MUST",
    name: "Mbeya Univ. of Science & Tech",
    region: "Mbeya",
    programmes: "115",
    image: "/institution-campus/must.jpg",
    normalizedInstitutionName: "mbeya science technology",
  },
  {
    short: "ARU",
    name: "Ardhi University",
    region: "Dar es Salaam",
    programmes: "25",
    image: "/institution-campus/ardhi.jpg",
    normalizedInstitutionName: "ardhi aru",
  },
]

export function fieldHref(field: { query: string; family: string }) {
  const params = new URLSearchParams({ q: field.query, family: field.family })
  return `/search?${params.toString()}`
}

export function universityHref(university: {
  name: string
  normalizedInstitutionName: string
}) {
  const params = new URLSearchParams({
    q: university.name,
    institution: university.normalizedInstitutionName,
    institutionLabel: university.name,
  })
  return `/search?${params.toString()}`
}
