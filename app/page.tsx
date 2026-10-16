import { HomePage } from "@/components/home/home-page"
import { pageMetadata } from "@/lib/site-metadata"

export const metadata = pageMetadata({
  title: "Kozi Ipi — Kozi na vyuo Tanzania",
  absoluteTitle: true,
  description:
    "Tafuta kozi na vyuo Tanzania baada ya Form Four, Form Six au diploma, na angalia sifa zako. Find Tanzanian courses and colleges and check your entry requirements.",
  path: "/",
})

export default function Page() {
  return <HomePage />
}
