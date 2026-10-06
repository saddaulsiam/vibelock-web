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

## Setup

1. Copy `.env.example` to `.env.local` (or `.env`) and fill in your local credentials.
2. Run `npm install` to install dependencies.
3. Run `npx prisma generate` to generate the Prisma client.
4. Run `npm run dev` to start the development server.

## Environment Variables Configuration

The application strictly separates **server-only** secrets from **public** variables.

- **Server-Only Variables**: Handled securely via `src/lib/config/env.ts` (e.g. `DATABASE_URL`, `AUTH_SECRET`). If a server variable is missing in production, the application will fail fast during startup to protect against misconfiguration. These can NEVER be imported into Client Components.
- **Public Variables**: Handled via `src/lib/config/public-env.ts` (e.g. `NEXT_PUBLIC_APP_URL`). These variables are prefixed with `NEXT_PUBLIC_` and are safe to be exposed to the browser.
- **Static App Config**: General application configuration (name, currency, locale, timezone) is managed centrally in `src/lib/config/app.ts`.

> Note: `.env.example` contains only safe placeholders and structure. Never commit real secrets to the repository. Your local `.env` and `.env.*.local` files are ignored by git automatically.

## Scripts

- `npm run dev`: Start development server
- `npm run build`: Build for production
- `npm run lint`: Run ESLint
- `npm run typecheck`: Run TypeScript type checking
- `npm run format`: Format code with Prettier

## Phase 1A Scaffold

This project has been scaffolded according to the Phase 1A requirements.
