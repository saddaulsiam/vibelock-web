import { PrismaClient, Role } from "@prisma/client";
import fs from "fs";
import path from "path";
import { afterAll, beforeAll, describe, expect, test } from "vitest";

// Resolve dedicated isolated test database URL directly from .env.test
let testDbUrl = "";
const envPath = path.join(process.cwd(), ".env.test");
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, "utf8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.startsWith("DATABASE_URL=")) {
      testDbUrl = trimmed
        .slice("DATABASE_URL=".length)
        .trim()
        .replace(/^['"]|['"]$/g, "");
      break;
    }
  }
}

if (!testDbUrl) {
  testDbUrl = process.env.DATABASE_URL || "";
}

if (!testDbUrl) {
  throw new Error("SAFETY HALT: Missing DATABASE_URL in .env.test and environment.");
}

let parsedUrl: URL;
try {
  parsedUrl = new URL(testDbUrl);
} catch {
  throw new Error("SAFETY HALT: Failed to parse test database URL. Invalid format.");
}

const rawHost = parsedUrl.hostname.toLowerCase().replace(/^\[|\]$/g, "");
const isLocalHost =
  rawHost === "localhost" ||
  rawHost === "127.0.0.1" ||
  rawHost === "::1" ||
  rawHost === "0:0:0:0:0:0:0:1";
if (!isLocalHost) {
  throw new Error(`SAFETY HALT: Non-local database host '${parsedUrl.hostname}' rejected.`);
}

if (parsedUrl.pathname === "/vibelock_test") {
  parsedUrl.pathname = "/vibelock_concurrency_test";
}
if (parsedUrl.pathname !== "/vibelock_concurrency_test") {
  throw new Error(
    `SAFETY HALT: Dedicated concurrency test database must be 'vibelock_concurrency_test'. Received '${parsedUrl.pathname}'.`
  );
}

const concurrencyDbUrl = parsedUrl.toString();

// Independent PrismaClient instances with separate connection pools to PostgreSQL
const prismaConn1 = new PrismaClient({ datasources: { db: { url: concurrencyDbUrl } } });
const prismaConn2 = new PrismaClient({ datasources: { db: { url: concurrencyDbUrl } } });
const isolatedPrisma = new PrismaClient({ datasources: { db: { url: concurrencyDbUrl } } });

