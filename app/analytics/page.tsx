import type { Metadata } from "next"

import { AcseeAnalyticsClient } from "@/components/analytics/acsee-analytics-client"
import analyticsJson from "@/lib/analytics/generated/acsee-analytics-2026.json"
import regionsJson from "@/lib/analytics/generated/tanzania-regions-2022.json"
import type {
  AcseeAnalyticsData,
  TanzaniaRegionsGeoJson,
} from "@/lib/analytics/types"

export const metadata: Metadata = {
  title: "ACSEE 2026 Analytics",
  description:
    "Explore Form Six results across Tanzania by region, subject, sex, grade, and examination centre.",
}

export default function AnalyticsPage() {
  return (
    <AcseeAnalyticsClient
      data={analyticsJson as unknown as AcseeAnalyticsData}
      geoData={regionsJson as TanzaniaRegionsGeoJson}
    />
  )
}
