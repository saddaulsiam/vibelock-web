import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  calculateTierEarnedPoints,
  determineLoyaltyTier,
  TIER_MULTIPLIERS,
} from "@/lib/settings/loyalty-settings";

describe("Loyalty Program - Tier Multipliers and Qualification", () => {
  const thresholds = {
    silverThreshold: 5000,
    goldThreshold: 20000,
    platinumThreshold: 50000,
  };

  it("determines correct tiers based on lifetime spend thresholds", () => {
    expect(determineLoyaltyTier(0, thresholds)).toBe("BRONZE");
    expect(determineLoyaltyTier(4999, thresholds)).toBe("BRONZE");
    expect(determineLoyaltyTier(5000, thresholds)).toBe("SILVER");
    expect(determineLoyaltyTier(19999, thresholds)).toBe("SILVER");
    expect(determineLoyaltyTier(20000, thresholds)).toBe("GOLD");
    expect(determineLoyaltyTier(49999, thresholds)).toBe("GOLD");
    expect(determineLoyaltyTier(50000, thresholds)).toBe("PLATINUM");
    expect(determineLoyaltyTier(100000, thresholds)).toBe("PLATINUM");
  });

  it("correctly calculates points earned with tier multipliers", () => {
    const spend = 1000;
    const spendPerPoint = 100; // Base: 10 points

    // BRONZE: 1.0x -> 10 pts
    expect(calculateTierEarnedPoints(spend, "BRONZE", spendPerPoint)).toBe(10);

    // SILVER: 1.25x -> 12 pts (floor of 12.5)
    expect(calculateTierEarnedPoints(spend, "SILVER", spendPerPoint)).toBe(12);

    // GOLD: 1.5x -> 15 pts
    expect(calculateTierEarnedPoints(spend, "GOLD", spendPerPoint)).toBe(15);

    // PLATINUM: 2.0x -> 20 pts
    expect(calculateTierEarnedPoints(spend, "PLATINUM", spendPerPoint)).toBe(20);
  });

  it("handles zero or negative spend safely", () => {
    expect(calculateTierEarnedPoints(0, "PLATINUM", 100)).toBe(0);
    expect(calculateTierEarnedPoints(-500, "GOLD", 100)).toBe(0);
  });
});
