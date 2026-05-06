"use client"

import Image from "next/image"
import Link from "next/link"
import { useMemo, useState } from "react"
import { usePaginatedQuery } from "convex/react"

import { awardLevels, regions } from "@/components/search/search-config"
import {
  ArrowRightIcon,
  ClockIcon,
  PinIcon,
  XIcon,
} from "@/components/search/search-icons"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  buildSubjectsForCombination,
  findAcseeCombination,
  resolveEligibilityBasis,
  resolveEligibilityQuery,
} from "@/components/eligibility/eligibility-profile-query"
import {
  countOLevelBlockedResults,
  groupEligibilityResults,
} from "@/components/eligibility/eligibility-result-groups"
import { api } from "@/convex/_generated/api"
import {
  applicantPathways,
  type ApplicationRoute,
} from "@/lib/domain/applicant-pathways"
import { acseeCombinationSearchSeeds } from "@/lib/domain/search-vocabulary"
import {
  calculateAcseePoints,
  countCseePasses,
  countAcseePrincipalPasses,
  eligibilityStatusLabels,
  type AcseeGrade,
  type CseeGrade,
  type EligibilityStatus,
  type StudentEligibilityProfile,
} from "@/lib/eligibility"

const INITIAL_RESULT_LIMIT = 12
const MAX_CANDIDATE_LIMIT = 1000

type Route = ApplicationRoute

type SubjectGrade = {
  subject: string
  grade: AcseeGrade
}

type CseeSubjectGrade = {
  subject: string
  grade: CseeGrade
}

type SubmittedProfile = StudentEligibilityProfile

type EligibilityResult = {
  _id: string
  programmeName: string
  institutionName: string
  awardLevel: string
  regulator: string
  ownershipType?: string
  region?: string
  duration?: string
  fieldCategory: string
  courseFamily?: string
  minimumEntryRequirements?: string
  requiredSubjects?: string
  entryRouteTypes?: string
  officialSourceUrl: string
  lastVerifiedDate: string
  needsReview: boolean
  eligibility: {
    status: EligibilityStatus
    confidence: "high" | "medium" | "low"
    matchedRoute?: string
    matchedClauses: string[]
    missingClauses: string[]
    warnings: string[]
    rawRequirementText: string
    sourceUrl: string
  }
}

const acseeGrades: AcseeGrade[] = ["A", "B", "C", "D", "E", "S", "F"]
const cseeGrades: CseeGrade[] = ["A", "B", "C", "D", "E", "F"]
const cseeDivisions = ["I", "II", "III", "IV", "0"] as const
const acseeDivisions = cseeDivisions
const cseeSupportSubjects = [
  "Basic Mathematics",
  "English Language",
  "Physics",
  "Chemistry",
  "Biology",
  "Geography",
  "Commerce",
  "Book Keeping",
  "Accountancy",
  "Computer Studies",
  "Agriculture",
]

const acseeCombinations = acseeCombinationSearchSeeds

const defaultSubjects: SubjectGrade[] = buildSubjectsForCombination("PCB")
const defaultCseeSubjects: CseeSubjectGrade[] = [
  "Basic Mathematics",
  "English Language",
  "Biology",
  "Chemistry",
].map((subject) => ({ subject, grade: "D" as const }))

const statusOrder: EligibilityStatus[] = [
  "eligible",
  "likely_eligible_but_verify",
  "cannot_determine",
  "interest_match_only",
  "not_eligible",
]

const statusTone: Record<EligibilityStatus, string> = {
  eligible: "border-emerald-600/30 bg-emerald-50 text-emerald-900",
  likely_eligible_but_verify:
    "border-brand-blue/25 bg-brand-blue/7 text-brand-blue",
  cannot_determine: "border-amber-500/30 bg-amber-50 text-amber-900",
  interest_match_only:
    "border-brand-ink/10 bg-brand-ink/[0.035] text-brand-ink/70",
  not_eligible: "border-red-500/25 bg-red-50 text-red-900",
}

const statusSummaries: Record<
  EligibilityStatus,
  {
    description: string
    title: string
  }
> = {
  eligible: {
    description: "Your grades match parsed published rules.",
    title: "Confirmed match",
  },
  likely_eligible_but_verify: {
    description: "Looks possible, but some rule detail still needs checking.",
    title: "Needs review",
  },
  cannot_determine: {
    description: "We found the course, but the rule is not structured enough.",
    title: "Not enough data",
  },
  interest_match_only: {
    description: "Matches your interest, not yet checked against your grades.",
    title: "Interest only",
  },
  not_eligible: {
    description: "A parsed rule clearly misses one or more requirements.",
    title: "Does not match",
  },
}

