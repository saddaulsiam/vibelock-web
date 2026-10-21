# VibeLock Project Rules for Antigravity

## Project context

- Repository: `saddaulsiam/vibelock-web`
- Stack: Next.js App Router, TypeScript, React, Prisma, PostgreSQL/Neon, Auth.js, Cloudinary, Resend, SSLCOMMERZ/COD and shipping integrations.
- Treat the existing repository as the source of truth. Inspect actual files, `package.json`, current Git state, and existing patterns before acting.
- Prefer focused, production-safe changes over broad refactors. Avoid beginner-level explanations; report concise, actionable findings.

## Mandatory safety constraints

1. Never access, query, mutate, seed, truncate, or otherwise write to production data. Do not use production credentials or production URLs for tests.
2. Do not edit `.env`, `.env.*`, secrets, credentials, tokens, or deployment environment settings. Do not print secret values. If a secret is needed, stop and ask the user to configure it safely.
3. Do not change `prisma/schema.prisma`, generate or apply migrations, or change database structure unless the user explicitly approves that exact change first.
4. Do not change checkout, payments, inventory mutations/reservations, order fulfillment, shipping webhooks, authentication/authorization, or financial calculations outside the explicit task scope.
5. Never commit, push, create a remote PR, merge, release, or deploy unless the user explicitly approves that specific action in the current conversation.
6. Never claim production verification unless it was actually performed and the user explicitly authorized the production check. Prefer staging/local verification.
7. Never weaken authorization, validation, tests, lint rules, CI checks, or security controls to make a task pass.
8. Do not install packages, alter lockfiles, add infrastructure, or change production configuration without asking first.
9. Do not delete or overwrite user changes. If the working tree contains unrelated or unexplained changes, stop and report them before editing.
10. Do not run destructive commands (`reset --hard`, `clean -fd`, force-push, database reset/drop/truncate, or equivalent).

## Required workflow for every coding task

1. Inspect `git status --short --branch`, current branch, and recent commits. Do not switch branches or discard changes automatically.
2. Read the relevant code and tests. Check repository scripts before choosing commands.
3. State a short plan and list the files likely to change. For non-trivial tasks, wait for user confirmation before implementation.
4. Keep changes within the requested scope. Reuse existing architecture, naming, UI components, and service-layer conventions.
5. Add/update focused tests for changed behavior where appropriate. Do not alter tests merely to hide a failure.
6. Run only safe, relevant checks, using the repository's intended test database/configuration. Inspect the resolved test configuration if there is any doubt.
7. Review the complete diff, including untracked files and config changes. Identify risks, limitations, skipped checks, and any pre-existing failures.
8. Finish with: summary, files changed, checks and exact results, remaining risks, Git status, and whether any approval is needed next.

## VibeLock-specific engineering guidance

- Preserve the current Next.js App Router and TypeScript architecture.
- For database work, inspect Prisma models, existing query/service modules, authorization guards, and integration-test setup before designing a change.
- Keep admin routes protected by the existing role/authorization patterns; never rely on hiding navigation links as authorization.
- Keep financial metrics consistent with existing order-item snapshots, payment/refund states, return records, and inventory ledger semantics. State assumptions explicitly; do not invent missing courier/gateway/OPEX data.
- Inventory stock must follow the established ledger and reservation logic. Do not introduce a second competing stock calculation.
- Avoid caching personalized customer data, cart, checkout, order-specific data, inventory mutations, or other sensitive/dynamic results without explicit approval and a correctness review.
- CSV exports must defend against formula injection, preserve filters consistently with the UI, enforce authorization, and avoid PII unless explicitly required.
- Prefer no schema changes for reporting/admin analytics unless the user explicitly approves them.
- Never fabricate test results, availability, production status, or browser verification.

## Commands and verification

- Read `package.json` and existing project instructions before assuming script names.
- Use focused tests first, then typecheck/lint/build as appropriate and affordable.
- Do not run the full test suite by default if a focused test plus typecheck/lint is sufficient; explain when broader coverage is needed.
- Never run a command that might point at production. If test DB isolation is uncertain, inspect configuration and stop before executing database-touching tests.

## Git and delivery

- Keep the current branch unless the user asks to create/switch branches.
- Never silently stage all files. Inspect `git diff` and `git status` first.
- Before commit/push/remote PR/merge/deploy, show the exact proposed action and wait for explicit approval.
- PR preparation means drafting a title/body and listing verification evidence; it does not authorize publishing the PR.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
