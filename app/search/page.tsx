"use client"

import { Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { SearchResultsClient } from "@/components/search/search-results-client"

function SearchFromUrl() {
  const searchParams = useSearchParams()
  return (
    <SearchResultsClient
      initialSearchParams={Array.from(searchParams.entries())}
    />
  )
}

export default function SearchPage() {
  return (
    <Suspense fallback={null}>
      <SearchFromUrl />
    </Suspense>
  )
}