export function EligibilityPageClient() {
  const [route, setRoute] = useState<Route>("form_six")
  const [awardLevel, setAwardLevel] = useState("degree")
  const [region, setRegion] = useState("")
  const [combination, setCombination] = useState("PCB")
  const [cseeDivision, setCseeDivision] =
    useState<(typeof cseeDivisions)[number]>("III")
  const [acseeDivision, setAcseeDivision] =
    useState<(typeof acseeDivisions)[number]>("II")
  const [subjects, setSubjects] = useState<SubjectGrade[]>(defaultSubjects)
  const [formFourSubjects, setFormFourSubjects] =
    useState<CseeSubjectGrade[]>(defaultCseeSubjects)
  const [cseeSubjects, setCseeSubjects] = useState<CseeSubjectGrade[]>([])
  const [showOLevelSupport, setShowOLevelSupport] = useState(false)
  const [certificateAwardName, setCertificateAwardName] = useState(
    "Basic Technician Certificate"
  )
  const [certificateField, setCertificateField] = useState("health")
  const [certificateNtaLevel, setCertificateNtaLevel] = useState("5")
  const [certificateGpa, setCertificateGpa] = useState("3.0")
  const [diplomaAwardName, setDiplomaAwardName] = useState(
    "Diploma in Clinical Medicine"
  )
  const [diplomaField, setDiplomaField] = useState("health")
  const [diplomaNtaLevel, setDiplomaNtaLevel] = useState("6")
  const [diplomaGpa, setDiplomaGpa] = useState("3.2")
  const [equivalentDescription, setEquivalentDescription] = useState("")
  const [submittedProfile, setSubmittedProfile] =
    useState<SubmittedProfile | null>(null)
  const [submittedQuery, setSubmittedQuery] = useState("")
  const [submittedFilters, setSubmittedFilters] = useState<{
    awardLevel?: string
    region?: string
  } | null>(null)
  const [submittedBasis, setSubmittedBasis] = useState("")
  const [error, setError] = useState("")
  const acseeSummary = useMemo(() => {
    const grades = subjects
      .filter((subject) => subject.subject.trim())
      .map((subject) => subject.grade)

    return {
      points: calculateAcseePoints(grades),
      principalPasses: countAcseePrincipalPasses(grades),
    }
  }, [subjects])
  const cseeSummary = useMemo(() => {
    const grades = cseeSubjects
      .filter((subject) => subject.subject.trim())
      .map((subject) => subject.grade)

    return {
      passCount: countCseePasses(grades),
    }
  }, [cseeSubjects])
  const formFourSummary = useMemo(() => {
    const grades = formFourSubjects
      .filter((subject) => subject.subject.trim())
      .map((subject) => subject.grade)

    return {
      passCount: countCseePasses(grades),
    }
  }, [formFourSubjects])

  const queryArgs = useMemo(() => {
    if (!submittedProfile) {
      return "skip" as const
    }

    const filters = {
      ...(submittedFilters?.awardLevel
        ? { awardLevel: submittedFilters.awardLevel }
        : {}),
      ...(submittedFilters?.region ? { region: submittedFilters.region } : {}),
    }
    const hasFilters = Object.keys(filters).length > 0

    return {
      ...(submittedQuery ? { query: submittedQuery } : {}),
      filters: hasFilters ? filters : undefined,
      profile: submittedProfile,
      paginationOpts: undefined,
      maxCount: MAX_CANDIDATE_LIMIT,
    }
  }, [submittedFilters, submittedProfile, submittedQuery])

  const paginatedResults = usePaginatedQuery(
    api.programmes.eligibleSearchPaginated,
    queryArgs === "skip"
      ? "skip"
      : {
          query: queryArgs.query,
          filters: queryArgs.filters,
          profile: queryArgs.profile,
          maxCount: queryArgs.maxCount,
        },
    { initialNumItems: INITIAL_RESULT_LIMIT }
  )

  const results = paginatedResults.results as EligibilityResult[]
  const isFirstLoad =
    submittedProfile && paginatedResults.status === "LoadingFirstPage"
  const canLoadMore = paginatedResults.status === "CanLoadMore"
  const groupedResults = groupEligibilityResults(results)
  const oLevelBlockedCount =
    submittedProfile?.applicationRoute === "form_six"
      ? countOLevelBlockedResults(results)
      : 0

  function submitEligibility() {
    const nextError = validateForm()
    if (nextError) {
      setError(nextError)
      return
    }

    setError("")
    setSubmittedQuery(
      resolveEligibilityQuery({
        certificateAwardName,
        certificateField,
        combination,
        diplomaAwardName,
        diplomaField,
        equivalentDescription,
        route,
        subjects,
      })
    )
    setSubmittedBasis(
      resolveEligibilityBasis({
        certificateAwardName,
        certificateField,
        combination,
        diplomaAwardName,
        diplomaField,
        equivalentDescription,
        route,
        subjects,
      })
    )
    setSubmittedFilters({
      ...(awardLevel !== "all" ? { awardLevel } : {}),
      ...(region ? { region } : {}),
    })
    setSubmittedProfile(buildProfile())
  }

  function validateForm() {
    if (route === "form_four") {
      const completeSubjects = formFourSubjects.filter(
        (subject) => subject.subject.trim() && subject.grade
      )
      if (completeSubjects.length < 4) {
        return "Add at least four CSEE subjects."
      }
    }

    if (route === "form_six") {
      if (!findAcseeCombination(combination)) {
        return "Choose one of the listed ACSEE combinations."
      }

      const completeSubjects = subjects.filter(
        (subject) => subject.subject.trim() && subject.grade
      )
      if (completeSubjects.length < 2) {
        return "Add at least two ACSEE subjects."
      }
    }

    if (route === "certificate") {
      if (!certificateAwardName.trim()) {
        return "Add the certificate award name."
      }
      if (certificateGpa && Number.isNaN(Number.parseFloat(certificateGpa))) {
        return "Certificate GPA must be a number."
      }
    }

    if (route === "diploma") {
      if (!diplomaAwardName.trim()) {
        return "Add the diploma award name."
      }
      if (diplomaGpa && Number.isNaN(Number.parseFloat(diplomaGpa))) {
        return "Diploma GPA must be a number."
      }
    }

    if (route === "equivalent" && !equivalentDescription.trim()) {
      return "Describe the equivalent qualification."
    }

    return ""
  }

  function buildProfile(): SubmittedProfile {
    if (route === "form_four") {
      return {
        applicationRoute: "form_four",
        csee: {
          division: cseeDivision,
          subjects: formFourSubjects
            .filter((subject) => subject.subject.trim())
            .map((subject) => ({
              subject: subject.subject.trim(),
              grade: subject.grade,
            })),
        },
      }
    }

    if (route === "form_six") {
      return {
        applicationRoute: "form_six",
        acsee: {
          division: acseeDivision,
          combination: combination.trim() || undefined,
          subjects: subjects
            .filter((subject) => subject.subject.trim())
            .map((subject) => ({
              subject: subject.subject.trim(),
              grade: subject.grade,
            })),
        },
        ...(cseeSubjects.some((subject) => subject.subject.trim())
          ? {
              csee: {
                subjects: cseeSubjects
                  .filter((subject) => subject.subject.trim())
                  .map((subject) => ({
                    subject: subject.subject.trim(),
                    grade: subject.grade,
                  })),
              },
            }
          : {}),
      }
    }

    if (route === "certificate") {
      return {
        applicationRoute: "certificate",
        certificate: {
          awardName: certificateAwardName.trim(),
          field: certificateField.trim() || undefined,
          ntaLevel: certificateNtaLevel.trim() || undefined,
          gpa: certificateGpa ? Number.parseFloat(certificateGpa) : undefined,
        },
      }
    }

    if (route === "equivalent") {
      return {
        applicationRoute: "equivalent",
        equivalent: {
          description: equivalentDescription.trim(),
        },
      }
    }

    return {
      applicationRoute: "diploma",
      diploma: {
        awardName: diplomaAwardName.trim(),
        field: diplomaField.trim() || undefined,
        ntaLevel: diplomaNtaLevel.trim() || undefined,
        gpa: diplomaGpa ? Number.parseFloat(diplomaGpa) : undefined,
      },
    }
  }

  return (
    <main className="min-h-screen bg-white text-brand-ink">
      <EligibilityHeader />

      <section className="border-b border-brand-ink/8 bg-[#fbfbfb]">
        <div className="mx-auto max-w-[1280px] px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 text-[12px] font-semibold tracking-[0.18em] text-brand-blue uppercase">
            <span>Eligibility</span>
            <span className="h-px flex-1 bg-brand-blue/20" />
          </div>
          <div className="mt-4 grid gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(24rem,0.55fr)] lg:items-end">
            <div>
              <h1 className="max-w-4xl text-[34px] leading-[1.05] font-bold tracking-tight sm:text-[46px]">
                Find courses based on your results.
              </h1>
              <p className="mt-3 max-w-2xl text-[15px] leading-7 text-brand-ink/65">
                Enter your pathway and results, then check programmes against
                published entry routes.
              </p>
            </div>
            <div className="rounded-lg border border-brand-ink/10 bg-white p-4">
              <p className="text-[11px] font-semibold tracking-[0.16em] text-brand-ink/45 uppercase">
                Privacy
              </p>
              <p className="mt-1.5 text-[13px] leading-6 text-brand-ink/65">
                Grades stay in this page state only. We do not save them to the
                server, browser storage, cookies, or URL.
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-[1280px] gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[22rem_1fr] lg:px-8">
        <aside className="lg:sticky lg:top-4 lg:self-start">
          <div className="rounded-lg border border-brand-ink/10 bg-white">
            <div className="border-b border-brand-ink/8 p-5">
              <h2 className="text-[16px] font-bold">Your results</h2>
              <p className="mt-1 text-[12.5px] leading-5 text-brand-ink/55">
                Choose the Applicant Pathway you want to check against published
                entry routes.
              </p>
            </div>

            <div className="space-y-6 p-5">
              <RouteSelector route={route} setRoute={setRoute} />

              {route === "form_four" ? (
                <FormFourFields
                  cseeDivision={cseeDivision}
                  setCseeDivision={setCseeDivision}
                  setSubjects={setFormFourSubjects}
                  subjects={formFourSubjects}
                  summary={formFourSummary}
                />
              ) : route === "form_six" ? (
                <FormSixFields
                  acseeDivision={acseeDivision}
                  combination={combination}
                  setAcseeDivision={setAcseeDivision}
                  setCombination={setCombination}
                  setCseeSubjects={setCseeSubjects}
                  setSubjects={setSubjects}
                  subjects={subjects}
                  cseeSubjects={cseeSubjects}
                  cseeSummary={cseeSummary}
                  showOLevelSupport={showOLevelSupport}
                  setShowOLevelSupport={setShowOLevelSupport}
                  summary={acseeSummary}
                />
              ) : route === "certificate" ? (
                <PriorAwardFields
                  awardName={certificateAwardName}
                  field={certificateField}
                  gpa={certificateGpa}
                  ntaLevel={certificateNtaLevel}
                  setAwardName={setCertificateAwardName}
                  setField={setCertificateField}
                  setGpa={setCertificateGpa}
                  setNtaLevel={setCertificateNtaLevel}
                />
              ) : route === "diploma" ? (
                <PriorAwardFields
                  awardName={diplomaAwardName}
                  field={diplomaField}
                  gpa={diplomaGpa}
                  ntaLevel={diplomaNtaLevel}
                  setAwardName={setDiplomaAwardName}
                  setField={setDiplomaField}
                  setGpa={setDiplomaGpa}
                  setNtaLevel={setDiplomaNtaLevel}
                />
              ) : (
                <EquivalentFields
                  description={equivalentDescription}
                  setDescription={setEquivalentDescription}
                />
              )}

              <Preferences
                awardLevel={awardLevel}
                region={region}
                setAwardLevel={setAwardLevel}
                setRegion={setRegion}
              />

              {error ? (
                <p className="rounded-lg border border-red-500/20 bg-red-50 px-3 py-2 text-[12.5px] text-red-900">
                  {error}
                </p>
              ) : null}

              <Button
                className="h-11 w-full rounded-lg bg-brand-blue text-[14px] font-semibold text-white hover:bg-brand-blue-deep"
                onClick={submitEligibility}
                type="button"
              >
                Check eligibility
              </Button>
            </div>
          </div>
        </aside>

        <section className="min-w-0">
          <ResultsToolbar
            hasSubmitted={Boolean(submittedProfile)}
            isLoading={Boolean(isFirstLoad)}
            resultCount={results.length}
            searchBasis={submittedBasis}
          />

          {!submittedProfile ? (
            <EmptyState />
          ) : isFirstLoad ? (
            <LoadingState />
          ) : results.length === 0 ? (
            <NoResultsState />
          ) : (
            <div className="space-y-8">
              {oLevelBlockedCount > 0 ? (
                <OLevelSupportPrompt
                  count={oLevelBlockedCount}
                  isExpanded={showOLevelSupport}
                  onOpen={() => setShowOLevelSupport(true)}
                />
              ) : null}
              <BucketSummary results={results} />
              {statusOrder.map((status) =>
                groupedResults[status].length > 0 ? (
                  <ResultGroup
                    key={status}
                    results={groupedResults[status]}
                    status={status}
                  />
                ) : null
              )}
              {canLoadMore ? (
                <div className="border-t border-brand-ink/8 pt-5 text-center">
                  <Button
                    className="rounded-full border-brand-ink/15 px-5"
                    onClick={() =>
                      paginatedResults.loadMore(INITIAL_RESULT_LIMIT)
                    }
                    type="button"
                    variant="outline"
                  >
                    Load more
                  </Button>
                </div>
              ) : null}
            </div>
          )}
        </section>
      </div>
    </main>
  )
}

