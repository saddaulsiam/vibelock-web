# VibeLock E-Commerce Platform

Production E-Commerce Platform for VibeLock.

## Architecture & Technology Stack

- Next.js (App Router, Server Components, Server Actions)
- TypeScript (Strict Mode)
- Tailwind CSS v4
- shadcn/ui
- Prisma ORM + PostgreSQL
- NextAuth.js
- Zustand
- Lucide React & Framer Motion

## Development

1. Copy `.env.example` to `.env.local` (or `.env`) and fill in your local credentials.
2. Run `npm install` (or `npm ci` in CI) to install dependencies.
3. Run `npx prisma generate` to generate the Prisma client.
4. Run `npm run dev` to start the development server.

## CI

GitHub Actions automatically validates code quality on Pull Requests and pushes to `main`.
The CI pipeline runs:

- `npm run db:validate` (Prisma schema validation)
- `npm run db:generate` (Prisma client generation)
- `npm run format:check` (Prettier)
- `npm run lint` (ESLint)
- `npm run typecheck` (TypeScript)
- `npm run build` (Next.js Build)

## Database Migrations

**Development**:
Run `npx prisma migrate dev` **ONLY** when a real development PostgreSQL database is configured.

**Production**:
Database migrations are automatically applied during CI/CD via GitHub Actions.
If manual execution is ever required, use:
`npx prisma migrate deploy`

> **WARNING:** Never use `npx prisma db push` for production.

## Deployment

The intended production architecture is:
`PR → CI → merge → production migration → Vercel deployment`

Currently, the GitHub Actions workflows handle CI and the Production Migration step.
You must manually configure the following to complete the pipeline:

1. **GitHub Environment Secrets**: Add your production `DATABASE_URL` to a GitHub Environment named `production`.
2. **Vercel Integration**: Ensure Vercel is connected to the GitHub repository. Vercel deployment should ideally be gated or triggered after the migration succeeds. (Note: Vercel standard behavior deploys on push to `main` concurrently with the migration workflow. Advanced Vercel project settings or Vercel CLI steps in Actions may be required to enforce strict ordering).
