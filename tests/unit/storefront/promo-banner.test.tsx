import { describe, expect, test } from "vitest";
import { PromoBanner, PromoBannerCarousel } from "@/components/storefront/catalog/promo-banner";
import type { PublicPromoBanner } from "@/lib/catalog/banners";

describe("PromoBanner component", () => {
  const baseBanner: PublicPromoBanner = {
    id: "banner-1",
    title: "Monsoon Drop 2026",
    imageUrl: "https://res.cloudinary.com/test/image/upload/v1/desktop.webp",
    mobileImageUrl: null,
    linkUrl: null,
  };

  test("renders semantic aside landmark when banner is not clickable", () => {
    const element = PromoBanner({ banner: baseBanner, className: "mb-8" });
    expect(element).not.toBeNull();
    expect(element!.type).toBe("aside");
    expect(element!.props["aria-label"]).toBe("Monsoon Drop 2026");
    expect(element!.props.className).toContain("mb-8");
    expect(element!.props.className).toContain("aspect-[16/7]");
    expect(element!.props.className).toContain("rounded-2xl");
  });

  test("uses dedicated mobile aspect ratio when mobileImageUrl is provided", () => {
    const bannerWithMobile: PublicPromoBanner = {
      ...baseBanner,
      mobileImageUrl: "https://res.cloudinary.com/test/image/upload/v1/mobile.webp",
    };
    const element = PromoBanner({ banner: bannerWithMobile });
    expect(element).not.toBeNull();
    expect(element!.props.className).toContain("aspect-[3/2]");
    expect(element!.props.className).toContain("sm:aspect-[16/5]");
  });

  test("renders accessible Link with focus ring and Explore badge when linkUrl is present", () => {
    const clickableBanner: PublicPromoBanner = {
      ...baseBanner,
      linkUrl: "/products?category=monsoon",
    };
    const element = PromoBanner({ banner: clickableBanner, className: "mb-10" });
    expect(element).not.toBeNull();
    expect(element!.props.href).toBe("/products?category=monsoon");
    expect(element!.props["aria-label"]).toBe("Monsoon Drop 2026");
    expect(element!.props.className).toContain("mb-10");
    expect(element!.props.className).toContain("focus-visible:ring-vl-cyan");
  });

  test("renders carousel component when multiple banners are provided", () => {
    const banners: PublicPromoBanner[] = [
      baseBanner,
      {
        id: "banner-2",
        title: "Winter Drop 2026",
        imageUrl: "https://res.cloudinary.com/test/image/upload/v1/desktop2.webp",
        mobileImageUrl: null,
        linkUrl: "/shop?category=winter",
      },
    ];

    const element = PromoBanner({ banners });
    expect(element).not.toBeNull();
    expect(element!.type).toBe(PromoBannerCarousel);
    expect(element!.props.bannerList).toEqual(banners);
    expect(element!.props.containerClasses).toContain("rounded-2xl");
  });
});
