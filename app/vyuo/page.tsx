import { VyuoPageClient } from "@/components/vyuo/vyuo-page-client"
import { pageMetadata } from "@/lib/site-metadata"

export const metadata = pageMetadata({
  title: "Vyuo Tanzania",
  description:
    "Orodha ya vyuo vikuu, vyuo vya kati na vya ufundi Tanzania kwa mkoa na kozi. Browse universities and colleges across Tanzania.",
  path: "/vyuo",
})

export default async function VyuoPage() {
  return <VyuoPageClient />
}
