/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as acseeResults from "../acseeResults.js";
import type * as applicantPathwayValidators from "../applicantPathwayValidators.js";
import type * as applicantPathways from "../applicantPathways.js";
import type * as corrections from "../corrections.js";
import type * as entryRequirements from "../entryRequirements.js";
import type * as http from "../http.js";
import type * as institutions from "../institutions.js";
import type * as programmeEligibility_search from "../programmeEligibility/search.js";
import type * as programmeSearch_candidates from "../programmeSearch/candidates.js";
import type * as programmeSearch_display from "../programmeSearch/display.js";
import type * as programmeSearch_filters from "../programmeSearch/filters.js";
import type * as programmeSearch_interpret from "../programmeSearch/interpret.js";
import type * as programmeSearch_matching from "../programmeSearch/matching.js";
import type * as programmeSearch_pagination from "../programmeSearch/pagination.js";
import type * as programmeSearch_ranking from "../programmeSearch/ranking.js";
import type * as programmeSearch_search from "../programmeSearch/search.js";
import type * as programmes from "../programmes.js";
import type * as rateLimits from "../rateLimits.js";
import type * as searchEvents from "../searchEvents.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  acseeResults: typeof acseeResults;
  applicantPathwayValidators: typeof applicantPathwayValidators;
  applicantPathways: typeof applicantPathways;
  corrections: typeof corrections;
  entryRequirements: typeof entryRequirements;
  http: typeof http;
  institutions: typeof institutions;
  "programmeEligibility/search": typeof programmeEligibility_search;
  "programmeSearch/candidates": typeof programmeSearch_candidates;
  "programmeSearch/display": typeof programmeSearch_display;
  "programmeSearch/filters": typeof programmeSearch_filters;
  "programmeSearch/interpret": typeof programmeSearch_interpret;
  "programmeSearch/matching": typeof programmeSearch_matching;
  "programmeSearch/pagination": typeof programmeSearch_pagination;
  "programmeSearch/ranking": typeof programmeSearch_ranking;
  "programmeSearch/search": typeof programmeSearch_search;
  programmes: typeof programmes;
  rateLimits: typeof rateLimits;
  searchEvents: typeof searchEvents;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  rateLimiter: import("@convex-dev/rate-limiter/_generated/component.js").ComponentApi<"rateLimiter">;
};
