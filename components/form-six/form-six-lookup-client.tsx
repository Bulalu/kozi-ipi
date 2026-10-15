"use client"

import Image from "next/image"
import Link from "next/link"
import {
  type FormEvent,
  type ReactNode,
  useEffect,
  useMemo,
  useState,
} from "react"
import {
  ArrowDown01Icon,
  ArrowRight01Icon,
  ArrowUpRight01Icon,
  Cancel01Icon,
  CheckmarkCircle02Icon,
  Clock01Icon,
  FilterHorizontalIcon,
  InformationCircleIcon,
  Location01Icon,
  Search01Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { usePaginatedQuery, useQuery } from "convex/react"

import {
  countOLevelBlockedResults,
  groupEligibilityResults,
} from "@/components/eligibility/eligibility-result-groups"
import { awardLevels, regions } from "@/components/search/search-config"
import { api } from "@/convex/_generated/api"
import {
  clearIndexHandoff,
  readIndexHandoff,
  stripExamYear,
} from "@/lib/necta/index-handoff"
import {
  calculateAcseePoints,
  countAcseePrincipalPasses,
  eligibilityStatusLabels,
  type AcseeGrade,
  type EligibilityStatus,
} from "@/lib/eligibility"
import {
  formatAcseeIndexNumber,
  isPlausibleAcseeIndexNumber,
  normalizeAcseeIndexNumber,
} from "@/lib/necta/acsee"

import styles from "./form-six-lookup-client.module.css"

const INITIAL_RESULT_LIMIT = 12
const MAX_CANDIDATE_LIMIT = 1000

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

type LookupResult = NonNullable<
  ReturnType<typeof useQuery<typeof api.acseeResults.lookup>>
>

const statusOrder: EligibilityStatus[] = [
  "eligible",
  "likely_eligible_but_verify",
  "cannot_determine",
  "interest_match_only",
  "not_eligible",
]

const statusCopy: Record<
  EligibilityStatus,
  { label: string; description: string }
> = {
  eligible: {
    label: "Eligible",
    description: "Meets the published ACSEE rule.",
  },
  likely_eligible_but_verify: {
    label: "Likely",
    description: "A strong match that still needs confirmation.",
  },
  cannot_determine: {
    label: "Check",
    description: "Relevant, but the requirement needs more detail.",
  },
  interest_match_only: {
    label: "Related",
    description: "Related to your pathway or course interest.",
  },
  not_eligible: {
    label: "Not matched",
    description: "A published requirement is missing.",
  },
}

const fieldOptions = [
  { label: "All fields", value: "" },
  { label: "Health", value: "Health" },
  { label: "Engineering", value: "Engineering" },
  { label: "ICT", value: "ICT" },
  { label: "Business", value: "Business" },
  { label: "Education", value: "Education" },
  { label: "Law", value: "Law" },
]

const quickQueries = [
  "Medicine",
  "Computer science",
  "Engineering",
  "Education",
]

export function FormSixLookupClient() {
  const [indexInput, setIndexInput] = useState("")
  const [submittedIndex, setSubmittedIndex] = useState("")
  const [indexError, setIndexError] = useState("")
  const [awardLevel, setAwardLevel] = useState("degree")
  const [region, setRegion] = useState("")
  const [fieldCategory, setFieldCategory] = useState("")
  const [courseQuery, setCourseQuery] = useState("")
  const [selectedStatus, setSelectedStatus] = useState<
    EligibilityStatus | "all"
  >("all")

  const filters = useMemo(() => {
    const nextFilters = {
      ...(awardLevel !== "all" ? { awardLevel } : {}),
      ...(region ? { region } : {}),
      ...(fieldCategory ? { fieldCategory } : {}),
    }

    return Object.keys(nextFilters).length > 0 ? nextFilters : undefined
  }, [awardLevel, fieldCategory, region])

  const lookup = useQuery(
    api.acseeResults.lookup,
    submittedIndex ? { indexNumber: submittedIndex } : "skip"
  ) as LookupResult | undefined

  const eligibilityArgs = useMemo(() => {
    if (!lookup?.profile) return "skip" as const

    return {
      ...(courseQuery.trim() ? { query: courseQuery.trim() } : {}),
      filters,
      profile: lookup.profile,
      maxCount: MAX_CANDIDATE_LIMIT,
    }
  }, [courseQuery, filters, lookup])

  const paginatedResults = usePaginatedQuery(
    api.programmes.eligibleSearchPaginated,
    eligibilityArgs,
    { initialNumItems: INITIAL_RESULT_LIMIT }
  )

  const results = paginatedResults.results as EligibilityResult[]
  const groupedResults = groupEligibilityResults(results)
  const isLookupLoading = Boolean(submittedIndex && lookup === undefined)
  const isResultsLoading =
    Boolean(lookup?.profile) && paginatedResults.status === "LoadingFirstPage"
  const canLoadMore = paginatedResults.status === "CanLoadMore"
  const oLevelBlockedCount = countOLevelBlockedResults(results)
  const profileSummary = lookup?.profile
    ? summarizeProfile(lookup.profile.acsee?.subjects ?? [])
    : null
  const visibleStatuses =
    selectedStatus === "all" ? statusOrder : [selectedStatus]

  function lookUpIndex(value: string) {
    const candidate = stripExamYear(value)
    const normalized = normalizeAcseeIndexNumber(candidate)

    if (!isPlausibleAcseeIndexNumber(normalized)) {
      setIndexInput(candidate)
      setIndexError("Use the full index number, for example S0101/0505.")
      setSubmittedIndex("")
      return
    }

    setIndexError("")
    setSelectedStatus("all")
    setIndexInput(formatAcseeIndexNumber(candidate))
    setSubmittedIndex(formatAcseeIndexNumber(candidate))
  }

  function submitIndex(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    lookUpIndex(indexInput)
  }

  // Pick up an index handed over from the home page and look it up right away.
  // The fragment only exists in the browser, so it can't be read during the
  // static prerender; reading it after mount avoids a hydration mismatch.
  useEffect(() => {
    const handedOver = readIndexHandoff()
    if (!handedOver) return

    clearIndexHandoff()
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time sync from the URL
    lookUpIndex(handedOver)
  }, [])

  function resetLookup() {
    setSubmittedIndex("")
    setIndexInput("")
    setIndexError("")
    setSelectedStatus("all")
  }

  function resetFilters() {
    setAwardLevel("degree")
    setRegion("")
    setFieldCategory("")
    setCourseQuery("")
    setSelectedStatus("all")
  }

  return (
    <main className={styles.page}>
      <FormSixHeader />

      <section className={styles.hero}>
        <Image
          alt=""
          className={styles.heroImage}
          fill
          priority
          sizes="100vw"
          src="/hero-students.png"
        />
        <div aria-hidden className={styles.heroWash} />
        <div className={styles.heroInner}>
          <div className={styles.heroContent}>
            <p className={styles.eyebrow}>Form Six / ACSEE 2026</p>
            <h1>Find courses you qualify for.</h1>
            <p className={styles.heroCopy}>
              Your result, matched with published university and college entry
              requirements.
            </p>
            <LookupForm
              indexError={indexError}
              indexInput={indexInput}
              isLoading={isLookupLoading}
              onInput={setIndexInput}
              onReset={resetLookup}
              onSubmit={submitIndex}
              submittedIndex={submittedIndex}
            />
          </div>
        </div>
      </section>

      <div aria-live="polite" className={styles.liveRegion}>
        {!submittedIndex ? null : isLookupLoading ? (
          <LoadingState title="Finding your ACSEE result" />
        ) : lookup?.status === "invalid_index" ? (
          <ProblemState
            description="Use the full Form Six format, such as S0101/0505 or P0101/0501."
            title="Check that index number"
          />
        ) : lookup?.status === "not_found" ? (
          <ProblemState
            description="Check the centre code and candidate number. This search currently covers NECTA ACSEE 2026."
            title="No result found"
          />
        ) : lookup?.status === "not_released" ? (
          <ProblemState
            description="The result exists, but it is absent or has no usable ACSEE subject grades."
            title="This result cannot be matched yet"
          />
        ) : lookup?.result ? (
          <StudentResultBand lookup={lookup} profileSummary={profileSummary} />
        ) : null}
      </div>

      {lookup?.result && lookup.profile ? (
        <section className={styles.resultsShell}>
          <FiltersPanel
            awardLevel={awardLevel}
            courseQuery={courseQuery}
            fieldCategory={fieldCategory}
            onReset={resetFilters}
            region={region}
            setAwardLevel={setAwardLevel}
            setCourseQuery={setCourseQuery}
            setFieldCategory={setFieldCategory}
            setRegion={setRegion}
          />

          <div className={styles.resultsMain}>
            {isResultsLoading ? (
              <LoadingState compact title="Checking programme requirements" />
            ) : results.length === 0 ? (
              <ProblemState
                description="Clear one or more course, field, region, or award filters to see more options."
                title="No programmes match these filters"
              />
            ) : (
              <>
                <ResultsHeader
                  canLoadMore={canLoadMore}
                  oLevelBlockedCount={oLevelBlockedCount}
                  resultCount={results.length}
                />
                <StatusSwitcher
                  groups={groupedResults}
                  onChange={setSelectedStatus}
                  selected={selectedStatus}
                />
                <div className={styles.resultGroups}>
                  {visibleStatuses.map((status) =>
                    groupedResults[status].length > 0 ? (
                      <ResultGroup
                        key={status}
                        results={groupedResults[status]}
                        status={status}
                      />
                    ) : null
                  )}
                </div>
                {canLoadMore ? (
                  <div className={styles.loadMoreRow}>
                    <button
                      className={styles.secondaryButton}
                      onClick={() =>
                        paginatedResults.loadMore(INITIAL_RESULT_LIMIT)
                      }
                      type="button"
                    >
                      Load more courses
                    </button>
                  </div>
                ) : null}
              </>
            )}
          </div>
        </section>
      ) : null}
    </main>
  )
}

function FormSixHeader() {
  return (
    <header className={styles.header}>
      <div className={styles.headerInner}>
        <Link aria-label="Kozi Ipi home" className={styles.brand} href="/">
          <Image
            alt=""
            className={styles.logo}
            height={34}
            priority
            src="/kozi-ipi-logo.png"
            width={34}
          />
          <span>Kozi Ipi</span>
        </Link>
        <nav aria-label="Primary navigation" className={styles.nav}>
          <Link href="/search">Courses</Link>
          <Link href="/vyuo">Institutions</Link>
          <Link aria-current="page" href="/form-six">
            Form Six
          </Link>
          <Link href="/analytics">Analytics</Link>
        </nav>
      </div>
    </header>
  )
}

function LookupForm({
  indexError,
  indexInput,
  isLoading,
  onInput,
  onReset,
  onSubmit,
  submittedIndex,
}: {
  indexError: string
  indexInput: string
  isLoading: boolean
  onInput: (value: string) => void
  onReset: () => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  submittedIndex: string
}) {
  return (
    <form
      aria-busy={isLoading}
      className={styles.lookupForm}
      onSubmit={onSubmit}
    >
      <div className={styles.lookupControls}>
        <div className={styles.indexField}>
          <HugeiconsIcon icon={Search01Icon} size={22} strokeWidth={1.8} />
          <div className={styles.indexFieldText}>
            <label htmlFor="form-six-index">Form Six index number</label>
            <input
              aria-describedby={indexError ? "form-six-index-error" : undefined}
              aria-invalid={Boolean(indexError)}
              autoCapitalize="characters"
              autoComplete="off"
              id="form-six-index"
              inputMode="text"
              onChange={(event) => onInput(event.target.value)}
              placeholder="S0101/0505"
              spellCheck={false}
              value={indexInput}
            />
          </div>
          {submittedIndex ? (
            <button
              aria-label="Clear index number"
              className={styles.clearButton}
              onClick={onReset}
              title="Clear index number"
              type="button"
            >
              <HugeiconsIcon icon={Cancel01Icon} size={19} strokeWidth={2} />
            </button>
          ) : null}
        </div>
        <button
          className={styles.primaryButton}
          disabled={isLoading}
          type="submit"
        >
          {isLoading ? <span aria-hidden className={styles.spinner} /> : null}
          <span>{isLoading ? "Checking" : "See eligible courses"}</span>
          {!isLoading ? (
            <HugeiconsIcon icon={ArrowRight01Icon} size={19} strokeWidth={2} />
          ) : null}
        </button>
      </div>
      {indexError ? (
        <p className={styles.formError} id="form-six-index-error" role="alert">
          <HugeiconsIcon icon={InformationCircleIcon} size={17} />
          {indexError}
        </p>
      ) : (
        <p className={styles.privacyNote}>Private exact-number lookup</p>
      )}
    </form>
  )
}

function StudentResultBand({
  lookup,
  profileSummary,
}: {
  lookup: LookupResult
  profileSummary: ReturnType<typeof summarizeProfile> | null
}) {
  if (!lookup.result) return null

  return (
    <section className={styles.studentBand}>
      <div className={styles.studentBandInner}>
        <div className={styles.studentIdentity}>
          <div className={styles.resultStatus}>
            <span aria-hidden /> Result found
          </div>
          <h2>{lookup.result.formattedIndexNumber}</h2>
          <p>{lookup.result.centreName}</p>
        </div>

        <dl className={styles.resultStats}>
          <Stat label="Division" value={lookup.result.division} />
          <Stat label="Aggregate" value={lookup.result.aggregate} />
          <Stat
            label="Points"
            value={profileSummary ? String(profileSummary.points) : "-"}
          />
          <Stat
            label="Principal passes"
            value={
              profileSummary ? String(profileSummary.principalPasses) : "-"
            }
          />
        </dl>

        <div className={styles.subjects}>
          <p>Subjects</p>
          <div>
            {lookup.result.subjects.map((subject) => (
              <span key={`${subject.rawSubject}-${subject.grade}`}>
                {subject.subject} <strong>{subject.grade}</strong>
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function FiltersPanel({
  awardLevel,
  courseQuery,
  fieldCategory,
  onReset,
  region,
  setAwardLevel,
  setCourseQuery,
  setFieldCategory,
  setRegion,
}: {
  awardLevel: string
  courseQuery: string
  fieldCategory: string
  onReset: () => void
  region: string
  setAwardLevel: (value: string) => void
  setCourseQuery: (value: string) => void
  setFieldCategory: (value: string) => void
  setRegion: (value: string) => void
}) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const hasCustomFilters =
    awardLevel !== "degree" || Boolean(courseQuery || fieldCategory || region)

  return (
    <aside className={styles.filters}>
      <div className={styles.desktopFilterHeading}>
        <span>
          <HugeiconsIcon icon={FilterHorizontalIcon} size={19} />
          Refine
        </span>
        {hasCustomFilters ? (
          <button onClick={onReset} type="button">
            Reset
          </button>
        ) : null}
      </div>
      <div className={styles.mobileFilterHeading}>
        <button
          aria-controls="form-six-filter-controls"
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen((open) => !open)}
          type="button"
        >
          <span>
            <HugeiconsIcon icon={FilterHorizontalIcon} size={19} />
            Refine results
          </span>
          <HugeiconsIcon
            className={mobileOpen ? styles.filterChevronOpen : undefined}
            icon={ArrowDown01Icon}
            size={18}
          />
        </button>
        {hasCustomFilters ? (
          <button onClick={onReset} type="button">
            Reset
          </button>
        ) : null}
      </div>

      <div
        className={`${styles.filterBody} ${mobileOpen ? styles.filterBodyOpen : ""}`}
        id="form-six-filter-controls"
      >
        <Field label="Course interest">
          <div className={styles.filterSearch}>
            <HugeiconsIcon icon={Search01Icon} size={17} />
            <input
              onChange={(event) => setCourseQuery(event.target.value)}
              placeholder="Search a course"
              value={courseQuery}
            />
          </div>
          <div className={styles.quickQueries}>
            {quickQueries.map((query) => (
              <button
                aria-pressed={courseQuery === query}
                key={query}
                onClick={() =>
                  setCourseQuery(courseQuery === query ? "" : query)
                }
                type="button"
              >
                {query}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Award level">
          <SelectControl onChange={setAwardLevel} value={awardLevel}>
            {awardLevels.map((level) => (
              <option key={level.value} value={level.value}>
                {level.label}
              </option>
            ))}
          </SelectControl>
        </Field>

        <Field label="Field">
          <SelectControl onChange={setFieldCategory} value={fieldCategory}>
            {fieldOptions.map((field) => (
              <option key={field.value || "all"} value={field.value}>
                {field.label}
              </option>
            ))}
          </SelectControl>
        </Field>

        <Field label="Region">
          <SelectControl onChange={setRegion} value={region}>
            <option value="">All regions</option>
            {regions.map((nextRegion) => (
              <option key={nextRegion} value={nextRegion}>
                {nextRegion}
              </option>
            ))}
          </SelectControl>
        </Field>
      </div>
    </aside>
  )
}

function ResultsHeader({
  canLoadMore,
  oLevelBlockedCount,
  resultCount,
}: {
  canLoadMore: boolean
  oLevelBlockedCount: number
  resultCount: number
}) {
  return (
    <div className={styles.resultsHeader}>
      <div>
        <p className={styles.sectionLabel}>Programme matches</p>
        <h2>
          {resultCount}
          {canLoadMore ? "+" : ""} options, ranked for your result
        </h2>
      </div>
      {oLevelBlockedCount > 0 ? (
        <p className={styles.cseeNotice}>
          <HugeiconsIcon icon={InformationCircleIcon} size={18} />
          {oLevelBlockedCount}{" "}
          {oLevelBlockedCount === 1 ? "option needs" : "options need"} Form Four
          confirmation
        </p>
      ) : null}
    </div>
  )
}

function StatusSwitcher({
  groups,
  onChange,
  selected,
}: {
  groups: ReturnType<typeof groupEligibilityResults>
  onChange: (status: EligibilityStatus | "all") => void
  selected: EligibilityStatus | "all"
}) {
  const allCount = statusOrder.reduce(
    (count, status) => count + groups[status].length,
    0
  )

  return (
    <div
      aria-label="Filter by eligibility"
      className={styles.statusSwitcher}
      role="group"
    >
      <button
        aria-pressed={selected === "all"}
        onClick={() => onChange("all")}
        type="button"
      >
        <span>All</span>
        <strong>{allCount}</strong>
      </button>
      {statusOrder.map((status) => {
        const count = groups[status].length
        return (
          <button
            aria-pressed={selected === status}
            disabled={count === 0}
            key={status}
            onClick={() => onChange(status)}
            type="button"
          >
            <i aria-hidden className={statusDotClass(status)} />
            <span>{statusCopy[status].label}</span>
            <strong>{count}</strong>
          </button>
        )
      })}
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
    <section className={styles.resultGroup}>
      <header>
        <div>
          <h3>{eligibilityStatusLabels[status]}</h3>
          <p>{statusCopy[status].description}</p>
        </div>
        <span>{results.length}</span>
      </header>
      <div className={styles.programmeList}>
        {results.map((result) => (
          <ResultCard key={result._id} result={result} />
        ))}
      </div>
    </section>
  )
}

function ResultCard({ result }: { result: EligibilityResult }) {
  const officialSourceHref = normalizeExternalHref(result.officialSourceUrl)
  const missingOLevel = result.eligibility.missingClauses.some((clause) =>
    /\b(O-Level|CSEE)\b/i.test(clause)
  )

  return (
    <article className={styles.programmeCard}>
      <div className={styles.cardTopline}>
        <p>
          {result.awardLevel} / {result.regulator}
          {result.region ? ` / ${result.region}` : ""}
        </p>
        <StatusPill status={result.eligibility.status} />
      </div>

      <h4>{result.programmeName}</h4>
      <p className={styles.institutionName}>{result.institutionName}</p>

      <div className={styles.courseMeta}>
        {result.region ? (
          <Meta icon={<HugeiconsIcon icon={Location01Icon} size={16} />}>
            {result.region}
          </Meta>
        ) : null}
        {result.duration ? (
          <Meta icon={<HugeiconsIcon icon={Clock01Icon} size={16} />}>
            {result.duration} years
          </Meta>
        ) : null}
        <Meta>{result.fieldCategory}</Meta>
        {missingOLevel ? <Meta tone="warning">Form Four check</Meta> : null}
      </div>

      {result.minimumEntryRequirements ? (
        <div className={styles.requirementText}>
          <span>Published requirement</span>
          <p>{result.minimumEntryRequirements}</p>
        </div>
      ) : null}

      <details className={styles.evidenceDisclosure}>
        <summary>
          <span>Eligibility evidence</span>
          <small>
            {result.eligibility.matchedClauses.length} matched /{" "}
            {result.eligibility.missingClauses.length} to confirm
          </small>
          <HugeiconsIcon icon={ArrowDown01Icon} size={18} />
        </summary>
        <div className={styles.evidenceGrid}>
          <EvidenceList
            icon="check"
            items={result.eligibility.matchedClauses}
            title="Matched"
          />
          <EvidenceList
            icon="info"
            items={result.eligibility.missingClauses}
            title="Still to confirm"
          />
        </div>
      </details>

      <footer className={styles.cardFooter}>
        <p>
          Verified {result.lastVerifiedDate}
          {result.needsReview ? " / review advised" : ""}
        </p>
        {officialSourceHref ? (
          <Link href={officialSourceHref} rel="noreferrer" target="_blank">
            Official source
            <HugeiconsIcon icon={ArrowUpRight01Icon} size={16} />
          </Link>
        ) : null}
      </footer>
    </article>
  )
}

function StatusPill({ status }: { status: EligibilityStatus }) {
  return (
    <span className={`${styles.statusPill} ${statusPillClass(status)}`}>
      <i aria-hidden />
      {statusCopy[status].label}
    </span>
  )
}

function EvidenceList({
  icon,
  items,
  title,
}: {
  icon: "check" | "info"
  items: string[]
  title: string
}) {
  const visibleItems = items.slice(0, 3)

  return (
    <div className={styles.evidenceList}>
      <p>
        <HugeiconsIcon
          icon={
            icon === "check" ? CheckmarkCircle02Icon : InformationCircleIcon
          }
          size={17}
        />
        {title}
      </p>
      {visibleItems.length > 0 ? (
        <ul>
          {visibleItems.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : (
        <span>No additional requirement in this group.</span>
      )}
    </div>
  )
}

function LoadingState({
  compact = false,
  title,
}: {
  compact?: boolean
  title: string
}) {
  return (
    <div
      className={`${styles.loadingState} ${compact ? styles.compactState : ""}`}
    >
      <span aria-hidden className={styles.spinner} />
      <div>
        <p>{title}</p>
        <span>One moment</span>
      </div>
    </div>
  )
}

function ProblemState({
  description,
  title,
}: {
  description: string
  title: string
}) {
  return (
    <div className={styles.problemState} role="status">
      <HugeiconsIcon icon={InformationCircleIcon} size={24} />
      <div>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
    </div>
  )
}

function Field({ children, label }: { children: ReactNode; label: string }) {
  return (
    <label className={styles.field}>
      <span>{label}</span>
      {children}
    </label>
  )
}

function SelectControl({
  children,
  onChange,
  value,
}: {
  children: ReactNode
  onChange: (value: string) => void
  value: string
}) {
  return (
    <div className={styles.selectWrap}>
      <select onChange={(event) => onChange(event.target.value)} value={value}>
        {children}
      </select>
      <HugeiconsIcon icon={ArrowDown01Icon} size={17} />
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  )
}

function Meta({
  children,
  icon,
  tone = "default",
}: {
  children: ReactNode
  icon?: ReactNode
  tone?: "default" | "warning"
}) {
  return (
    <span className={tone === "warning" ? styles.warningMeta : undefined}>
      {icon}
      {children}
    </span>
  )
}

function statusDotClass(status: EligibilityStatus) {
  return {
    eligible: styles.dotEligible,
    likely_eligible_but_verify: styles.dotLikely,
    cannot_determine: styles.dotCheck,
    interest_match_only: styles.dotRelated,
    not_eligible: styles.dotNotMatched,
  }[status]
}

function statusPillClass(status: EligibilityStatus) {
  return {
    eligible: styles.pillEligible,
    likely_eligible_but_verify: styles.pillLikely,
    cannot_determine: styles.pillCheck,
    interest_match_only: styles.pillRelated,
    not_eligible: styles.pillNotMatched,
  }[status]
}

function summarizeProfile(subjects: { grade: AcseeGrade }[]) {
  const grades = subjects.map((subject) => subject.grade)

  return {
    points: calculateAcseePoints(grades),
    principalPasses: countAcseePrincipalPasses(grades),
  }
}

function normalizeExternalHref(href?: string) {
  const value = href?.trim().split(/[;\s]+/)[0]
  if (!value) return null
  if (/^https?:\/\//i.test(value)) return value
  if (/^\/\//.test(value)) return `https:${value}`
  if (/^(www\.)?[a-z0-9-]+(\.[a-z0-9-]+)+(\/.*)?$/i.test(value)) {
    return `https://${value}`
  }

  return null
}
