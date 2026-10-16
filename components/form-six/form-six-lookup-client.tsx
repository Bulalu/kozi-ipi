"use client"

import {
  type FormEvent,
  type ReactNode,
  useEffect,
  useMemo,
  useState,
} from "react"
import { useQuery } from "convex/react"

import {
  EligibilityResultCard,
  StatusPill,
  type OverviewRow,
} from "@/components/form-six/eligibility-result-card"
import {
  awardLevelTabs,
  qualifyingStatuses,
  statusCopy,
} from "@/components/form-six/form-six-copy"
import { FormSixHeader } from "@/components/form-six/form-six-header"
import { StudentResultCard } from "@/components/form-six/student-result-card"
import { fieldCategoryLabel } from "@/components/search/search-config"
import { SearchIcon, XIcon } from "@/components/search/search-icons"
import { api } from "@/convex/_generated/api"
import {
  eligibilityStatusRank,
  type EligibilityStatus,
  type StudentEligibilityProfile,
} from "@/lib/eligibility"
import {
  formatAcseeIndexNumber,
  isPlausibleAcseeIndexNumber,
  normalizeAcseeIndexNumber,
} from "@/lib/necta/acsee"
import {
  clearIndexHandoff,
  readIndexHandoff,
  stripExamYear,
} from "@/lib/necta/index-handoff"

const PAGE_SIZE = 12
const NOT_MATCHED_PAGE_SIZE = 20
const COURSE_QUERY_DEBOUNCE_MS = 400

type AwardFilter = "all" | (typeof awardLevelTabs)[number]["value"]
type StatusFilter = "all" | EligibilityStatus
type Overview = NonNullable<
  ReturnType<typeof useQuery<typeof api.programmes.eligibleOverview>>
>

