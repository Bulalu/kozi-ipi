import { EligibilityPageClient } from "@/components/eligibility/eligibility-page-client"
import { pageMetadata } from "@/lib/site-metadata"

export const metadata = pageMetadata({
  title: "Angalia sifa zako",
  description:
    "Weka matokeo yako uone kozi ambazo huenda unafuzu kwa njia ya Form Four, Form Six, cheti au diploma. Check which courses you may qualify for.",
  path: "/eligibility",
})

export default function EligibilityPage() {
  return <EligibilityPageClient />
}
