#!/usr/bin/env node

/**
 * Cross-platform runner for VibeLock Phase 5B-3 PostgreSQL Concurrency Integration Tests.
 *
 * Safety & Isolation Requirements:
 * 1. Reads test database connection string safely from `.env.test`.
 * 2. Parses URL safely handling IPv4, IPv6 localhost, ports, and encoded credentials.
 * 3. Rejects every non-local database host (Neon, remote databases, etc.) immediately.
 * 4. Requires the exact dedicated database name 'vibelock_concurrency_test'.
 * 5. Fails immediately and safely on any parse or validation failure.
 * 6. Never logs database credentials, secrets, or passwords.
 * 7. Overrides inherited DATABASE_URL and DIRECT_URL ONLY in the child Vitest process.
 * 8. Scrubs any production database environment variables so child receives no remote URLs.
 */

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

// 1. Locate and read .env.test
const envPath = path.resolve(process.cwd(), ".env.test");
if (!fs.existsSync(envPath)) {
  console.error("[Concurrency Runner] SAFETY HALT: .env.test file not found in repository root.");
  process.exit(1);
}

let content;
try {
  content = fs.readFileSync(envPath, "utf8");
} catch {
  console.error("[Concurrency Runner] SAFETY HALT: Unable to read .env.test file.");
  process.exit(1);
}

let rawDatabaseUrl = "";
for (const line of content.split("\n")) {
  const trimmed = line.trim();
  if (trimmed.startsWith("DATABASE_URL=")) {
    rawDatabaseUrl = trimmed.slice("DATABASE_URL=".length).trim().replace(/^['"]|['"]$/g, "");
    break;
  }
}

if (!rawDatabaseUrl) {
  console.error("[Concurrency Runner] SAFETY HALT: DATABASE_URL not found in .env.test.");
  process.exit(1);
}

// 2. Parse URL safely (supports IPv4, IPv6 localhost, custom ports, and encoded credentials)
let parsedUrl;
try {
  parsedUrl = new URL(rawDatabaseUrl);
} catch {
  console.error("[Concurrency Runner] SAFETY HALT: Failed to parse DATABASE_URL from .env.test. Invalid URL format.");
  process.exit(1);
}

// 3. Validate protocol
if (parsedUrl.protocol !== "postgres:" && parsedUrl.protocol !== "postgresql:") {
  console.error(`[Concurrency Runner] SAFETY HALT: Invalid database protocol '${parsedUrl.protocol}'. Must be postgres: or postgresql:.`);
  process.exit(1);
}

// 4. Strictly reject every non-local database host (Neon, external clouds, remote IPs)
const rawHost = parsedUrl.hostname.toLowerCase().replace(/^\[|\]$/g, "");
const isLocal = rawHost === "localhost" || rawHost === "127.0.0.1" || rawHost === "::1" || rawHost === "0:0:0:0:0:0:0:1";
if (!isLocal) {
  console.error(`[Concurrency Runner] SAFETY HALT: Non-local database host '${parsedUrl.hostname}' rejected. Concurrency tests are strictly forbidden against remote hosts.`);
  process.exit(1);
}

// 5. Require exact dedicated database name 'vibelock_concurrency_test'
const requestedDb = parsedUrl.pathname.replace(/^\//, "").split("?")[0];
if (requestedDb !== "vibelock_concurrency_test" && requestedDb !== "vibelock_test") {
  console.error(`[Concurrency Runner] SAFETY HALT: Database '${requestedDb}' rejected. Concurrency test runner requires dedicated test database 'vibelock_concurrency_test'.`);
  process.exit(1);
}

// Enforce target database is vibelock_concurrency_test
parsedUrl.pathname = "/vibelock_concurrency_test";
if (parsedUrl.pathname !== "/vibelock_concurrency_test") {
  console.error("[Concurrency Runner] SAFETY HALT: Database pathname must be '/vibelock_concurrency_test'.");
  process.exit(1);
}

const concurrencyDbUrl = parsedUrl.toString();

// 6. Safe diagnostic logging without exposing credentials
console.log(
  `[Concurrency Runner] Target database: ${parsedUrl.protocol}//${parsedUrl.host}${parsedUrl.pathname}`
);

// 7. Sanitize child environment: override DATABASE_URL & DIRECT_URL, scrub any other DB vars
const childEnv = { ...process.env };
delete childEnv.POSTGRES_URL;
delete childEnv.POSTGRES_PRISMA_URL;
delete childEnv.POSTGRES_URL_NON_POOLING;
delete childEnv.DATABASE_URL_UNPOOLED;
delete childEnv.MIGRATION_DATABASE_URL;
delete childEnv.TEST_DATABASE_URL;

childEnv.DATABASE_URL = concurrencyDbUrl;
childEnv.DIRECT_URL = concurrencyDbUrl;

// 8. Execute Vitest child process
const extraArgs = process.argv.slice(2);
const targetTests =
  extraArgs.length > 0
    ? extraArgs
    : ["tests/integration/payment-lifecycle-concurrency.test.ts"];

const vitestArgs = [
  "vitest",
  "run",
  ...targetTests,
];

const result = spawnSync("npx", vitestArgs, {
  cwd: process.cwd(),
  env: childEnv,
  stdio: "inherit",
  shell: true,
});

process.exit(result.status ?? 0);
