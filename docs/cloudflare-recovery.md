# Kozi Ipi hosting recovery

Recovered on 14 October 2026.

## Services

- Frontend: Cloudflare Pages project `kozi-ipi`, production branch `master`.
- Frontend URL: https://kozi-ipi.pages.dev
- Custom domains: https://koziipi.com and https://www.koziipi.com
- Cloudflare account: `9ce726f052303bc518bd2016de2d418f`.
- Convex project: `elishabulalu031/kozi-ipi`.
- Production backend: https://hushed-sandpiper-727.convex.cloud
- Development backend: https://wooden-mule-219.convex.cloud

## What was recovered

The former Vercel frontend returned HTTP 503 with `DEPLOYMENT_PAUSED`. The previous Convex project was absent from the approved account and its saved development URL returned 404. A new Convex project was created after Elisha approved recreating it.

The recovery checkout uses committed source `8f60a37` plus the existing local Form Six runtime files and schema. It preserves the published search, institution browsing, eligibility, and Form Six routes. It excludes the unfinished analytics routes and analysis workbench edits. The original checkout was preserved.

Restored into a newly empty production database:

| Table | Records |
| --- | ---: |
| institutions | 742 |
| programmes | 4,440 |
| entryRequirements | 5,358 |
| requirementRules | 6,946 |
| acseeResults | 133,647 |

Dataset source: `/Users/elishabulalu/Documents/kozi-ipi/data/processed/`. No previous search-event or correction-submission backup was available. The existing admin credential was configured only in Convex production, never bundled into the frontend.

## Deployment

Run from this checkout. The local `.env.production.local` already contains the two public production Convex URLs. For another checkout, set `NEXT_PUBLIC_CONVEX_URL` and `NEXT_PUBLIC_CONVEX_SITE_URL` to the production URLs above. Do not put `ADMIN_API_KEY` in frontend variables.

```sh
bun install --frozen-lockfile
bun run typecheck
bun run lint
bun run test
bun run build
CLOUDFLARE_ACCOUNT_ID=9ce726f052303bc518bd2016de2d418f npx wrangler@4.151.0 pages deploy out --project-name kozi-ipi --branch master
```

Next.js uses static export and unoptimized images. Search reads URL filters in the browser inside Suspense. Cloudflare serves security headers from `public/_headers`. Vercel-only analytics scripts were removed. Convex remains responsible for queries, mutations, and stored education data.

For backend changes, validate them against the development deployment before running `bun run convex:deploy`. The new development database is empty; the recovered dataset is in production. Do not run destructive import commands against production as part of ordinary deployment.

## Domain recovery

The domain remains registered with Vercel. Registry nameservers now delegate to `cora.ns.cloudflare.com` and `ken.ns.cloudflare.com`. Apex and www CNAME records target `kozi-ipi.pages.dev`, with Pages custom-domain associations configured. Existing CAA records were preserved. Vercel DNS also has explicit apex ALIAS and www CNAME records targeting Pages so cached old nameserver delegations can reach the recovered site. Wildcard records were left unchanged after automatic approval review blocked cleanup of unverified subdomains.

Original Vercel DNS, Cloudflare before/after records, and verification screenshots are saved in the sibling `../kozi-recovery-evidence/` directory. Nameserver changes can be rolled back at the registrar using the original `ns1.vercel-dns.com` and `ns2.vercel-dns.com`, but the former Vercel frontend remains paused.

## Final verification

The production build, typecheck, lint, data contracts, search contracts, and eligibility contracts passed. Browser checks passed on `www.koziipi.com` for the home page, course search, refresh, institution browsing, eligibility results using sample grades, and Form Six input validation. The Form Six backend also resolved a restored record without displaying its personal data. Both Pages custom domains are active with valid HTTPS and return 200 at Cloudflare. During the final check, this Mac still cached the former Vercel address for the bare domain; use the working www or Pages URL while that cache expires.
