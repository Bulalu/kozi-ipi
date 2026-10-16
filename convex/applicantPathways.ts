import type { Doc } from "./_generated/dataModel"
import type { QueryCtx } from "./_generated/server"
import { applicationRouteValidator } from "./applicantPathwayValidators"
import {
  applicantPathwayFlagValue,
  type ApplicantPathwayFlagRecord,
  type ApplicationRoute,
  type Suitability,
} from "../lib/domain/applicant-pathways"

export type { ApplicationRoute }
export { applicationRouteValidator }

export function getProgrammeApplicantPathwayFlag(
  programme: ApplicantPathwayFlagRecord,
  route: ApplicationRoute
): Suitability {
  return applicantPathwayFlagValue(programme, route)
}

export async function queryProgrammesByApplicantPathway(
  ctx: QueryCtx,
  route: ApplicationRoute,
  limit: number
): Promise<Doc<"programmes">[]> {
  if (route === "form_four") {
    return await ctx.db
      .query("programmes")
      .withIndex("by_acceptsFormFourDirect", (q) =>
        q.eq("acceptsFormFourDirect", "yes")
      )
      .take(limit)
  }
  if (route === "form_six") {
    return await ctx.db
      .query("programmes")
      .withIndex("by_acceptsFormSix", (q) => q.eq("acceptsFormSix", "yes"))
      .take(limit)
  }
  if (route === "certificate") {
    return await ctx.db
      .query("programmes")
      .withIndex("by_acceptsCertificate", (q) =>
        q.eq("acceptsCertificate", "yes")
      )
      .take(limit)
  }
  if (route === "diploma") {
    return await ctx.db
      .query("programmes")
      .withIndex("by_acceptsDiploma", (q) => q.eq("acceptsDiploma", "yes"))
      .take(limit)
  }

  return await ctx.db
    .query("programmes")
    .withIndex("by_acceptsEquivalent", (q) => q.eq("acceptsEquivalent", "yes"))
    .take(limit)
}

// Route candidates for one award level. Form Six has a compound index so a
// degree or diploma slice is read on its own; other routes filter the route
// index in memory, which is bounded by `scanLimit`.
export async function queryProgrammesByApplicantPathwayAndAwardLevel(
  ctx: QueryCtx,
  route: ApplicationRoute,
  awardLevel: string,
  limit: number,
  scanLimit = limit * 4
): Promise<Doc<"programmes">[]> {
  if (route === "form_six") {
    return await ctx.db
      .query("programmes")
      .withIndex("by_acceptsFormSix_and_awardLevel", (q) =>
        q.eq("acceptsFormSix", "yes").eq("awardLevel", awardLevel)
      )
      .take(limit)
  }

  const routeResults = await queryProgrammesByApplicantPathway(
    ctx,
    route,
    scanLimit
  )
  return routeResults
    .filter((programme) => programme.awardLevel === awardLevel)
    .slice(0, limit)
}

export async function queryEntryRequirementsByApplicantPathway(
  ctx: QueryCtx,
  route: ApplicationRoute,
  value: Suitability,
  limit: number
): Promise<Doc<"entryRequirements">[]> {
  if (route === "form_four") {
    return await ctx.db
      .query("entryRequirements")
      .withIndex("by_acceptsFormFourDirect", (q) =>
        q.eq("acceptsFormFourDirect", value)
      )
      .take(limit)
  }
  if (route === "form_six") {
    return await ctx.db
      .query("entryRequirements")
      .withIndex("by_acceptsFormSix", (q) => q.eq("acceptsFormSix", value))
      .take(limit)
  }
  if (route === "certificate") {
    return await ctx.db
      .query("entryRequirements")
      .withIndex("by_acceptsCertificate", (q) =>
        q.eq("acceptsCertificate", value)
      )
      .take(limit)
  }
  if (route === "diploma") {
    return await ctx.db
      .query("entryRequirements")
      .withIndex("by_acceptsDiploma", (q) => q.eq("acceptsDiploma", value))
      .take(limit)
  }

  return await ctx.db
    .query("entryRequirements")
    .withIndex("by_acceptsEquivalent", (q) => q.eq("acceptsEquivalent", value))
    .take(limit)
}