describe("Phase 10: PostgreSQL Concurrency & Sole Admin Serialization", () => {
  let pid1: number;
  let pid2: number;
  const createdUserIds: string[] = [];

  beforeAll(async () => {
    // 1. Strict Runtime Database-Name & Local Server Address Guard
    const dbInfo = await isolatedPrisma.$queryRaw<
      Array<{ current_database: string; inet_server_addr: string; version: string }>
    >`SELECT current_database(), inet_server_addr()::text, version()`;

    const currentDb = dbInfo[0].current_database;
    if (currentDb !== "vibelock_concurrency_test") {
      throw new Error(
        `SAFETY HALT: Attempted to run concurrency test against non-test database: '${currentDb}'. Aborting immediately.`
      );
    }

    const rawServerAddr = dbInfo[0].inet_server_addr;
    const cleanAddr = rawServerAddr ? rawServerAddr.split("/")[0] : "";
    const isLocalServer = !cleanAddr || cleanAddr === "127.0.0.1" || cleanAddr === "::1";
    if (!isLocalServer) {
      throw new Error(
        `SAFETY HALT: Attempted to run concurrency test against non-local PostgreSQL server: '${rawServerAddr}'.`
      );
    }

    // 2. Verify independent PostgreSQL connection backend PIDs
    const q1 = await prismaConn1.$queryRaw<Array<{ pid: number }>>`SELECT pg_backend_pid() as pid`;
    const q2 = await prismaConn2.$queryRaw<Array<{ pid: number }>>`SELECT pg_backend_pid() as pid`;
    pid1 = q1[0].pid;
    pid2 = q2[0].pid;

    expect(pid1).toBeGreaterThan(0);
    expect(pid2).toBeGreaterThan(0);
    expect(pid1).not.toBe(pid2);
  });

  afterAll(async () => {
    try {
      if (createdUserIds.length > 0) {
        await isolatedPrisma.auditLog
          .deleteMany({
            where: { entityId: { in: createdUserIds } },
          })
          .catch(() => {});
        await isolatedPrisma.user
          .deleteMany({
            where: { id: { in: createdUserIds } },
          })
          .catch(() => {});
      }
    } finally {
      await prismaConn1.$disconnect();
      await prismaConn2.$disconnect();
      await isolatedPrisma.$disconnect();
    }
  });

  test("Concurrently demoting two distinct administrators serializes via PostgreSQL advisory lock, preventing zero-admin state", async () => {
    const ts = Date.now();

    // Reset any pre-existing admin roles to CUSTOMER in concurrency DB so exactly two test admins exist
    await isolatedPrisma.user.updateMany({
      where: { role: "ADMIN" },
      data: { role: "CUSTOMER" },
    });

    // Create exactly two test ADMIN users
    const adminA = await isolatedPrisma.user.create({
      data: {
        email: `p10-admin-a-${ts}@example.com`,
        name: "Admin Alpha",
        role: "ADMIN" as Role,
      },
    });
    const adminB = await isolatedPrisma.user.create({
      data: {
        email: `p10-admin-b-${ts}@example.com`,
        name: "Admin Beta",
        role: "ADMIN" as Role,
      },
    });
    createdUserIds.push(adminA.id, adminB.id);

    // Initial state check: exactly 2 admins in the database
    const initialAdminCount = await isolatedPrisma.user.count({ where: { role: "ADMIN" } });
    expect(initialAdminCount).toBe(2);

    let conn1AdvisoryAcquired = false;
    let conn2BlockedDurationMs = 0;
    let tx1Success = false;
    let tx2Success = false;
    let tx1Error: string | null = null;
    let tx2Error: string | null = null;

    // Transaction 1: Executed on Connection 1 (demoting adminA to STAFF)
    const runTx1 = async () => {
      try {
        await prismaConn1.$transaction(async (tx1) => {
          // 1. Acquire transaction-scoped advisory lock (same key as admin-user-actions)
          await tx1.$executeRaw`SELECT pg_advisory_xact_lock(982347102)`;
          conn1AdvisoryAcquired = true;

          // Hold the lock for 120ms to guarantee Conn2 arrives concurrently and is forced to wait in PostgreSQL
          await new Promise((resolve) => setTimeout(resolve, 120));

          // 2. Row-lock target user
          const locked = await tx1.$queryRaw<Array<{ id: string; role: Role }>>`
            SELECT "id", "role" FROM "User" WHERE "id" = ${adminA.id} FOR UPDATE
          `;
          if (locked.length === 0) throw new Error("User not found.");

          // 3. Count remaining administrators
          const adminCount = await tx1.user.count({ where: { role: "ADMIN" } });
          if (adminCount <= 1) {
            throw new Error("Cannot demote the sole remaining administrator.");
          }

          // 4. Update role
          await tx1.user.update({
            where: { id: adminA.id },
            data: { role: "STAFF" },
          });

          // 5. Authoritative AuditLog creation
          await tx1.auditLog.create({
            data: {
              actorId: adminB.id,
              action: "ADMIN_USER_ROLE_UPDATED",
              entityType: "User",
              entityId: adminA.id,
              metadata: { newRole: "STAFF", previousRole: "ADMIN" },
            },
          });
        });
        tx1Success = true;
      } catch (err: unknown) {
        tx1Error = err instanceof Error ? err.message : String(err);
      }
    };

    // Transaction 2: Executed concurrently on Connection 2 (demoting adminB to STAFF)
    const runTx2 = async () => {
      try {
        // Wait until Conn1 has definitely entered and acquired the advisory lock
        while (!conn1AdvisoryAcquired) {
          await new Promise((r) => setTimeout(r, 10));
        }

        await prismaConn2.$transaction(async (tx2) => {
          // Conn2 attempts to acquire the advisory lock — PostgreSQL blocks here until Conn1 commits
          const blockStart = Date.now();
          await tx2.$executeRaw`SELECT pg_advisory_xact_lock(982347102)`;
          conn2BlockedDurationMs = Date.now() - blockStart;

          // 2. Row-lock target user
          const locked = await tx2.$queryRaw<Array<{ id: string; role: Role }>>`
            SELECT "id", "role" FROM "User" WHERE "id" = ${adminB.id} FOR UPDATE
          `;
          if (locked.length === 0) throw new Error("User not found.");

          // 3. Count remaining administrators
          const adminCount = await tx2.user.count({ where: { role: "ADMIN" } });
          if (adminCount <= 1) {
            throw new Error("Cannot demote the sole remaining administrator.");
          }

          // 4. Update role
          await tx2.user.update({
            where: { id: adminB.id },
            data: { role: "STAFF" },
          });

          // 5. Authoritative AuditLog creation
          await tx2.auditLog.create({
            data: {
              actorId: adminA.id,
              action: "ADMIN_USER_ROLE_UPDATED",
              entityType: "User",
              entityId: adminB.id,
              metadata: { newRole: "STAFF", previousRole: "ADMIN" },
            },
          });
        });
        tx2Success = true;
      } catch (err: unknown) {
        tx2Error = err instanceof Error ? err.message : String(err);
      }
    };

    // Launch both transactions concurrently
    await Promise.all([runTx1(), runTx2()]);

    // 1. Verify serialization occurred in PostgreSQL
    expect(conn2BlockedDurationMs).toBeGreaterThanOrEqual(80);

    // 2. Verify exactly ONE demotion succeeded and ONE was blocked
    expect(tx1Success).toBe(true);
    expect(tx1Error).toBeNull();
    expect(tx2Success).toBe(false);
    expect(tx2Error).toContain("Cannot demote the sole remaining administrator.");

    // 3. Verify exactly ONE ADMIN remains in the database (never 0)
    const finalAdminCount = await isolatedPrisma.user.count({ where: { role: "ADMIN" } });
    expect(finalAdminCount).toBe(1);

    // 4. Verify adminA is now STAFF and adminB is still ADMIN
    const finalAdminA = await isolatedPrisma.user.findUnique({ where: { id: adminA.id } });
    const finalAdminB = await isolatedPrisma.user.findUnique({ where: { id: adminB.id } });
    expect(finalAdminA?.role).toBe("STAFF");
    expect(finalAdminB?.role).toBe("ADMIN");

    // 5. Verify only ONE AuditLog was created for role update
    const auditLogs = await isolatedPrisma.auditLog.findMany({
      where: {
        entityId: { in: [adminA.id, adminB.id] },
        action: "ADMIN_USER_ROLE_UPDATED",
      },
    });
    expect(auditLogs).toHaveLength(1);
    expect(auditLogs[0].entityId).toBe(adminA.id);
  });
});
