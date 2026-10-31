import { describe, expect, test, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { AdminTableInfiniteScroll } from "@/components/admin/shared";

describe("AdminTableInfiniteScroll Component Unit Tests", () => {
  test("renders nothing if totalCount is 0", () => {
    const html = renderToStaticMarkup(
      <AdminTableInfiniteScroll
        hasMore={false}
        isLoadingMore={false}
        onLoadMore={vi.fn()}
        loadedCount={0}
        totalCount={0}
        itemName="orders"
      />
    );
    expect(html).toBe("");
  });

  test("renders load more button and count indicator when hasMore is true", () => {
    const html = renderToStaticMarkup(
      <AdminTableInfiniteScroll
        hasMore={true}
        isLoadingMore={false}
        onLoadMore={vi.fn()}
        loadedCount={20}
        totalCount={45}
        itemName="orders"
      />
    );

    expect(html).toContain("Load more orders");
    expect(html).toContain("Showing 20 of 45");
    expect(html).toContain("Scroll down or click the button above to load more items");
    expect(html).toContain('aria-hidden="true"');
  });

  test("renders loading state spinner inside button when isLoadingMore is true", () => {
    const html = renderToStaticMarkup(
      <AdminTableInfiniteScroll
        hasMore={true}
        isLoadingMore={true}
        onLoadMore={vi.fn()}
        loadedCount={20}
        totalCount={45}
        itemName="orders"
      />
    );

    expect(html).toContain("Loading more orders...");
    expect(html).toContain("animate-spin");
    expect(html).not.toContain("Showing 20 of 45");
  });

  test("renders checkmark and all loaded message when hasMore is false", () => {
    const html = renderToStaticMarkup(
      <AdminTableInfiniteScroll
        hasMore={false}
        isLoadingMore={false}
        onLoadMore={vi.fn()}
        loadedCount={45}
        totalCount={45}
        itemName="orders"
      />
    );

    expect(html).toContain("✓");
    expect(html).toContain("All <strong class=\"text-[#101114]\">45</strong> orders loaded");
    expect(html).not.toContain("Load more orders");
  });

  test("renders filter summary note when all items loaded with active filters", () => {
    const html = renderToStaticMarkup(
      <AdminTableInfiniteScroll
        hasMore={false}
        isLoadingMore={false}
        onLoadMore={vi.fn()}
        loadedCount={5}
        totalCount={5}
        itemName="orders"
        filterSummary="filtered from 120 total"
      />
    );

    expect(html).toContain("All <strong class=\"text-[#101114]\">5</strong> orders loaded (filtered from 120 total)");
  });
});
