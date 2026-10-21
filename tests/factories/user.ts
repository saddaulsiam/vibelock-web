import prisma from "../../src/lib/prisma/client";
import { Prisma } from "@prisma/client";

export async function createTestUser(overrides: Partial<Prisma.UserUncheckedCreateInput> = {}) {
  const ts = Date.now().toString() + Math.floor(Math.random() * 1000);
  return prisma.user.create({
    data: {
      email: `test-${ts}@example.com`,
      name: `User-${ts}`,
      ...overrides,
    },
  });
}

export async function createTestCart(userId?: string) {
  return prisma.cart.create({
    data: {
      userId,
    },
  });
}
