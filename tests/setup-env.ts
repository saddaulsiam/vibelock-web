/**
 * Default fallback environment variables for Vitest unit tests.
 * Uses nullish assignment so real test/CI environment values are preserved.
 */
process.env.DATABASE_URL ??= "postgresql://test:test@localhost:5432/test?schema=public";
process.env.AUTH_SECRET ??= "vitest-dummy-auth-secret-32-chars-minimum";
