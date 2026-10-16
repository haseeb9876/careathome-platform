# CareAtHome engineering guidance

- Work only inside this repository. Preserve the private SRS in docs/reference (ignored).
- Read docs/PROGRESS.md, docs/DECISIONS.md and docs/REQUIREMENTS_MATRIX.md before continuing.
- Stack: strict TypeScript, Next.js App Router, React, Tailwind, customised shadcn primitives. The user authorised migration from Supabase to Neon on October 15; preserve existing SQL invariants and application features during that migration.
- SQL migrations are authoritative. RLS and explicit RPC grants must enforce ownership and roles; UI visibility is not authorisation.
- Never expose service-role credentials to the browser. Do not trust role, owner, price or verification fields supplied by clients.
- The user explicitly authorised public Vercel deployment on October 16. Deploy a clearly labelled synthetic demonstration; real patient data, real payments and external AI remain out of scope.
- Keep all seven SRS booking states. Completed and Cancelled are terminal. Assignment must validate eligibility and use database conflict protection.
- Record test results only after they actually run. Unverified code remains pending in the matrix.
- Required checks: npm.cmd run typecheck, npm.cmd run lint, npm.cmd test, npm.cmd run build; relevant database and Playwright tests.
- Windows: use npm.cmd/npx.cmd; do not change PowerShell execution policy.
- Update progress, test evidence and exact next step before handover. The user authorised storing source under GitHub account haseeb9876 on October 15. Use a private repository; exclude secrets, private reference documents, generated credentials and patient data. Use only free development services and synthetic fixtures. Public Vercel deployment is now explicitly authorised; verify the live site before reporting success.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
