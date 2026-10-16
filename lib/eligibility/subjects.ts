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

// Subjects a student can sit at A-Level (ACSEE), as normalized keys.
const ACSEE_SUBJECTS = new Set([
  "accountancy",
  "advanced_mathematics",
  "agriculture",
  "arabic",
  "basic_applied_mathematics",
  "biology",
  "bookkeeping",
  "chemistry",
  "chinese",
  "commerce",
  "computer_science",
  "divinity",
  "economics",
  "education",
  "engineering_science",
  "english",
  "fine_arts",
  "french",
  "geography",
  "history",
  "islamic_knowledge",
  "kiswahili",
  "music",
  "nutrition",
  "physical_education",
  "physics",
  "theatre_arts",
])

// Spellings in parsed A-Level requirements that mean a known subject. At
// A-Level, "Mathematics" means Advanced Mathematics.
const ACSEE_REQUIREMENT_ALIASES: Record<string, string> = {
  accounting: "accountancy",
  accounts: "accountancy",
  book_keeping: "bookkeeping",
  chinees: "chinese",
  computer: "computer_science",
  computer_sciences: "computer_science",
  computers: "computer_science",
  english_language: "english",
  fine_art: "fine_arts",
  food: "nutrition",
  food_and_nutrition: "nutrition",
  human_nutrition: "nutrition",
  mathematics: "advanced_mathematics",
}

// Words the parser sometimes leaves inside a subject name ("one of
// Physics", "Geography at A-Level"). They carry no subject of their own.
const ACSEE_FILLER_WORDS = new Set([
  "a",
  "an",
  "and",
  "any",
  "at",
  "either",
  "following",
  "from",
  "in",
  "language",
  "level",
  "of",
  "one",
  "or",
  "subject",
  "subjects",
  "the",
])

function knownAcseeSubject(key: string) {
  const resolved = ACSEE_REQUIREMENT_ALIASES[key] ?? key
  return ACSEE_SUBJECTS.has(resolved) ? resolved : undefined
}

// Resolves parsed A-Level requirement subjects to keys a student can hold.
// Joined names such as "physics_chemistry" are split into their subjects.
// Anything still unreadable is returned in `unresolved`, so callers can
// treat it as unknown instead of as a subject the student failed.
export function resolveAcseeRequirementSubjects(subjects: string[]) {
  const resolved: string[] = []
  const unresolved: string[] = []

  for (const subject of subjects) {
    const key = normalizeSubjectName(subject)
    const direct = knownAcseeSubject(key)
    if (direct) {
      resolved.push(direct)
      continue
    }

    const tokens = key.split("_").filter(Boolean)
    const extracted: string[] = []
    let index = 0
    let readable = true
    while (index < tokens.length) {
      let matchedLength = 0
      for (
        let length = Math.min(4, tokens.length - index);
        length > 0;
        length--
      ) {
        const candidate = knownAcseeSubject(
          tokens.slice(index, index + length).join("_")
        )
        if (candidate) {
          extracted.push(candidate)
          matchedLength = length
          break
        }
      }
      if (matchedLength > 0) {
        index += matchedLength
      } else if (ACSEE_FILLER_WORDS.has(tokens[index]!)) {
        index += 1
      } else {
        readable = false
        break
      }
    }

    if (readable && extracted.length > 0) {
      resolved.push(...extracted)
    } else {
      unresolved.push(key)
    }
  }

  return {
    subjects: Array.from(new Set(resolved)),
    unresolved,
  }
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
