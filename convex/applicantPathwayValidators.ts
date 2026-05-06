import { v } from "convex/values"

export const applicationRouteValidator = v.union(
  v.literal("form_four"),
  v.literal("form_six"),
  v.literal("certificate"),
  v.literal("diploma"),
  v.literal("equivalent")
)
