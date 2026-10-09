import { vi } from "vitest";

// Simple mock for Next.js unstable_cache
export const unstable_cache = (cb) => cb;
export const revalidatePath = vi.fn();
export const revalidateTag = vi.fn();
export const updateTag = vi.fn();
