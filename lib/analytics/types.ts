export type AnalyticsSex = "all" | "female" | "male"

export type Grade = "A" | "B" | "C" | "D" | "E" | "S" | "F"

export type CandidateStats = {
  candidates: number
  released: number
  absent: number
  notEligible: number
  absenceRate: number | null
  divisions: Record<"I" | "II" | "III" | "IV" | "0", number>
  divisionOne: number
  divisionOneRate: number | null
  divisionOneTwo: number
  divisionOneTwoRate: number | null
}

export type SubjectStats = {
  sittings: number
  aCount: number
  aRate: number | null
  abcCount: number
  abcRate: number | null
  principalPassCount: number
  principalPassRate: number | null
  grades: Record<Grade, number>
  excluded: number
  excludedGrades: Record<"X" | "I" | "other", number>
}

export type CombinationStats = {
  candidates: number
  gradeEntries: number
  aCount: number
  abcCount: number
  abcRate: number | null
  allAbcCount: number
  allAbcRate: number | null
  principalPassCount: number
  principalPassRate: number | null
  grades: Record<Grade, number>
}

export type SexBreakdown<T> = Record<AnalyticsSex, T>

export type CentreLeader = {
  code: string
  name: string
  region: string | null
  council: string | null
  sittings: number
  successes: number
  rate: number
  rankScore: number
  rank: number
}

export type AnalyticsSubject = {
  key: string
  name: string
  stats: SexBreakdown<SubjectStats>
  leaders: SexBreakdown<CentreLeader[]>
}

export type CombinationCentreLeader = {
  code: string
  name: string
  region: string | null
  council: string | null
  candidates: number
  gradeEntries: number
  successes: number
  rate: number
  allAbcCount: number
  allAbcRate: number
  aCount: number
  rankScore: number
  rank: number
}

export type AnalyticsCombination = {
  key: string
  label: string
  name: string
  subjects: string[]
  stats: SexBreakdown<CombinationStats>
  leaders: SexBreakdown<CombinationCentreLeader[]>
}

export type AnalyticsRegion = {
  key: string
  name: string
  candidates: SexBreakdown<CandidateStats>
  subjects: Record<string, SexBreakdown<SubjectStats>>
}

export type AnalyticsSource = {
  id: string
  label: string
  url: string
}

export type AcseeAnalyticsData = {
  metadata: {
    title: string
    examType: string
    examYear: number
    generatedAt: string
    methodologyVersion: string
    sources: AnalyticsSource[]
    thresholds: {
      regionalRateMinimum: number
      centreSubjectMinimum: number
      centreCombinationMinimum: number
      centreOverallMinimum: number
      centreRankingMethod: string
      combinationMethod: string
    }
    gradeRules: {
      validGrades: Grade[]
      principalPassGrades: Grade[]
      strongPassGrades: Grade[]
      excludedGrades: string[]
      excludedSubjectGradeEntries: number
    }
    regionalCoverage: {
      mappedCandidates: number
      totalCandidates: number
      mappedPercent: number
      mappedCentres: number
      totalCentres: number
      mappedCentrePercent: number
      mappedRegions: number
      sourceCounts: {
        tamisemiCentreCode: number
        schoolRegisterName: number
        unmatched: number
      }
    }
  }
  national: SexBreakdown<CandidateStats>
  subjects: AnalyticsSubject[]
  combinations: AnalyticsCombination[]
  regions: AnalyticsRegion[]
  centreLeaders: {
    overall: CentreLeader[]
  }
}

export type GeoJsonGeometry =
  | { type: "Polygon"; coordinates: number[][][] }
  | { type: "MultiPolygon"; coordinates: number[][][][] }

export type TanzaniaRegionsGeoJson = {
  type: "FeatureCollection"
  features: Array<{
    type: "Feature"
    properties: {
      reg_code: string
      reg_name: string
    }
    geometry: GeoJsonGeometry
  }>
}
