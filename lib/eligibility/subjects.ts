const SUBJECT_ALIASES: Record<string, string> = {
  "additional mathematics": "advanced_mathematics",
  "advanced math": "advanced_mathematics",
  "advanced mathematics": "advanced_mathematics",
  "agriculture science": "agriculture",
  agriculture: "agriculture",
  arabic: "arabic",
  "basic mathematics": "mathematics",
  biology: "biology",
  "book keeping": "bookkeeping",
  bookkeeping: "bookkeeping",
  chemistry: "chemistry",
  civics: "civics",
  commerce: "commerce",
  "computer science": "computer_science",
  "computer studies": "computer_science",
  english: "english",
  "english language": "english",
  "engineering science": "engineering_science",
  "fine arts": "fine_arts",
  french: "french",
  geography: "geography",
  history: "history",
  ict: "computer_science",
  kiswahili: "kiswahili",
  mathematics: "mathematics",
  nutrition: "nutrition",
  "food and nutrition": "nutrition",
  "food & nutrition": "nutrition",
  physics: "physics",
}

export function normalizeSubjectName(subject: string): string {
  const normalized = normalizeText(subject)
  return SUBJECT_ALIASES[normalized] ?? normalized.replaceAll(" ", "_")
}

export function normalizeSubjectList(subjects: string[]): string[] {
  return Array.from(
    new Set(
      subjects
        .map((subject) => normalizeSubjectName(subject))
        .filter((subject) => subject.length > 0)
    )
  )
}

export function normalizeSubjectGradeEntries<Grade extends string>(
  subjects: Array<{ subject: string; grade: Grade }>
): Record<string, Grade> {
  return subjects.reduce<Record<string, Grade>>((grades, entry) => {
    const subject = normalizeSubjectName(entry.subject)
    if (subject) {
      grades[subject] = entry.grade
    }
    return grades
  }, {})
}

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ")
}

