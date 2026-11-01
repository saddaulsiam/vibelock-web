import { describe, expect, test } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ProductImageUploader } from "@/components/admin/products";

describe("ProductImageUploader component", () => {
  const sampleImages = [
    { url: "https://res.cloudinary.com/test/front.webp", isPrimary: true },
    { url: "https://res.cloudinary.com/test/back.webp", isPrimary: false },
  ];

  test("renders dropzone and toggle button by default", () => {
    const html = renderToStaticMarkup(<ProductImageUploader initialImages={[]} />);

    expect(html).toContain("Product images");
    expect(html).toContain("Click or drag to upload images");
    expect(html).toContain("Or use external image URLs");
    expect(html).toContain('type="file"');
    expect(html).toContain('name="imageFiles"');
  });

  test("renders initial gallery images with Primary badge", () => {
    const html = renderToStaticMarkup(<ProductImageUploader initialImages={sampleImages} />);

    expect(html).toContain("Gallery preview (2 of 12 images)");
    expect(html).toContain("Primary");
    expect(html).toContain("https://res.cloudinary.com/test/front.webp");
    expect(html).toContain("https://res.cloudinary.com/test/back.webp");
    expect(html).toContain('name="imageManifest"');
    expect(html).toContain('name="imageUrls"');
  });

  test("embeds initial images in hidden imageUrls input for backward compatibility", () => {
    const html = renderToStaticMarkup(<ProductImageUploader initialImages={sampleImages} />);

    expect(html).toContain('name="imageUrls"');
    expect(html).toContain("https://res.cloudinary.com/test/front.webp");
    expect(html).toContain("https://res.cloudinary.com/test/back.webp");
  });
});
