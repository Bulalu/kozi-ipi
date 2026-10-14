import type {
  AnalyticsSex,
  GeoJsonGeometry,
  Grade,
} from "@/lib/analytics/types"

export const INTEGER_FORMAT = new Intl.NumberFormat("en-TZ")
export const COMPACT_FORMAT = new Intl.NumberFormat("en-TZ", {
  notation: "compact",
  maximumFractionDigits: 1,
})

export function formatInt(value: number): string {
  return INTEGER_FORMAT.format(value)
}

export function formatCompact(value: number): string {
  return COMPACT_FORMAT.format(value)
}

export function formatRate(value: number | null): string {
  if (value === null || Number.isNaN(value)) return "—"
  return `${value.toLocaleString("en-TZ", { maximumFractionDigits: 1 })}%`
}

export const GRADE_ORDER: Grade[] = ["A", "B", "C", "D", "E", "S", "F"]

/**
 * Grade hues validated with the dataviz palette checker against the almanac
 * surface (#121712): lightness band, chroma floor, CVD separation, and
 * 3:1 contrast all pass. Segments additionally carry 2px gaps and direct
 * labels, so identity never rides on color alone.
 */
export const GRADE_COLORS: Record<Grade, string> = {
  A: "#23ad7b",
  B: "#408c45",
  C: "#00809a",
  D: "#b78d24",
  E: "#97641e",
  S: "#7a77bc",
  F: "#c25b50",
}

export type DivisionKey = "I" | "II" | "III" | "IV" | "0"

export const DIVISION_ORDER: DivisionKey[] = ["I", "II", "III", "IV", "0"]

export const DIVISION_LABELS: Record<DivisionKey, string> = {
  I: "Division I",
  II: "Division II",
  III: "Division III",
  IV: "Division IV",
  "0": "Division 0",
}

export const DIVISION_COLORS: Record<DivisionKey, string> = {
  I: "#e3b158",
  II: "#23ad7b",
  III: "#00809a",
  IV: "#97641e",
  "0": "#c25b50",
}

/**
 * Sequential choropleth ramp (single green hue, monotone lightness).
 * The near-zero end is allowed to recede toward the dark surface;
 * every region also appears in the adjacent ranked list with its value.
 */
export const MAP_RAMP = [
  "#1f3a2c",
  "#2a543d",
  "#38714f",
  "#4c9265",
  "#68b57e",
  "#8fd79c",
]

export const MAP_NO_DATA = "#181d18"

export const SEX_OPTIONS: Array<{ value: AnalyticsSex; label: string }> = [
  { value: "all", label: "Everyone" },
  { value: "female", label: "Girls" },
  { value: "male", label: "Boys" },
]

export const SEX_PHRASE: Record<AnalyticsSex, string> = {
  all: "all candidates",
  female: "girls",
  male: "boys",
}

/** Break values into ramp bins using quantiles so classes stay balanced. */
export function buildQuantileScale(
  values: number[],
  steps: number
): (value: number) => number {
  const sorted = [...values].sort((a, b) => a - b)
  if (sorted.length === 0) return () => 0
  const thresholds: number[] = []
  for (let index = 1; index < steps; index += 1) {
    const position = (index / steps) * (sorted.length - 1)
    const low = Math.floor(position)
    const high = Math.ceil(position)
    const fraction = position - low
    thresholds.push(sorted[low] * (1 - fraction) + sorted[high] * fraction)
  }
  return (value: number) => {
    let bin = 0
    while (bin < thresholds.length && value > thresholds[bin]) bin += 1
    return bin
  }
}

export type MapProjection = (lon: number, lat: number) => [number, number]

export function buildGeometryPath(
  geometry: GeoJsonGeometry,
  project: MapProjection
): string {
  const polygons =
    geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates
  const commands: string[] = []
  for (const polygon of polygons) {
    for (const ring of polygon) {
      ring.forEach((coordinate, index) => {
        const [x, y] = project(coordinate[0], coordinate[1])
        commands.push(
          `${index === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`
        )
      })
      commands.push("Z")
    }
  }
  return commands.join("")
}

export function normalizeRegionKey(name: string): string {
  return name.trim().toLowerCase()
}
