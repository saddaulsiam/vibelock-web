# Prepare a VibeLock Pull Request (No Publishing)

**Description:** Check branch readiness and draft a PR title/body without committing, pushing, opening a remote PR, merging, or deploying.

## Steps

1. Read `AGENTS.md`.
2. Inspect `git status --short --branch`, current branch, upstream, `git log -5 --oneline`, and the diff against the appropriate base branch. Do not fetch or change branches unless the user approves; if base information is stale or unknown, report that limitation.
3. Check for uncommitted/untracked changes, secrets, `.env*`, generated artifacts, unrelated edits, and suspicious config/lockfile changes. Never stage everything automatically.
4. Summarize the intended change and confirm it is one focused scope. If there are unrelated changes or possible secrets, stop and ask the user.
5. Review test evidence from actual commands/results only. Do not claim a test passed if it was not run. Clearly list failures and skipped checks.
6. Draft:
   - a concise conventional PR title;
   - a PR description with Summary, Why, Implementation, Tests/Verification, Risk and Rollback notes;
   - a checklist of manual verification and screenshots/evidence needed, if applicable.
7. Report whether the local branch appears ready for a human to publish. Do not create a remote PR or call a GitHub integration.
8. Never commit, push, create a remote PR, merge, release, or deploy. Ask for explicit approval before any of those actions in a separate step.
