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

Original working checkout: `/Users/elishabulalu/Documents/kozi-ipi`. At handoff, its active branch is `redesign/home-poster`, commit `2fa73a7`, with additional uncommitted work. The recovery branch has been fetched there for inspection. Runtime migration changes have not been merged into that active branch or GitHub `master`.

Wrangler's `--branch master` argument marks a Pages deployment as production. It does not push Git commits or change GitHub's `master` branch. This site was published by CLI direct upload, not an automatic GitHub build.

## Hosting changes to integrate with ongoing frontend work

Inspect the recovery branch for these changes:

- `next.config.mjs`: `output: "export"`, `images.unoptimized: true`; security headers moved to Pages.
- `public/_headers`: security headers and immutable cache policy for Next.js assets.
- `wrangler.jsonc`: Pages project and `out` build directory.
- `app/search/page.tsx`: browser URL parameters inside Suspense, compatible with static export.
- `app/layout.tsx`: remove Vercel Analytics and Speed Insights components. Preserve current fonts and redesign changes when adapting this file.
- `package.json`: `pages:deploy` command using Wrangler 4.151.0.
- `.env.production.local`: the public production Convex URLs above. This local file is intentionally not in Git. Configure these variables before building in a different checkout.

Preserve the current redesign and uncommitted work. Do not replace its hero or blindly cherry-pick the entire recovery commit. That commit also contains pre-existing Form Six runtime files and schema needed to restore the live product. Review backend changes against the recovered production schema before deployment. Existing old Convex URLs in local environment files need checking.

From the recovery checkout, frontend deployment is:

```sh
bun run build
bun run pages:deploy
```

Further verification, dataset counts, original DNS backups and recovery details are documented at https://github.com/Bulalu/kozi-ipi/blob/codex/cloudflare-recovery/docs/cloudflare-recovery.md.
