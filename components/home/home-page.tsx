import { HomeHero } from "@/components/home/home-hero"
import {
  CourseTicker,
  FieldsSection,
  IndexCheckSection,
  PathwaysSection,
  UniversitiesSection,
} from "@/components/home/home-sections"

// Home page in the "matatu poster" direction (Paper: 03 · Home · Matatu poster).
export function HomePage() {
  return (
    <div className="bg-white font-poster text-kozi-ink">
      <HomeHero />
      <CourseTicker />
      <PathwaysSection />
      <FieldsSection />
      <IndexCheckSection />
      <UniversitiesSection />
    </div>
  )
}
