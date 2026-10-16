import type { EligibilityStatus } from "@/lib/eligibility"

// One source of truth for how a status reads on the Form Six page. Swahili
// leads; the English line helps students who read guidebooks in English.
export const statusCopy: Record<
  EligibilityStatus,
  {
    label: string
    english: string
    description: string
    pill: string
    dot: string
  }
> = {
  eligible: {
    label: "Unafuzu",
    english: "Meets the published minimum",
    description:
      "Matokeo yako yanakidhi kila sharti lililochapishwa ambalo tuliweza kukagua.",
    pill: "bg-[#0f7a3d] text-white",
    dot: "bg-[#0f7a3d]",
  },
  likely_eligible_but_verify: {
    label: "Huenda unafuzu",
    english: "Likely — confirm with the institution",
    description:
      "Masharti makuu yamekidhiwa, lakini sehemu ya sharti haikusomeka kikamilifu au chanzo hakina uhakika wa juu. Thibitisha na chuo.",
    pill: "bg-kozi-cobalt text-white",
    dot: "bg-kozi-cobalt",
  },
  cannot_determine: {
    label: "Inahitaji uhakiki",
    english: "Needs review",
    description:
      "Hatukuweza kuamua kutoka data iliyopo. Mara nyingi kozi hizi zinahitaji matokeo ya Form Four, au sharti lake halijachambuliwa bado.",
    pill: "bg-kozi-yellow text-kozi-ink",
    dot: "bg-kozi-yellow",
  },
  interest_match_only: {
    label: "Inahusiana",
    english: "Related only",
    description:
      "Inalingana na utafutaji wako, lakini haina sharti la Form Six tunaloweza kukagua.",
    pill: "bg-[#e7e7ea] text-kozi-ink",
    dot: "bg-[#b9b9c0]",
  },
  not_eligible: {
    label: "Hujafikia sifa",
    english: "Does not meet the published minimum",
    description:
      "Sharti moja au zaidi lililochapishwa halijakidhiwa na matokeo yako.",
    pill: "bg-[#c2261b] text-white",
    dot: "bg-[#c2261b]",
  },
}

// Qualifying list order. Not-eligible programmes live in their own section.
export const qualifyingStatuses: EligibilityStatus[] = [
  "eligible",
  "likely_eligible_but_verify",
  "cannot_determine",
  "interest_match_only",
]

export const awardLevelTabs = [
  { value: "degree", label: "Degree", swahili: "Shahada" },
  { value: "ordinary diploma", label: "Diploma", swahili: "Stashahada" },
  { value: "certificate", label: "Certificate", swahili: "Astashahada" },
] as const

export type AwardLevelValue = (typeof awardLevelTabs)[number]["value"]

export function awardLevelLabel(value: string) {
  return awardLevelTabs.find((tab) => tab.value === value)?.label ?? value
}
