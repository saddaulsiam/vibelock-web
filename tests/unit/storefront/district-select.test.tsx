import React from "react";
import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import {
  DistrictSelect,
  BD_DIVISIONS,
  BD_DISTRICTS,
} from "@/components/storefront/checkout/district-select";

describe("DistrictSelect Component", () => {
  it("has exactly 64 districts across 8 divisions with alphabetical sorting", () => {
    const divisionNames = Object.keys(BD_DIVISIONS);
    expect(divisionNames).toHaveLength(8);
    expect(divisionNames).toEqual([
      "Dhaka Division",
      "Chattogram Division",
      "Rajshahi Division",
      "Khulna Division",
      "Barishal Division",
      "Sylhet Division",
      "Rangpur Division",
      "Mymensingh Division",
    ]);

    expect(BD_DISTRICTS).toHaveLength(64);

    // Each division's districts must be sorted alphabetically
    for (const [division, districts] of Object.entries(BD_DIVISIONS)) {
      const sorted = [...districts].sort((a, b) => a.localeCompare(b));
      expect(districts, `${division} districts are sorted alphabetically`).toEqual(sorted);
    }
  });

  it("renders trigger and hidden select with 64 districts in static markup (SSR)", () => {
    const html = renderToStaticMarkup(
      <DistrictSelect value="Munshiganj" onChange={vi.fn()} />
    );

    // Form field ID & combobox semantics
    expect(html).toContain('id="shippingCity"');
    expect(html).toContain('role="combobox"');
    expect(html).toContain("Munshiganj");

    // All division headers present in SSR optgroup
    expect(html).toContain('label="Dhaka Division"');
    expect(html).toContain('label="Chattogram Division"');
    expect(html).toContain('label="Rajshahi Division"');
    expect(html).toContain('label="Khulna Division"');
    expect(html).toContain('label="Barishal Division"');
    expect(html).toContain('label="Sylhet Division"');
    expect(html).toContain('label="Rangpur Division"');
    expect(html).toContain('label="Mymensingh Division"');

    // Sample districts across divisions present in SSR options
    expect(html).toContain('value="Dhaka"');
    expect(html).toContain('value="Chattogram"');
    expect(html).toContain('value="Sylhet"');
    expect(html).toContain('value="Bogura"');
    expect(html).toContain('value="Khulna"');
  });

  it("renders placeholder when no value is selected", () => {
    const html = renderToStaticMarkup(
      <DistrictSelect value="" onChange={vi.fn()} placeholder="Select your district" />
    );

    expect(html).toContain("Select your district");
  });

  it("renders error styles when error prop is true", () => {
    const html = renderToStaticMarkup(
      <DistrictSelect value="" onChange={vi.fn()} error={true} />
    );

    expect(html).toContain('aria-invalid="true"');
    expect(html).toContain("border-destructive");
  });
});
