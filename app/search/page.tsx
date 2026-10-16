import { Suspense } from "react"

import { SearchPageClient } from "@/components/search/search-page-client"
import { pageMetadata } from "@/lib/site-metadata"

export const metadata = pageMetadata({
  title: "Tafuta kozi",
  description:
    "Tafuta kozi kwa jina, career au fani, na chuja kwa ngazi na mkoa. Search Tanzanian degree, diploma and certificate courses.",
  path: "/search",
})

export default function SearchPage() {
  return (
    <Suspense fallback={null}>
      <SearchPageClient />
    </Suspense>
  )
}
