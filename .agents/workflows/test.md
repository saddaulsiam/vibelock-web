# Test VibeLock Changes

**Description:** Verify the current VibeLock change using safe, repository-defined checks without changing application behavior.

## Steps

1. Read `AGENTS.md`; inspect `git status --short --branch` and the current diff. Do not edit or revert code as part of this workflow.
2. Read `package.json` and the relevant test configuration (Vitest/Jest/Playwright or existing project setup). Identify the focused tests for the changed behavior.
3. Before running database integration tests, inspect how the test database URL is selected. If the resolved target is unclear, missing, or could be production, do not run those tests; report the blocker.
4. Run the narrowest relevant test first. Then run available typecheck and lint scripts; run a build when the change could affect compilation/routing or when requested. Do not invent script names.
5. If a test fails, capture the exact failing command and error. Diagnose whether it is caused by this change or appears pre-existing. Do not weaken tests, lint, types, or security controls to force a pass.
6. Do not modify code in this workflow. If a fix is needed, summarize the proposed fix and ask the user to run `/implement` or approve the fix.
7. Do not run production smoke tests, live courier/payment calls, migrations, seed/reset commands, or any external side-effecting operation.
8. Report exact pass/fail counts where available, commands run, skipped checks and why, test DB safety evidence, and remaining risks.
