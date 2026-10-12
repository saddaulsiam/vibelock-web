# Implement a VibeLock Feature

**Description:** Implement one clearly scoped VibeLock feature safely, following project rules.

## Steps

1. Read and follow the repository-root `AGENTS.md`.
2. Inspect `git status --short --branch`, the current branch, and recent commits. If there are uncommitted or untracked changes you cannot confidently attribute to this task, do not edit anything; report the files and ask how to proceed. Do not stash, reset, clean, or overwrite them.
3. Read `package.json`, the relevant implementation, related tests, authorization guards, and any applicable docs. Do not guess the repository's scripts or architecture.
4. Restate the task in one sentence. Give a short plan and list the files expected to change. For a non-trivial or security-sensitive task, wait for approval before editing.
5. Define acceptance criteria and identify risk areas (database/schema, auth, payments, inventory, customer data, external APIs, caching, and production configuration).
6. Implement only the requested scope. Reuse existing patterns. Do not add dependencies or modify schema/migrations, `.env*`, secrets, CI/deployment configuration, or unrelated files without explicit approval.
7. Add/update focused tests for the intended behavior. Keep tests isolated from production and use only the configured test database.
8. Run focused tests and appropriate typecheck/lint/build commands based on `package.json`. If a command may access production or cause external side effects, stop and ask first.
9. Review `git diff --check`, `git diff`, and `git status --short`, including new/untracked files. Do not stage or commit.
10. Report the summary, changed files, exact checks/results, known limitations, remaining risks, and next recommended workflow (`/test` or `/review`). Do not push, open a PR, merge, or deploy.