export function FormSixLookupClient() {
  const [indexInput, setIndexInput] = useState("")
  const [submittedIndex, setSubmittedIndex] = useState("")
  const [indexError, setIndexError] = useState("")

  const lookup = useQuery(
    api.acseeResults.lookup,
    submittedIndex ? { indexNumber: submittedIndex } : "skip"
  )
  const isLookupLoading = Boolean(submittedIndex && lookup === undefined)

  function lookUpIndex(value: string) {
    const candidate = stripExamYear(value)
    const normalized = normalizeAcseeIndexNumber(candidate)

    if (!isPlausibleAcseeIndexNumber(normalized)) {
      setIndexInput(candidate)
      setIndexError("Weka namba kamili, mfano S0123/0505.")
      setSubmittedIndex("")
      return
    }

    setIndexError("")
    setIndexInput(formatAcseeIndexNumber(candidate))
    setSubmittedIndex(formatAcseeIndexNumber(candidate))
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

  return (
    <div className="bg-white font-poster text-kozi-ink">
      <FormSixHeader
        indexError={indexError}
        indexInput={indexInput}
        isLoading={isLookupLoading}
        onInput={setIndexInput}
        onReset={() => {
          setSubmittedIndex("")
          setIndexInput("")
          setIndexError("")
        }}
        onSubmit={(event: FormEvent<HTMLFormElement>) => {
          event.preventDefault()
          lookUpIndex(indexInput)
        }}
        submittedIndex={submittedIndex}
      />

      <div
        aria-live="polite"
        className="mx-auto flex w-full max-w-[1440px] flex-col gap-10 px-5 py-10 sm:px-10 lg:px-14 lg:py-12"
      >
        {!submittedIndex ? (
          <HowItWorks />
        ) : isLookupLoading ? (
          <LoadingBlock label="Tunatafuta matokeo yako ya ACSEE…" />
        ) : lookup?.status === "invalid_index" ? (
          <ProblemState
            title="Angalia namba hiyo"
            description="Tumia muundo kamili wa Form Six, mfano S0123/0505 au P0123/0501. Use the full index number."
          />
        ) : lookup?.status === "not_found" ? (
          <ProblemState
            title="Hatukupata matokeo"
            description="Angalia namba ya kituo na ya mtahiniwa. Huduma hii inatumia matokeo ya NECTA ACSEE 2026 pekee. No ACSEE 2026 result matches this number."
          />
        ) : lookup?.status === "not_released" ? (
          <ProblemState
            title="Matokeo haya hayawezi kukaguliwa"
            description="Matokeo yapo, lakini mtahiniwa hakuhudhuria au hakuna alama za masomo zinazotumika. The result has no usable subject grades."
          />
        ) : lookup?.result && lookup.profile ? (
          <>
            <StudentResultCard result={lookup.result} />
            <EligibilityResults profile={lookup.profile} />
          </>
        ) : null}
      </div>
    </div>
  )
}

function EligibilityResults({
  profile,
}: {
  profile: StudentEligibilityProfile
}) {
  const [courseQueryInput, setCourseQueryInput] = useState("")
  const [courseQuery, setCourseQuery] = useState("")
  const [awardFilter, setAwardFilter] = useState<AwardFilter>("all")
  const [fieldFilter, setFieldFilter] = useState("")
  const [regionFilter, setRegionFilter] = useState("")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")
  const [paging, setPaging] = useState({ key: "", count: PAGE_SIZE })
  const [filtersOpen, setFiltersOpen] = useState(false)

  useEffect(() => {
    const timeout = window.setTimeout(
      () => setCourseQuery(courseQueryInput.trim()),
      COURSE_QUERY_DEBOUNCE_MS
    )
    return () => window.clearTimeout(timeout)
  }, [courseQueryInput])

  const overviewArgs = (awardLevel: string) => ({
    profile,
    awardLevel,
    ...(courseQuery ? { query: courseQuery } : {}),
  })
  // One query per award level keeps each Convex read to a single slice.
  const degree = useQuery(
    api.programmes.eligibleOverview,
    overviewArgs("degree")
  )
  const diploma = useQuery(
    api.programmes.eligibleOverview,
    overviewArgs("ordinary diploma")
  )
  const certificate = useQuery(
    api.programmes.eligibleOverview,
    overviewArgs("certificate")
  )
  const overviews = [degree, diploma, certificate]
  const isLoading = overviews.some((overview) => overview === undefined)
  const loaded = overviews.filter(Boolean) as Overview[]

  const allRows = useMemo<OverviewRow[]>(
    () =>
      loaded
        .flatMap((overview) =>
          overview.rows.map((row) => ({
            ...row,
            awardLevel: overview.awardLevel,
          }))
        )
        .sort(
          (left, right) =>
            eligibilityStatusRank(right.status) -
              eligibilityStatusRank(left.status) ||
            right.fit - left.fit ||
            left.programmeName.localeCompare(right.programmeName)
        ),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- rows change only with the three query results
    [degree, diploma, certificate]
  )
  const capped = loaded.some((overview) => overview.capped)

  const matchesFacets = (
    row: OverviewRow,
    skip?: "award" | "field" | "region"
  ) =>
    (skip === "award" ||
      awardFilter === "all" ||
      row.awardLevel === awardFilter) &&
    (skip === "field" || !fieldFilter || row.fieldCategory === fieldFilter) &&
    (skip === "region" || !regionFilter || row.region === regionFilter)

  const facetRows = allRows.filter((row) => matchesFacets(row))
  const statusCounts = countStatuses(facetRows)
  const qualifyingRows = facetRows.filter(
    (row) =>
      row.status !== "not_eligible" &&
      (statusFilter === "all" || row.status === statusFilter)
  )
  const notMatchedRows = facetRows.filter(
    (row) => row.status === "not_eligible"
  )

  const fieldOptions = facetOptions(
    allRows.filter((row) => matchesFacets(row, "field")),
    (row) => row.fieldCategory
  )
  const regionOptions = facetOptions(
    allRows.filter((row) => matchesFacets(row, "region")),
    (row) => row.region
  )
  const awardCounts = Object.fromEntries(
    awardLevelTabs.map((tab) => [
      tab.value,
      allRows.filter(
        (row) =>
          row.awardLevel === tab.value &&
          matchesFacets(row, "award") &&
          row.status !== "not_eligible"
      ).length,
    ])
  )

  const pagingKey = JSON.stringify([
    courseQuery,
    awardFilter,
    fieldFilter,
    regionFilter,
    statusFilter,
  ])
  const visibleCount = paging.key === pagingKey ? paging.count : PAGE_SIZE
  const visibleRows = qualifyingRows.slice(0, visibleCount)
  const activeFilterCount = [
    awardFilter !== "all",
    Boolean(fieldFilter),
    Boolean(regionFilter),
    Boolean(courseQuery),
  ].filter(Boolean).length

  function clearFilters() {
    setAwardFilter("all")
    setFieldFilter("")
    setRegionFilter("")
    setStatusFilter("all")
    setCourseQueryInput("")
    setCourseQuery("")
  }

  return (
    <>
      <EligibilitySummary
        capped={capped}
        courseQuery={courseQuery}
        isLoading={isLoading}
        overviews={loaded}
      />

      <div className="grid min-w-0 gap-8 lg:grid-cols-[18rem_minmax(0,1fr)] lg:gap-12">
        <aside
          aria-label="Vichujio"
          className="flex h-fit min-w-0 flex-col gap-6 lg:sticky lg:top-6"
        >
          <button
            aria-controls="form-six-filters"
            aria-expanded={filtersOpen}
            className="flex items-center justify-between rounded-2xl border-[3px] border-kozi-ink bg-white px-5 py-3.5 shadow-[4px_4px_0_var(--kozi-ink)] lg:hidden"
            onClick={() => setFiltersOpen((open) => !open)}
            type="button"
          >
            <span className="font-display text-base text-kozi-ink">
              VICHUJIO
              {activeFilterCount > 0 ? ` · ${activeFilterCount}` : ""}
            </span>
            <span className="font-poster text-sm font-bold text-kozi-cobalt">
              {filtersOpen ? "Funga" : "Fungua"}
            </span>
          </button>

          <div
            className={`${filtersOpen ? "flex" : "hidden"} min-w-0 flex-col gap-6 lg:flex`}
            id="form-six-filters"
          >
            <div className="flex items-center justify-between">
              <p className="hidden font-display text-xl tracking-[-0.02em] lg:block">
                VICHUJIO
              </p>
              {activeFilterCount > 0 ? (
                <button
                  className="font-poster text-sm font-bold text-kozi-cobalt underline underline-offset-4"
                  onClick={clearFilters}
                  type="button"
                >
                  Futa zote
                </button>
              ) : null}
            </div>

            <FilterSection hint="Course interest" title="Kozi">
              <div className="flex items-center gap-2 rounded-xl border-[2.5px] border-kozi-ink bg-white px-3">
                <SearchIcon className="size-4 shrink-0" />
                <label className="sr-only" htmlFor="form-six-course">
                  Tafuta kozi
                </label>
                <input
                  className="h-11 min-w-0 flex-1 bg-transparent font-poster text-[15px] font-semibold placeholder:font-normal placeholder:text-[#6b6b73] focus:outline-none"
                  id="form-six-course"
                  onChange={(event) => setCourseQueryInput(event.target.value)}
                  placeholder="mf. nursing, sheria, ICT"
                  type="search"
                  value={courseQueryInput}
                />
                {courseQueryInput ? (
                  <button
                    aria-label="Futa kozi"
                    className="grid size-7 place-items-center rounded-full text-kozi-ink/50 hover:text-kozi-ink"
                    onClick={() => setCourseQueryInput("")}
                    type="button"
                  >
                    <XIcon className="size-3.5" />
                  </button>
                ) : null}
              </div>
            </FilterSection>

            <FilterSection hint="Award level" title="Ngazi">
              <div
                aria-label="Ngazi ya kozi"
                className="flex flex-wrap gap-2"
                role="group"
              >
                <Chip
                  onClick={() => setAwardFilter("all")}
                  selected={awardFilter === "all"}
                >
                  Zote
                </Chip>
                {awardLevelTabs.map((tab) => (
                  <Chip
                    count={awardCounts[tab.value]}
                    key={tab.value}
                    onClick={() =>
                      setAwardFilter(
                        awardFilter === tab.value ? "all" : tab.value
                      )
                    }
                    selected={awardFilter === tab.value}
                  >
                    {tab.label}
                  </Chip>
                ))}
              </div>
            </FilterSection>

            <FilterSection hint="Field" title="Fani">
              <FacetSelect
                allLabel="Fani zote"
                label="Chagua fani"
                onChange={setFieldFilter}
                options={fieldOptions.map((option) => ({
                  ...option,
                  label: fieldCategoryLabel(option.value).swahili,
                }))}
                value={fieldFilter}
              />
            </FilterSection>

            <FilterSection hint="Region" last title="Mkoa">
              <FacetSelect
                allLabel="Mikoa yote"
                label="Chagua mkoa"
                onChange={setRegionFilter}
                options={regionOptions.map((option) => ({
                  ...option,
                  label: option.value,
                }))}
                value={regionFilter}
              />
            </FilterSection>
          </div>
        </aside>

        <section className="flex min-w-0 flex-col gap-6">
          <StatusChips
            counts={statusCounts}
            onChange={setStatusFilter}
            selected={statusFilter}
          />

          {isLoading ? (
            <LoadingBlock label="Tunakagua masharti ya kozi zote…" />
          ) : qualifyingRows.length === 0 ? (
            <ProblemState
              title="Hakuna kozi hapa"
              description={
                activeFilterCount > 0 || statusFilter !== "all"
                  ? "Ondoa kichujio kimoja au zaidi uone kozi zaidi. Clear a filter to see more courses."
                  : "Hatukupata kozi unazofuzu kwa matokeo haya. Angalia sehemu ya kozi ambazo bado hazikufai hapa chini."
              }
            />
          ) : (
            <ResultList
              profile={profile}
              rows={visibleRows}
              total={qualifyingRows.length}
              onMore={() =>
                setPaging({ key: pagingKey, count: visibleCount + PAGE_SIZE })
              }
            />
          )}

          {!isLoading && notMatchedRows.length > 0 ? (
            <NotMatchedSection key={pagingKey} rows={notMatchedRows} />
          ) : null}
        </section>
      </div>
    </>
  )
}

function EligibilitySummary({
  capped,
  courseQuery,
  isLoading,
  overviews,
}: {
  capped: boolean
  courseQuery: string
  isLoading: boolean
  overviews: Overview[]
}) {
  if (isLoading) {
    return (
      <div
        aria-hidden
        className="h-48 animate-pulse rounded-[20px] border-[3px] border-kozi-ink/15 bg-kozi-yellow/20"
      />
    )
  }

  const total = sumCounts(overviews.map((overview) => overview.counts))
  const plus = capped ? "+" : ""
  const levels = awardLevelTabs
    .map((tab) => ({
      ...tab,
      overview: overviews.find((overview) => overview.awardLevel === tab.value),
    }))
    .filter((level) => level.overview && level.overview.scanned > 0) as Array<
    (typeof awardLevelTabs)[number] & { overview: Overview }
  >

  return (
    <section
      aria-label="Muhtasari"
      className="overflow-hidden rounded-[20px] border-[3px] border-kozi-ink bg-kozi-ink text-white shadow-[6px_6px_0_var(--kozi-cobalt)]"
    >
      <div className="flex flex-col gap-6 p-6 lg:flex-row lg:items-end lg:justify-between lg:p-8">
        <div className="flex min-w-0 flex-col gap-2">
          <p className="font-tag text-[11px] font-semibold tracking-[0.1em] text-kozi-yellow/80">
            {courseQuery
              ? `KWA UTAFUTAJI “${courseQuery.toUpperCase()}”`
              : "KWA MATOKEO YAKO"}
          </p>
          <h2 className="font-display text-[44px] leading-[0.92] tracking-[-0.04em] text-kozi-yellow sm:text-[64px]">
            UNAFUZU KOZI {total.eligible}
            {plus}
          </h2>
          <p className="font-poster text-base font-semibold text-white/85 sm:text-lg">
            +{total.likely_eligible_but_verify}
            {plus} huenda unafuzu (thibitisha na chuo) ·{" "}
            {total.cannot_determine}
            {plus} zinahitaji uhakiki
          </p>
          <p className="font-poster text-sm text-white/60">
            You meet the published minimum for {total.eligible}
            {plus} courses; {total.likely_eligible_but_verify}
            {plus} more look likely but need confirming.
          </p>
        </div>
        <p className="font-poster text-sm text-white/70 lg:max-w-[260px] lg:text-right">
          {total.not_eligible}
          {plus} hujafikia sifa bado — tumeziweka mwisho na tunaonyesha
          kinachokosekana.
        </p>
      </div>

      <dl className="grid border-t-2 border-white/15 sm:grid-cols-3">
        {levels.map((level) => (
          <div
            className="flex flex-col gap-1 border-white/15 px-6 py-4 max-sm:border-t-2 max-sm:first:border-t-0 sm:border-l-2 sm:first:border-l-0 lg:px-8"
            key={level.value}
          >
            <dt className="font-display text-[13px] tracking-[0.04em] text-kozi-yellow uppercase">
              {level.label} · {level.swahili}
            </dt>
            <dd className="font-poster text-[15px] text-white">
              <strong className="font-display text-xl">
                {level.overview.counts.eligible}
              </strong>{" "}
              unafuzu ·{" "}
              <strong className="font-display text-xl">
                {level.overview.counts.likely_eligible_but_verify}
              </strong>{" "}
              huenda
            </dd>
            <dd className="font-tag text-[11px] text-white/55">
              {level.overview.capped
                ? `Tumekagua kozi ${level.overview.scanLimit} za kwanza (${level.overview.scanLimit}+)`
                : `Kati ya kozi ${level.overview.scanned} zilizokaguliwa`}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

function StatusChips({
  counts,
  onChange,
  selected,
}: {
  counts: Record<EligibilityStatus, number>
  onChange: (status: StatusFilter) => void
  selected: StatusFilter
}) {
  const qualifyingTotal = qualifyingStatuses.reduce(
    (total, status) => total + counts[status],
    0
  )
  const statuses = qualifyingStatuses.filter(
    (status) => status !== "interest_match_only" || counts[status] > 0
  )

  return (
    <div
      aria-label="Chuja kwa hali"
      className="flex flex-wrap gap-2 border-b-[3px] border-kozi-ink pb-5"
      role="group"
    >
      <Chip
        count={qualifyingTotal}
        onClick={() => onChange("all")}
        selected={selected === "all"}
      >
        Zote zinazofaa
      </Chip>
      {statuses.map((status) => (
        <Chip
          count={counts[status]}
          disabled={counts[status] === 0}
          dotClassName={statusCopy[status].dot}
          key={status}
          onClick={() => onChange(selected === status ? "all" : status)}
          selected={selected === status}
        >
          {statusCopy[status].label}
        </Chip>
      ))}
    </div>
  )
}

function ResultList({
  onMore,
  profile,
  rows,
  total,
}: {
  onMore: () => void
  profile: StudentEligibilityProfile
  rows: OverviewRow[]
  total: number
}) {
  return (
    <div className="flex min-w-0 flex-col gap-5">
      {rows.map((row, index) => {
        const startsGroup = index === 0 || rows[index - 1].status !== row.status
        return (
          <div className="flex min-w-0 flex-col gap-5" key={row._id}>
            {startsGroup ? <GroupHeading status={row.status} /> : null}
            <EligibilityResultCard profile={profile} row={row} />
          </div>
        )
      })}
      <div className="flex flex-col items-center gap-3 pt-2 text-center">
        {rows.length < total ? (
          <button
            className="rounded-full border-[3px] border-kozi-ink bg-kozi-yellow px-8 py-4 font-display text-base text-kozi-ink shadow-[5px_5px_0_var(--kozi-ink)] transition-transform hover:-translate-y-0.5"
            onClick={onMore}
            type="button"
          >
            ONYESHA ZAIDI
          </button>
        ) : null}
        <p className="font-poster text-sm text-kozi-graphite">
          Unaona {rows.length} kati ya {total}
        </p>
      </div>
    </div>
  )
}

function GroupHeading({ status }: { status: EligibilityStatus }) {
  const copy = statusCopy[status]
  return (
    <div className="flex min-w-0 flex-col gap-1 pt-2">
      <div className="flex items-center gap-3">
        <StatusPill status={status} />
        <p className="font-tag text-[11px] tracking-[0.06em] text-kozi-graphite uppercase">
          {copy.english}
        </p>
      </div>
      <p className="font-poster text-sm leading-5 text-kozi-ink/75">
        {copy.description}
      </p>
    </div>
  )
}

function NotMatchedSection({ rows }: { rows: OverviewRow[] }) {
  const [count, setCount] = useState(NOT_MATCHED_PAGE_SIZE)
  const visible = rows.slice(0, count)

  return (
    <details className="group rounded-[20px] border-[3px] border-kozi-ink bg-[#f6f6f7]">
      <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3 px-5 py-4 sm:px-6 [&::-webkit-details-marker]:hidden">
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="font-display text-lg tracking-[-0.01em] text-kozi-ink">
            HUJAFIKIA SIFA BADO · {rows.length}
          </span>
          <span className="font-poster text-sm text-kozi-graphite">
            Kozi ambazo sharti moja au zaidi halijakidhiwa — na kinachokosekana.
          </span>
        </span>
        <span className="rounded-full border-2 border-kozi-ink bg-white px-3 py-1 font-poster text-sm font-bold">
          <span className="group-open:hidden">Onyesha</span>
          <span className="hidden group-open:inline">Ficha</span>
        </span>
      </summary>
      <ul className="flex flex-col border-t-[3px] border-kozi-ink">
        {visible.map((row) => (
          <li
            className="flex min-w-0 flex-col gap-1.5 border-b-2 border-kozi-ink/10 bg-white px-5 py-4 last:border-b-0 sm:px-6"
            key={row._id}
          >
            <p className="font-tag text-[11px] tracking-[0.08em] text-kozi-graphite uppercase">
              {awardLevelTabs.find((tab) => tab.value === row.awardLevel)
                ?.label ?? row.awardLevel}{" "}
              · {row.region ?? "—"}
            </p>
            <p className="font-poster text-base font-bold break-words text-kozi-ink">
              {row.programmeName}
            </p>
            <p className="font-poster text-sm break-words text-kozi-ink/70">
              {row.institutionName}
            </p>
            {row.missing.length > 0 ? (
              <ul className="mt-1 flex flex-col gap-1">
                {row.missing.map((line) => (
                  <li
                    className="flex items-start gap-2 font-poster text-sm leading-5 text-[#9b1c14]"
                    key={line}
                  >
                    <span aria-hidden className="font-display">
                      ✗
                    </span>
                    <span className="min-w-0 break-words">{line}</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </li>
        ))}
      </ul>
      {count < rows.length ? (
        <div className="border-t-[3px] border-kozi-ink bg-white px-5 py-4 text-center sm:px-6">
          <button
            className="font-poster text-sm font-bold text-kozi-cobalt underline underline-offset-4"
            onClick={() => setCount(count + NOT_MATCHED_PAGE_SIZE)}
            type="button"
          >
            Onyesha {Math.min(NOT_MATCHED_PAGE_SIZE, rows.length - count)} zaidi
          </button>
        </div>
      ) : null}
    </details>
  )
}

function HowItWorks() {
  const steps = [
    {
      title: "Weka namba",
      text: "Namba ya mtihani wa ACSEE 2026, mfano S0123/0505.",
    },
    {
      title: "Tunakagua masharti",
      text: "Matokeo yako yanalinganishwa na masharti ya TCU na NACTVET kwa kila kozi.",
    },
    {
      title: "Unaona kwa nini",
      text: "Kila kozi inaonyesha sharti lililokidhiwa (✓) na lililokosekana (✗).",
    },
  ]
  return (
    <ol className="grid gap-4 md:grid-cols-3">
      {steps.map((step, index) => (
        <li
          className="flex flex-col gap-2 rounded-[20px] border-[3px] border-kozi-ink bg-white p-6 shadow-[5px_5px_0_var(--kozi-ink)]"
          key={step.title}
        >
          <span className="font-display text-[40px] leading-none text-kozi-cobalt">
            0{index + 1}
          </span>
          <p className="font-display text-lg text-kozi-ink">
            {step.title.toUpperCase()}
          </p>
          <p className="font-poster text-[15px] leading-6 text-kozi-ink/75">
            {step.text}
          </p>
        </li>
      ))}
    </ol>
  )
}

function FilterSection({
  children,
  hint,
  last = false,
  title,
}: {
  children: ReactNode
  hint: string
  last?: boolean
  title: string
}) {
  return (
    <div
      className={`flex min-w-0 flex-col gap-3 ${last ? "" : "border-b-[3px] border-kozi-ink pb-6"}`}
    >
      <div className="flex items-baseline justify-between">
        <p className="font-display text-[15px] tracking-[0.04em] uppercase">
          {title}
        </p>
        <p className="font-tag text-[11px] text-kozi-graphite">{hint}</p>
      </div>
      {children}
    </div>
  )
}

function FacetSelect({
  allLabel,
  label,
  onChange,
  options,
  value,
}: {
  allLabel: string
  label: string
  onChange: (value: string) => void
  options: Array<{ value: string; label: string; count: number }>
  value: string
}) {
  return (
    <select
      aria-label={label}
      className="h-12 w-full min-w-0 cursor-pointer rounded-xl border-[2.5px] border-kozi-ink bg-white px-3 font-poster text-[15px] font-semibold text-kozi-ink outline-none focus-visible:ring-4 focus-visible:ring-kozi-yellow"
      onChange={(event) => onChange(event.target.value)}
      value={value}
    >
      <option value="">{allLabel}</option>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label} ({option.count})
        </option>
      ))}
    </select>
  )
}

function Chip({
  children,
  count,
  disabled = false,
  dotClassName,
  onClick,
  selected,
}: {
  children: ReactNode
  count?: number
  disabled?: boolean
  dotClassName?: string
  onClick: () => void
  selected: boolean
}) {
  return (
    <button
      aria-pressed={selected}
      className={`inline-flex items-center gap-2 rounded-full border-2 border-kozi-ink px-3.5 py-2 font-poster text-sm font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
        selected
          ? "bg-kozi-ink text-kozi-yellow"
          : "bg-white text-kozi-ink hover:bg-kozi-yellow"
      }`}
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {dotClassName ? (
        <span
          aria-hidden
          className={`size-2.5 rounded-full border border-kozi-ink ${dotClassName}`}
        />
      ) : null}
      {children}
      {count !== undefined ? (
        <span className="font-tag text-xs">{count}</span>
      ) : null}
    </button>
  )
}

function LoadingBlock({ label }: { label: string }) {
  return (
    <div
      className="flex items-center gap-4 rounded-[20px] border-[3px] border-kozi-ink bg-white p-6"
      role="status"
    >
      <span
        aria-hidden
        className="size-6 animate-spin rounded-full border-[3px] border-kozi-ink border-t-kozi-yellow"
      />
      <p className="font-poster text-base font-semibold">{label}</p>
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
    <div
      className="rounded-[20px] border-[3px] border-dashed border-kozi-ink bg-white p-8 text-center"
      role="status"
    >
      <p className="font-display text-xl text-kozi-ink">
        {title.toUpperCase()}
      </p>
      <p className="mx-auto mt-2 max-w-[560px] font-poster text-sm leading-6 text-kozi-graphite">
        {description}
      </p>
    </div>
  )
}

function countStatuses(rows: OverviewRow[]) {
  const counts: Record<EligibilityStatus, number> = {
    eligible: 0,
    likely_eligible_but_verify: 0,
    cannot_determine: 0,
    interest_match_only: 0,
    not_eligible: 0,
  }
  for (const row of rows) counts[row.status] += 1
  return counts
}

function sumCounts(list: Array<Record<EligibilityStatus, number>>) {
  const total = countStatuses([])
  for (const counts of list) {
    for (const status of Object.keys(total) as EligibilityStatus[]) {
      total[status] += counts[status]
    }
  }
  return total
}

function facetOptions(
  rows: OverviewRow[],
  pick: (row: OverviewRow) => string | undefined
) {
  const counts = new Map<string, number>()
  for (const row of rows) {
    const value = pick(row)
    if (value) counts.set(value, (counts.get(value) ?? 0) + 1)
  }
  return Array.from(counts, ([value, count]) => ({ value, count })).sort(
    (left, right) =>
      right.count - left.count || left.value.localeCompare(right.value)
  )
}
