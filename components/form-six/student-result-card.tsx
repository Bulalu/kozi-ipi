import {
  classifyAcseeSubject,
  normalizeSubjectName,
  summarizeAcseeSubjectGrades,
  type AcseeGrade,
  type AcseeSubjectRole,
} from "@/lib/eligibility"
import { isValidAcseeGrade } from "@/lib/necta/acsee"

type ResultSubject = {
  rawSubject: string
  subject: string
  grade: string
}

type StudentResult = {
  formattedIndexNumber: string
  centreName: string
  division: string
  aggregate: string
  subjects: ResultSubject[]
}

const roleCopy: Record<AcseeSubjectRole, { label: string; className: string }> =
  {
    principal_pass: {
      label: "Principal pass",
      className: "border-kozi-ink bg-kozi-ink text-kozi-yellow",
    },
    subsidiary_pass: {
      label: "Subsidiary (S)",
      className: "border-kozi-ink bg-white text-kozi-ink",
    },
    fail: {
      label: "Hakufaulu (F)",
      className: "border-[#c2261b] bg-white text-[#c2261b]",
    },
    subsidiary_subject: {
      label: "Somo saidizi",
      className: "border-dashed border-kozi-ink/50 bg-white text-kozi-graphite",
    },
  }

// The student's result as NECTA prints it, plus the two numbers admissions
// use. NECTA's aggregate and the admission points run in opposite
// directions, so each one says which way is better.
export function StudentResultCard({ result }: { result: StudentResult }) {
  const subjects = result.subjects.map((subject) => {
    const key = normalizeSubjectName(subject.subject)
    const grade = subject.grade.toUpperCase()
    return {
      ...subject,
      key,
      grade,
      role: isValidAcseeGrade(grade)
        ? classifyAcseeSubject(key, grade)
        : ("subsidiary_subject" as const),
    }
  })
  const grades = Object.fromEntries(
    subjects
      .filter((subject) => isValidAcseeGrade(subject.grade))
      .map((subject) => [subject.key, subject.grade as AcseeGrade])
  )
  const summary = summarizeAcseeSubjectGrades(grades)
  const pointSubjects = subjects
    .filter((subject) => summary.pointSubjects.includes(subject.key))
    .map((subject) => `${subject.subject} ${subject.grade}`)

  return (
    <section
      aria-label="Matokeo yako ya ACSEE"
      className="rounded-[20px] border-[3px] border-kozi-ink bg-white shadow-[6px_6px_0_var(--kozi-ink)]"
    >
      <div className="flex flex-col gap-1 border-b-[3px] border-kozi-ink px-5 py-4 sm:flex-row sm:items-baseline sm:justify-between sm:px-6">
        <div className="flex min-w-0 items-baseline gap-3">
          <span className="font-tag text-[11px] font-semibold tracking-[0.1em] text-kozi-graphite">
            MATOKEO YAMEPATIKANA
          </span>
          <span className="font-tag text-lg font-semibold tracking-[0.04em] text-kozi-ink">
            {result.formattedIndexNumber}
          </span>
        </div>
        <p className="min-w-0 font-poster text-sm font-semibold break-words text-kozi-ink/75">
          {result.centreName}
        </p>
      </div>

      <dl className="grid grid-cols-2 border-b-[3px] border-kozi-ink lg:grid-cols-4">
        <Stat
          label="Division"
          value={result.division || "—"}
          help="Daraja la NECTA. I ni bora zaidi."
        />
        <Stat
          label="Aggregate"
          value={result.aggregate || "—"}
          help="NECTA: masomo makuu 3 bora, A=1 … E=5. Ndogo ni bora."
        />
        <Stat
          label="Pointi za udahili"
          value={formatPoints(summary.points)}
          help="TCU / NACTVET: masomo makuu 3 bora, A=5 … E=1, S=0.5. Kubwa ni bora."
          highlight
        />
        <Stat
          label="Principal passes"
          value={String(summary.principalPassCount)}
          help="Masomo makuu yenye A hadi E. General Studies na BAM hazihesabiwi."
          highlight
        />
      </dl>

      <div className="flex flex-col gap-3 px-5 py-4 sm:px-6">
        <ul className="flex flex-wrap gap-2" aria-label="Masomo">
          {subjects.map((subject) => (
            <li
              key={`${subject.rawSubject}-${subject.grade}`}
              className={`flex items-center gap-2 rounded-full border-2 px-3 py-1.5 font-poster text-sm font-bold ${roleCopy[subject.role].className}`}
            >
              <span>{subject.subject}</span>
              <span className="font-tag">{subject.grade}</span>
              <span className="font-tag text-[10px] font-semibold tracking-[0.06em] uppercase opacity-80">
                {roleCopy[subject.role].label}
              </span>
            </li>
          ))}
        </ul>
        <p className="font-poster text-[13px] leading-5 text-kozi-graphite">
          {pointSubjects.length > 0
            ? `Pointi zimetoka kwa: ${pointSubjects.join(", ")}. `
            : ""}
          Somo saidizi (General Studies, Basic Applied Mathematics) linahitaji
          kufaulu, lakini halihesabiwi kama principal pass wala kwenye pointi.
        </p>
      </div>
    </section>
  )
}

function Stat({
  help,
  highlight = false,
  label,
  value,
}: {
  help: string
  highlight?: boolean
  label: string
  value: string
}) {
  return (
    <div
      className={`flex flex-col gap-1 border-kozi-ink px-5 py-4 even:border-l-[3px] sm:px-6 lg:border-l-[3px] lg:first:border-l-0 max-lg:[&:nth-child(-n+2)]:border-b-[3px] ${
        highlight ? "bg-[#fff8d6]" : ""
      }`}
    >
      <dt className="font-display text-[12px] tracking-[0.04em] text-kozi-ink uppercase">
        {label}
      </dt>
      <dd className="font-display text-[34px] leading-none tracking-[-0.03em] text-kozi-ink">
        {value}
      </dd>
      <dd className="font-poster text-[12px] leading-4 text-kozi-graphite">
        {help}
      </dd>
    </div>
  )
}

function formatPoints(points: number) {
  return Number.isInteger(points) ? String(points) : points.toFixed(1)
}
