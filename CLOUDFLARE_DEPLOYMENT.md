# Kozi Ipi deployment status

Updated 15 October 2026. Read this before changing hosting configuration or deploying.

## Current production

- Hosting: **Cloudflare Pages with a Next.js static export**.
- Project: `kozi-ipi`.
- URLs: https://www.koziipi.com and https://kozi-ipi.pages.dev
- Apex: https://koziipi.com is also associated with Pages and has active HTTPS. At recovery verification, the local browser still cached the former Vercel address.
- Cloudflare account: `9ce726f052303bc518bd2016de2d418f`.
- Backend: Convex project `elishabulalu031/kozi-ipi`.
- Production Convex URL: `https://hushed-sandpiper-727.convex.cloud`.
- Production HTTP actions URL: `https://hushed-sandpiper-727.convex.site`.
- Development deployment: `wooden-mule-219`. Its database is empty. Restored education data is in production.

The frontend uses Pages static export. There is no OpenNext adapter and no Next.js server running in Workers. The old `.vercel/` directory and Vercel packages in another checkout do not describe the current live hosting.

## Where the deployed changes are

The recovered runtime source is commit `3477aef` on branch `codex/cloudflare-recovery`, now published at https://github.com/Bulalu/kozi-ipi/tree/codex/cloudflare-recovery.

Recovery checkout: `/Users/elishabulalu/Documents/random9/output/kozi-cloudflare-recovery`.

Original working checkout: `/Users/elishabulalu/Documents/kozi-ipi`. At handoff, its active branch is `redesign/home-poster`, commit `2fa73a7`, with additional uncommitted work. The recovery branch has been fetched there for inspection.

Update 15 October 2026: the hosting changes listed below are now integrated on `redesign/home-poster` (static export config, `_headers`, `wrangler.jsonc`, the Suspense search page, Vercel components removed from the layout, `pages:deploy`). The redesigned home page builds as a static export, and its images are pre-compressed WebP because `images.unoptimized` is on. The recovery commit's Form Six runtime, Convex schema and hero changes were not copied; that checkout already had its own versions, now committed in `adf917e`.

## Latest production deploy

- 15 October 2026 (second deploy): Pages deployment `https://ff8cf48c.kozi-ipi.pages.dev`, built from GitHub `master` at `b69a852` (PR #32 merged: home redesign, Cloudflare hosting, Form Six lookup, ACSEE analytics, plus #27–#30 search synonyms, filter a11y and Vyuo pagination). Production now matches `master`.
- Convex production `hushed-sandpiper-727` was redeployed from the same commit to add `institutions.browsePaginated` and `institutions.browseSummary` (no schema or index changes). Tested on dev `wooden-mule-219` first.
- This checkout's `.env.local` is now linked to the recovered project (`dev:wooden-mule-219`). Production builds still need `.env.production.local` with the `hushed-sandpiper-727` URLs.
- Deploy order when the frontend needs new Convex functions: `npx convex deploy` first, verify, then `bun run build` and `bun run pages:deploy`.
