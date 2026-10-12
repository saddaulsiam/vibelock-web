# Review VibeLock Changes (Read-Only)

**Description:** Perform a read-only code and safety review of the current VibeLock diff, including untracked files.

## Steps

1. Read and follow `AGENTS.md`.
2. Inspect `git status --short --branch`, `git diff --stat`, `git diff --check`, `git diff`, and relevant untracked files. Do not stage, edit, or delete files.
3. Trace changed behavior into relevant callers, service modules, schema/models, auth guards, and tests. Compare against existing source-of-truth behavior rather than assuming intended semantics.
4. Check:
   - authorization on every affected server action, route handler, and admin page;
   - input validation, SQL/Prisma query safety, pagination limits, and error handling;
   - production/test database separation and accidental live API calls;
   - financial, payment, return, shipping, inventory-ledger, and reservation semantics if relevant;
   - cache correctness and accidental caching of personalized/sensitive data;
   - CSV export escaping, formula-injection protection, filters, PII, and response headers if relevant;
   - regressions, missing tests, performance concerns, accessibility, and unrelated changes;
   - suspicious edits to `eslint.config.*`, `package.json`, lockfiles, CI, deployment files, or security settings.
5. For each finding, provide severity (Critical/High/Medium/Low), file and line, evidence, impact, and a specific recommended fix. Distinguish confirmed bugs from questions/assumptions.
6. If there are no findings, say “No findings in the reviewed diff” and list the residual risks and checks not performed. Do not imply that review proves correctness.
7. Do not run commands that write to databases, call live payment/shipping APIs, deploy, or alter Git history. Read-only local checks may be suggested, but do not edit files.
8. Finish with a merge-readiness recommendation (not a merge action): Block / Needs fixes / Ready for human approval. Never commit, push, create a PR, merge, or deploy.
