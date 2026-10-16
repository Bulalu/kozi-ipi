import { FormSixLookupClient } from "@/components/form-six/form-six-lookup-client"
import { pageMetadata } from "@/lib/site-metadata"

export const metadata = pageMetadata({
  title: "Form Six: unafuzu kozi gani?",
  description:
    "Weka namba yako ya mtihani wa ACSEE uone kozi unazofuzu, zinazokufaa zaidi, na kwa nini nyingine hazikufai. Check your Form Six result against TCU and NACTVET entry requirements.",
  path: "/form-six",
})

export default function FormSixPage() {
  return <FormSixLookupClient />
}
