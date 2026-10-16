import type { Metadata } from "next"
import { Archivo, Fraunces, IBM_Plex_Mono } from "next/font/google"

import { FableExperience } from "@/components/analytics/fable/fable-experience"
import analyticsJson from "@/lib/analytics/generated/acsee-analytics-2026.json"
import regionsJson from "@/lib/analytics/generated/tanzania-regions-2022.json"
import type {
  AcseeAnalyticsData,
  TanzaniaRegionsGeoJson,
} from "@/lib/analytics/types"

const displayFont = Fraunces({
  subsets: ["latin"],
  axes: ["opsz"],
  variable: "--font-fable-display",
  display: "swap",
})

const bodyFont = Archivo({
  subsets: ["latin"],
  variable: "--font-fable-body",
  display: "swap",
})

const monoFont = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-fable-mono",
  display: "swap",
})

export const metadata: Metadata = {
  title: "The Form Six Almanac — ACSEE 2026",
  description:
    "An editorial reading of Tanzania's ACSEE 2026 Form Six results: national divisions, regional outcomes, subject grade ledgers, and the best-performing schools.",
}

export default function FableAnalyticsPage() {
  return (
    <div
      className={`${displayFont.variable} ${bodyFont.variable} ${monoFont.variable}`}
    >
      <FableExperience
        data={analyticsJson as unknown as AcseeAnalyticsData}
        geo={regionsJson as TanzaniaRegionsGeoJson}
      />
    </div>
  )
}
