# VibeLock Antigravity Automation

This bundle adds project-specific safety rules and reusable Antigravity workflows.
It does not edit application code, dependencies, database schema, environment files, or Git history.

## Target repository

`E:\All Project\POS-System\vibelock-web`

## Before installing

1. Open the repository in Antigravity.
2. Inspect the Git panel / run `git status --short --branch`.
3. Do not install while you have uncommitted feature work unless you intentionally want these automation files included in that work.
4. If `AGENTS.md` already exists, do not overwrite it. Merge the new safety/project sections into the existing file.
5. If `.agents/workflows/` already contains workflows, keep them and add only the new files that do not conflict.

## Install

Copy these paths from this bundle into the repository root:

- `AGENTS.md`
- `.agents/workflows/implement.md`
- `.agents/workflows/test.md`
- `.agents/workflows/review.md`
- `.agents/workflows/prepare-pr.md`

Expected layout:

```text
vibelock-web/
├── AGENTS.md
└── .agents/
    └── workflows/
        ├── implement.md
        ├── test.md
        ├── review.md
        └── prepare-pr.md
```

These files are plain Markdown. No package install, script execution, environment variable, database change, or schema migration is needed.

## Register / refresh in Antigravity

1. Open the `vibelock-web` workspace.
2. Open the Agent panel's `...` menu → **Customizations**.
3. Check **Rules**. Confirm the workspace's `AGENTS.md` instructions are loaded. If your Antigravity build requires manually-created Workspace Rules, create one named `vibelock-project-safety` and paste the contents of `AGENTS.md` into it, but avoid maintaining two divergent copies long-term.
4. Check **Workflows**. If Antigravity does not auto-discover `.agents/workflows/*.md` in your installed version, use **+ Workspace** to create each workflow and paste the matching Markdown file content into it. Name them `implement`, `test`, `review`, and `prepare-pr`.
5. Start a new Agent conversation or refresh the workspace if the slash commands do not appear.
6. Try `/review` first. It should inspect only and must not edit files.

## Use

- `/implement Add a clear feature request here`
- `/test`
- `/review`
- `/prepare-pr`

Pass a specific task after `/implement`. Do not use a vague request such as “improve everything.”

## Safety gates

The workflows intentionally stop and ask you before:

- running a command that could affect production data or a live service;
- changing Prisma schema or creating/applying migrations;
- editing secrets or `.env*` files;
- committing, pushing, creating a remote PR, merging, or deploying;
- broad refactors or unrelated changes.

Local tests may use only the repository's intended test configuration. Never point test commands at production.

## Important Antigravity workflow migration notice

As checked on 13 October 2026, Antigravity's official Workflows documentation says the current workflow system is scheduled to stop working on **19 October 2026**, with migration guidance to follow. If workflow slash commands stop working after that date, use Antigravity's documented `/migrate-workflows` command when available, or follow the new official migration instructions. Keep `AGENTS.md`; it remains useful as project rules. Do not let an agent silently replace workflows or modify the app during migration.