function EligibilityHeader() {
  return (
    <header className="border-b border-brand-ink/8">
      <div className="mx-auto flex h-16 max-w-[1280px] items-center justify-between gap-6 px-6 sm:px-8">
        <Link
          aria-label="Kozi Ipi home"
          className="inline-flex items-center gap-3"
          href="/"
        >
          <Image
            alt="Kozi Ipi"
            className="size-9"
            height={36}
            priority
            src="/kozi-ipi-logo.png"
            width={36}
          />
          <span className="text-[15px] font-semibold tracking-tight">
            Kozi Ipi
          </span>
          <span className="rounded-full bg-brand-blue/10 px-2 py-0.5 text-[10px] font-semibold tracking-[0.12em] text-brand-blue uppercase">
            Beta
          </span>
        </Link>

        <nav className="flex items-center gap-5 text-[13.5px] font-medium text-brand-ink/70 md:gap-7">
          <Link className="transition hover:text-brand-blue" href="/search">
            Kozi
          </Link>
          <Link className="transition hover:text-brand-blue" href="/vyuo">
            Vyuo
          </Link>
          <Link className="text-brand-ink" href="/eligibility">
            Sifa
          </Link>
        </nav>
      </div>
    </header>
  )
}

function RouteSelector({
  route,
  setRoute,
}: {
  route: Route
  setRoute: (route: Route) => void
}) {
  return (
    <div>
      <LabelText>Application route</LabelText>
      <div className="mt-2 grid grid-cols-2 gap-2">
        {applicantPathways.map((option) => (
          <button
            className={`rounded-lg border px-3 py-2 text-left text-[13px] font-semibold transition ${
              route === option.route
                ? "border-brand-blue bg-brand-blue text-white"
                : "border-brand-ink/10 bg-white text-brand-ink/70 hover:border-brand-blue/40"
            }`}
            key={option.route}
            onClick={() => setRoute(option.route)}
            type="button"
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  )
}

function FormFourFields({
  cseeDivision,
  setCseeDivision,
  setSubjects,
  subjects,
  summary,
}: {
  cseeDivision: (typeof cseeDivisions)[number]
  setCseeDivision: (division: (typeof cseeDivisions)[number]) => void
  setSubjects: (subjects: CseeSubjectGrade[]) => void
  subjects: CseeSubjectGrade[]
  summary: {
    passCount: number
  }
}) {
  function updateSubject(index: number, update: Partial<CseeSubjectGrade>) {
    setSubjects(
      subjects.map((subject, subjectIndex) =>
        subjectIndex === index ? { ...subject, ...update } : subject
      )
    )
  }

  function addSubject(subjectName = "") {
    const exists = subjects.some(
      (subject) =>
        subject.subject.trim().toLowerCase() ===
        subjectName.trim().toLowerCase()
    )
    if (subjectName && exists) return

    setSubjects([...subjects, { subject: subjectName, grade: "D" }])
  }

  return (
    <div className="space-y-4">
      <Field label="Division">
        <select
          className="h-10 w-full rounded-lg border border-brand-ink/10 bg-white px-3 text-[13px]"
          onChange={(event) =>
            setCseeDivision(
              event.target.value as (typeof cseeDivisions)[number]
            )
          }
          value={cseeDivision}
        >
          {cseeDivisions.map((division) => (
            <option key={division} value={division}>
              {division}
            </option>
          ))}
        </select>
      </Field>

      <div>
        <LabelText>CSEE subjects</LabelText>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {cseeSupportSubjects.slice(0, 8).map((subject) => (
            <button
              className="rounded-full border border-brand-ink/10 px-2.5 py-1 text-[11.5px] font-medium text-brand-ink/65 transition hover:border-brand-blue/35 hover:text-brand-blue"
              key={subject}
              onClick={() => addSubject(subject)}
              type="button"
            >
              {subject}
            </button>
          ))}
        </div>
        <div className="mt-3 space-y-2">
          {subjects.map((subject, index) => (
            <div className="grid grid-cols-[1fr_4.5rem_2rem] gap-2" key={index}>
              <Input
                className="h-10 rounded-lg text-[13px]"
                list="csee-support-subjects"
                onChange={(event) =>
                  updateSubject(index, { subject: event.target.value })
                }
                placeholder="Basic Mathematics"
                value={subject.subject}
              />
              <select
                className="h-10 rounded-lg border border-brand-ink/10 bg-white px-2 text-[13px]"
                onChange={(event) =>
                  updateSubject(index, {
                    grade: event.target.value as CseeGrade,
                  })
                }
                value={subject.grade}
              >
                {cseeGrades.map((grade) => (
                  <option key={grade} value={grade}>
                    {grade}
                  </option>
                ))}
              </select>
              <button
                aria-label="Remove CSEE subject"
                className="grid size-10 place-items-center rounded-lg text-brand-ink/45 transition hover:bg-brand-ink/5 hover:text-brand-ink"
                onClick={() =>
                  setSubjects(
                    subjects.filter((_, subjectIndex) => subjectIndex !== index)
                  )
                }
                type="button"
              >
                <XIcon className="size-4" />
              </button>
            </div>
          ))}
        </div>
        <datalist id="csee-support-subjects">
          {cseeSupportSubjects.map((subject) => (
            <option key={subject} value={subject} />
          ))}
        </datalist>
        <button
          className="mt-2 text-[12.5px] font-semibold text-brand-blue"
          onClick={() => addSubject()}
          type="button"
        >
          Add subject
        </button>
        <div className="mt-3 rounded-lg bg-brand-ink/[0.035] px-3 py-2">
          <p className="text-[10.5px] font-semibold tracking-[0.13em] text-brand-ink/40 uppercase">
            CSEE passes entered
          </p>
          <p className="mt-0.5 text-[14px] font-semibold">
            {summary.passCount}
          </p>
        </div>
      </div>
    </div>
  )
}

function FormSixFields({
  acseeDivision,
  cseeSubjects,
  cseeSummary,
  combination,
  setAcseeDivision,
  setCombination,
  setCseeSubjects,
  setShowOLevelSupport,
  setSubjects,
  showOLevelSupport,
  subjects,
  summary,
}: {
  acseeDivision: (typeof acseeDivisions)[number]
  cseeSubjects: CseeSubjectGrade[]
  cseeSummary: {
    passCount: number
  }
  combination: string
  setAcseeDivision: (division: (typeof acseeDivisions)[number]) => void
  setCombination: (combination: string) => void
  setCseeSubjects: (subjects: CseeSubjectGrade[]) => void
  setShowOLevelSupport: (visible: boolean) => void
  setSubjects: (subjects: SubjectGrade[]) => void
  showOLevelSupport: boolean
  subjects: SubjectGrade[]
  summary: {
    points: number
    principalPasses: number
  }
}) {
  function handleCombinationChange(value: string) {
    const nextValue = value.toUpperCase()
    setCombination(nextValue)

    const selectedCombination = findAcseeCombination(nextValue)
    if (!selectedCombination) {
      return
    }

    setSubjects(
      selectedCombination.subjects.map((subjectName) => {
        const existingSubject = subjects.find(
          (subject) =>
            subject.subject.trim().toLowerCase() ===
            subjectName.trim().toLowerCase()
        )
        return {
          subject: subjectName,
          grade: existingSubject?.grade ?? "D",
        }
      })
    )
  }

  function updateSubject(index: number, update: Partial<SubjectGrade>) {
    setSubjects(
      subjects.map((subject, subjectIndex) =>
        subjectIndex === index ? { ...subject, ...update } : subject
      )
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Division">
          <select
            className="h-10 w-full rounded-lg border border-brand-ink/10 bg-white px-3 text-[13px]"
            onChange={(event) =>
              setAcseeDivision(
                event.target.value as (typeof acseeDivisions)[number]
              )
            }
            value={acseeDivision}
          >
            {acseeDivisions.map((division) => (
              <option key={division} value={division}>
                {division}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Combination">
          <Input
            className="h-10 rounded-lg text-[13px]"
            list="acsee-combinations"
            onChange={(event) => handleCombinationChange(event.target.value)}
            placeholder="PCB"
            value={combination}
          />
          <datalist id="acsee-combinations">
            {acseeCombinations.map((option) => (
              <option
                key={option.code}
                label={`${option.label} (${option.code})`}
                value={option.code}
              />
            ))}
          </datalist>
        </Field>
      </div>
      <p className="-mt-2 text-[11.5px] leading-5 text-brand-ink/50">
        Type a subject letter, for example P, to see Physics combinations like
        PCB, PCM, and PGM.
      </p>

      <div>
        <LabelText>ACSEE subjects</LabelText>
        <div className="mt-2 space-y-2">
          {subjects.map((subject, index) => (
            <div className="grid grid-cols-[1fr_4.5rem_2rem] gap-2" key={index}>
              <Input
                className="h-10 rounded-lg text-[13px]"
                onChange={(event) =>
                  updateSubject(index, { subject: event.target.value })
                }
                placeholder="Subject"
                value={subject.subject}
              />
              <select
                className="h-10 rounded-lg border border-brand-ink/10 bg-white px-2 text-[13px]"
                onChange={(event) =>
                  updateSubject(index, {
                    grade: event.target.value as AcseeGrade,
                  })
                }
                value={subject.grade}
              >
                {acseeGrades.map((grade) => (
                  <option key={grade} value={grade}>
                    {grade}
                  </option>
                ))}
              </select>
              <button
                aria-label="Remove subject"
                className="grid size-10 place-items-center rounded-lg text-brand-ink/45 transition hover:bg-brand-ink/5 hover:text-brand-ink"
                onClick={() =>
                  setSubjects(
                    subjects.filter((_, subjectIndex) => subjectIndex !== index)
                  )
                }
                type="button"
              >
                <XIcon className="size-4" />
              </button>
            </div>
          ))}
        </div>
        <button
          className="mt-2 text-[12.5px] font-semibold text-brand-blue"
          onClick={() =>
            setSubjects([...subjects, { subject: "", grade: "D" }])
          }
          type="button"
        >
          Add subject
        </button>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="rounded-lg bg-brand-ink/[0.035] px-3 py-2">
            <p className="text-[10.5px] font-semibold tracking-[0.13em] text-brand-ink/40 uppercase">
              Principal passes
            </p>
            <p className="mt-0.5 text-[14px] font-semibold">
              {summary.principalPasses}
            </p>
          </div>
          <div className="rounded-lg bg-brand-ink/[0.035] px-3 py-2">
            <p className="text-[10.5px] font-semibold tracking-[0.13em] text-brand-ink/40 uppercase">
              Derived points
            </p>
            <p className="mt-0.5 text-[14px] font-semibold">
              {formatPoints(summary.points)}
            </p>
          </div>
        </div>
        <p className="mt-2 text-[11.5px] leading-5 text-brand-ink/50">
          Points are derived from the subject grades you enter here.
        </p>
      </div>
      <OLevelSupportFields
        cseeSubjects={cseeSubjects}
        isOpen={showOLevelSupport}
        setCseeSubjects={setCseeSubjects}
        setIsOpen={setShowOLevelSupport}
        summary={cseeSummary}
      />
    </div>
  )
}

function OLevelSupportFields({
  cseeSubjects,
  isOpen,
  setCseeSubjects,
  setIsOpen,
  summary,
}: {
  cseeSubjects: CseeSubjectGrade[]
  isOpen: boolean
  setCseeSubjects: (subjects: CseeSubjectGrade[]) => void
  setIsOpen: (visible: boolean) => void
  summary: {
    passCount: number
  }
}) {
  function updateSubject(index: number, update: Partial<CseeSubjectGrade>) {
    setCseeSubjects(
      cseeSubjects.map((subject, subjectIndex) =>
        subjectIndex === index ? { ...subject, ...update } : subject
      )
    )
  }

  function addSubject(subjectName = "") {
    const exists = cseeSubjects.some(
      (subject) =>
        subject.subject.trim().toLowerCase() ===
        subjectName.trim().toLowerCase()
    )
    if (subjectName && exists) return

    setCseeSubjects([...cseeSubjects, { subject: subjectName, grade: "D" }])
  }

  return (
    <div className="border-t border-brand-ink/8 pt-4">
      <button
        className="flex w-full items-start justify-between gap-3 text-left"
        onClick={() => setIsOpen(!isOpen)}
        type="button"
      >
        <span>
          <LabelText>O-Level support subjects</LabelText>
          <span className="mt-1 block text-[11.5px] leading-5 text-brand-ink/50">
            Add CSEE grades only when a programme asks for O-Level Math,
            English, or science support.
          </span>
        </span>
        <span className="rounded-full border border-brand-ink/10 px-2 py-1 text-[11px] font-semibold text-brand-ink/55">
          {isOpen ? "Hide" : "Add"}
        </span>
      </button>

      {isOpen ? (
        <div className="mt-3 space-y-3">
          <div className="flex flex-wrap gap-1.5">
            {cseeSupportSubjects.slice(0, 7).map((subject) => (
              <button
                className="rounded-full border border-brand-ink/10 px-2.5 py-1 text-[11.5px] font-medium text-brand-ink/65 transition hover:border-brand-blue/35 hover:text-brand-blue"
                key={subject}
                onClick={() => addSubject(subject)}
                type="button"
              >
                {subject}
              </button>
            ))}
          </div>

          <div className="space-y-2">
            {cseeSubjects.map((subject, index) => (
              <div
                className="grid grid-cols-[1fr_4.5rem_2rem] gap-2"
                key={index}
              >
                <Input
                  className="h-10 rounded-lg text-[13px]"
                  list="csee-support-subjects"
                  onChange={(event) =>
                    updateSubject(index, { subject: event.target.value })
                  }
                  placeholder="Basic Mathematics"
                  value={subject.subject}
                />
                <select
                  className="h-10 rounded-lg border border-brand-ink/10 bg-white px-2 text-[13px]"
                  onChange={(event) =>
                    updateSubject(index, {
                      grade: event.target.value as CseeGrade,
                    })
                  }
                  value={subject.grade}
                >
                  {cseeGrades.map((grade) => (
                    <option key={grade} value={grade}>
                      {grade}
                    </option>
                  ))}
                </select>
                <button
                  aria-label="Remove O-Level subject"
                  className="grid size-10 place-items-center rounded-lg text-brand-ink/45 transition hover:bg-brand-ink/5 hover:text-brand-ink"
                  onClick={() =>
                    setCseeSubjects(
                      cseeSubjects.filter(
                        (_, subjectIndex) => subjectIndex !== index
                      )
                    )
                  }
                  type="button"
                >
                  <XIcon className="size-4" />
                </button>
              </div>
            ))}
          </div>
          <datalist id="csee-support-subjects">
            {cseeSupportSubjects.map((subject) => (
              <option key={subject} value={subject} />
            ))}
          </datalist>
          <button
            className="text-[12.5px] font-semibold text-brand-blue"
            onClick={() => addSubject()}
            type="button"
          >
            Add another O-Level subject
          </button>

          <div className="rounded-lg bg-brand-ink/[0.035] px-3 py-2">
            <p className="text-[10.5px] font-semibold tracking-[0.13em] text-brand-ink/40 uppercase">
              O-Level passes entered
            </p>
            <p className="mt-0.5 text-[14px] font-semibold">
              {summary.passCount}
            </p>
          </div>
          <p className="text-[11.5px] leading-5 text-brand-ink/50">
            These grades are used only to resolve programmes that explicitly ask
            for O-Level support subjects.
          </p>
        </div>
      ) : null}
    </div>
  )
}

function PriorAwardFields({
  awardName,
  field,
  gpa,
  ntaLevel,
  setAwardName,
  setField,
  setGpa,
  setNtaLevel,
}: {
  awardName: string
  field: string
  gpa: string
  ntaLevel: string
  setAwardName: (value: string) => void
  setField: (value: string) => void
  setGpa: (value: string) => void
  setNtaLevel: (value: string) => void
}) {
  return (
    <div className="space-y-3">
      <Field label="Award name">
        <Input
          className="h-10 rounded-lg text-[13px]"
          onChange={(event) => setAwardName(event.target.value)}
          value={awardName}
        />
      </Field>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Field">
          <Input
            className="h-10 rounded-lg text-[13px]"
            onChange={(event) => setField(event.target.value)}
            value={field}
          />
        </Field>
        <Field label="NTA">
          <Input
            className="h-10 rounded-lg text-[13px]"
            onChange={(event) => setNtaLevel(event.target.value)}
            value={ntaLevel}
          />
        </Field>
        <Field label="GPA">
          <Input
            className="h-10 rounded-lg text-[13px]"
            inputMode="decimal"
            onChange={(event) => setGpa(event.target.value)}
            value={gpa}
          />
        </Field>
      </div>
    </div>
  )
}

function EquivalentFields({
  description,
  setDescription,
}: {
  description: string
  setDescription: (value: string) => void
}) {
  return (
    <div className="space-y-3">
      <Field label="Qualification">
        <Input
          className="h-10 rounded-lg text-[13px]"
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Foundation certificate, foreign qualification, or other source-backed equivalent"
          value={description}
        />
      </Field>
      <p className="text-[11.5px] leading-5 text-brand-ink/50">
        Equivalent cases stay conservative unless the published rule gives
        enough detail to evaluate.
      </p>
    </div>
  )
}

function Preferences({
  awardLevel,
  region,
  setAwardLevel,
  setRegion,
}: {
  awardLevel: string
  region: string
  setAwardLevel: (value: string) => void
  setRegion: (value: string) => void
}) {
  return (
    <div className="space-y-3 border-t border-brand-ink/8 pt-5">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Award">
          <select
            className="h-10 w-full rounded-lg border border-brand-ink/10 bg-white px-3 text-[13px]"
            onChange={(event) => setAwardLevel(event.target.value)}
            value={awardLevel}
          >
            {awardLevels.map((level) => (
              <option key={level.value} value={level.value}>
                {level.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Region">
          <select
            className="h-10 w-full rounded-lg border border-brand-ink/10 bg-white px-3 text-[13px]"
            onChange={(event) => setRegion(event.target.value)}
            value={region}
          >
            <option value="">All</option>
            {regions.map((regionOption) => (
              <option key={regionOption} value={regionOption}>
                {regionOption}
              </option>
            ))}
          </select>
        </Field>
      </div>
    </div>
  )
}

function ResultsToolbar({
  hasSubmitted,
  isLoading,
  resultCount,
  searchBasis,
}: {
  hasSubmitted: boolean
  isLoading: boolean
  resultCount: number
  searchBasis: string
}) {
  return (
    <div className="mb-5 flex items-end justify-between gap-4 border-b border-brand-ink/8 pb-4">
      <div>
        <p className="text-[12px] font-semibold tracking-[0.16em] text-brand-blue uppercase">
          Results
        </p>
        <h2 className="mt-1 text-[25px] font-bold tracking-tight">
          {hasSubmitted
            ? isLoading
              ? "Checking programmes"
              : `${resultCount} shown`
            : "Ready when you are"}
        </h2>
        {hasSubmitted && searchBasis ? (
          <p className="mt-1 text-[12.5px] text-brand-ink/55">
            Based on:{" "}
            <span className="font-medium text-brand-ink">{searchBasis}</span>
          </p>
        ) : null}
      </div>
      <p className="max-w-[18rem] text-right text-[12.5px] leading-5 text-brand-ink/50">
        Eligibility is based on published rules where parsed. Partial rules stay
        marked for verification.
      </p>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="grid min-h-[28rem] place-items-center rounded-lg border border-dashed border-brand-ink/15 bg-brand-ink/[0.015] p-8 text-center">
      <div>
        <p className="text-[13px] font-semibold text-brand-blue">
          Enter results to begin
        </p>
        <p className="mt-2 max-w-md text-[14px] leading-6 text-brand-ink/60">
          Enter the Applicant Pathway details you have, then check matching
          programmes with official requirements.
        </p>
      </div>
    </div>
  )
}

function LoadingState() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }, (_, index) => (
        <div
          className="h-36 animate-pulse rounded-lg bg-brand-ink/[0.035]"
          key={index}
        />
      ))}
    </div>
  )
}

function NoResultsState() {
  return (
    <div className="rounded-lg border border-brand-ink/10 p-6">
      <p className="font-semibold">No matching programmes found.</p>
      <p className="mt-1 text-[13px] text-brand-ink/60">
        Try removing the course interest or region filter.
      </p>
    </div>
  )
}

function BucketSummary({ results }: { results: EligibilityResult[] }) {
  const grouped = groupEligibilityResults(results)
  return (
    <div>
      <p className="mb-2 text-[12.5px] leading-5 text-brand-ink/55">
        These cards group the shown programmes by how confidently we can check
        your results against the published entry requirements.
      </p>
      <div className="grid gap-2 sm:grid-cols-5">
        {statusOrder.map((status) => (
          <div
            className={`rounded-lg border px-3 py-2 ${statusTone[status]}`}
            key={status}
          >
            <p className="text-[20px] font-bold">{grouped[status].length}</p>
            <p className="mt-0.5 text-[11px] leading-4 font-semibold">
              {statusSummaries[status].title}
            </p>
            <p className="mt-1.5 text-[10.5px] leading-4 opacity-75">
              {statusSummaries[status].description}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}

function OLevelSupportPrompt({
  count,
  isExpanded,
  onOpen,
}: {
  count: number
  isExpanded: boolean
  onOpen: () => void
}) {
  return (
    <div className="rounded-lg border border-amber-500/25 bg-amber-50 px-4 py-3 text-amber-950">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[13px] font-semibold">
            {count} result{count === 1 ? "" : "s"} need O-Level grades to
            verify.
          </p>
          <p className="mt-1 text-[12.5px] leading-5 text-amber-950/70">
            Some Form Six degree rules still require CSEE support subjects like
            Basic Mathematics or English.
          </p>
        </div>
        <Button
          className="h-9 shrink-0 rounded-full border-amber-500/30 bg-white px-4 text-[12.5px] font-semibold text-amber-950 hover:bg-amber-100"
          disabled={isExpanded}
          onClick={onOpen}
          type="button"
          variant="outline"
        >
          {isExpanded ? "O-Level section opened" : "Add O-Level grades"}
        </Button>
      </div>
    </div>
  )
}

function ResultGroup({
  results,
  status,
}: {
  results: EligibilityResult[]
  status: EligibilityStatus
}) {
  return (
    <section>
      <div className="mb-3 flex items-center gap-3">
        <h3 className="text-[15px] font-bold">
          {eligibilityStatusLabels[status]}
        </h3>
        <span className="h-px flex-1 bg-brand-ink/8" />
        <span className="text-[12px] font-semibold text-brand-ink/45">
          {results.length}
        </span>
      </div>
      <div className="space-y-3">
        {results.map((result) => (
          <EligibilityResultRow key={result._id} result={result} />
        ))}
      </div>
    </section>
  )
}

function EligibilityResultRow({ result }: { result: EligibilityResult }) {
  const [expanded, setExpanded] = useState(false)
  const sourceHref = normalizeExternalHref(
    result.eligibility.sourceUrl || result.officialSourceUrl
  )

  return (
    <article className="rounded-lg border border-brand-ink/10 bg-white p-4 transition hover:border-brand-blue/25">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5 text-[10.5px] font-semibold tracking-[0.12em] text-brand-ink/45 uppercase">
            <span>{result.awardLevel}</span>
            <span className="size-1 rounded-full bg-brand-ink/30" />
            <span>{result.regulator}</span>
            {result.ownershipType ? (
              <>
                <span className="size-1 rounded-full bg-brand-ink/30" />
                <span>{result.ownershipType}</span>
              </>
            ) : null}
          </div>
          <h4 className="mt-1.5 text-[17px] font-bold tracking-tight">
            {result.programmeName}
          </h4>
          <p className="mt-0.5 text-[13.5px] font-medium text-brand-ink/65">
            {result.institutionName}
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5 text-[12px] text-brand-ink/65">
            {result.region ? (
              <Tag>
                <PinIcon className="size-3.5" />
                {result.region}
              </Tag>
            ) : null}
            {result.duration ? (
              <Tag>
                <ClockIcon className="size-3.5" />
                {result.duration} years
              </Tag>
            ) : null}
            {result.entryRouteTypes ? (
              <Tag>{result.entryRouteTypes}</Tag>
            ) : null}
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
          <span
            className={`rounded-full border px-3 py-1 text-[11.5px] font-semibold ${statusTone[result.eligibility.status]}`}
          >
            {eligibilityStatusLabels[result.eligibility.status]}
          </span>
          <button
            className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-brand-blue"
            onClick={() => setExpanded((visible) => !visible)}
            type="button"
          >
            {expanded ? "Hide details" : "View details"}
            <ArrowRightIcon
              className={`size-3.5 transition ${expanded ? "rotate-90" : ""}`}
            />
          </button>
        </div>
      </div>

      <div className="mt-4 rounded-lg bg-brand-ink/[0.025] p-3">
        <p className="text-[10.5px] font-semibold tracking-[0.16em] text-brand-ink/40 uppercase">
          Entry requirements
        </p>
        <p className="mt-1.5 line-clamp-2 text-[13px] leading-6 text-brand-ink/68">
          {result.minimumEntryRequirements ||
            result.eligibility.rawRequirementText}
        </p>
      </div>

      {expanded ? (
        <div className="mt-4 grid gap-3 border-t border-brand-ink/8 pt-4 lg:grid-cols-2">
          <ClauseList
            empty="No matched clauses yet."
            items={result.eligibility.matchedClauses}
            label="Matched"
          />
          <ClauseList
            empty="No missing clauses shown."
            items={result.eligibility.missingClauses}
            label="Missing"
          />
          <ClauseList
            empty="No warnings."
            items={result.eligibility.warnings}
            label="Warnings"
          />
          <div className="rounded-lg bg-brand-ink/[0.025] p-3">
            <p className="text-[10.5px] font-semibold tracking-[0.16em] text-brand-ink/40 uppercase">
              Source
            </p>
            {sourceHref ? (
              <Link
                className="mt-2 inline-flex text-[13px] font-semibold text-brand-blue hover:underline"
                href={sourceHref}
                rel="noreferrer"
                target="_blank"
              >
                Official source
              </Link>
            ) : (
              <p className="mt-2 text-[13px] text-brand-ink/60">
                Not available
              </p>
            )}
            <p className="mt-2 text-[12px] text-brand-ink/45">
              Verified {result.lastVerifiedDate}
              {result.needsReview ? " · Needs review" : ""}
            </p>
          </div>
        </div>
      ) : null}
    </article>
  )
}

function ClauseList({
  empty,
  items,
  label,
}: {
  empty: string
  items: string[]
  label: string
}) {
  return (
    <div className="rounded-lg bg-brand-ink/[0.025] p-3">
      <p className="text-[10.5px] font-semibold tracking-[0.16em] text-brand-ink/40 uppercase">
        {label}
      </p>
      {items.length > 0 ? (
        <ul className="mt-2 space-y-1.5 text-[12.5px] leading-5 text-brand-ink/68">
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-[12.5px] text-brand-ink/45">{empty}</p>
      )}
    </div>
  )
}

function Field({
  children,
  label,
}: {
  children: React.ReactNode
  label: string
}) {
  return (
    <label className="block">
      <LabelText>{label}</LabelText>
      <div className="mt-1.5">{children}</div>
    </label>
  )
}

function LabelText({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[11px] font-semibold tracking-[0.13em] text-brand-ink/45 uppercase">
      {children}
    </span>
  )
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-brand-ink/[0.045] px-2.5 py-1">
      {children}
    </span>
  )
}

function formatPoints(points: number) {
  return Number.isInteger(points) ? String(points) : points.toFixed(1)
}

function normalizeExternalHref(value?: string) {
  const firstUrl = value
    ?.split(";")
    .map((item) => item.trim())
    .find(Boolean)
  if (!firstUrl) {
    return undefined
  }
  if (/^https?:\/\//i.test(firstUrl)) {
    return firstUrl
  }
  return undefined
}
