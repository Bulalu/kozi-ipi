"use client"

import { useSearchParams } from "next/navigation"

import { SearchResultsClient } from "@/components/search/search-results-client"

// Reads the query string on the client. The static export needs this to
// render inside a Suspense boundary (see app/search/page.tsx).
export function SearchPageClient() {
  const searchParams = useSearchParams()
  return (
    <SearchResultsClient
      initialSearchParams={Array.from(searchParams.entries())}
    />
  )
}
