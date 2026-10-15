-- Promotional banners can be targeted to category pages, search results, or both.
CREATE TYPE "BannerPlacement" AS ENUM ('CATEGORY', 'SEARCH', 'BOTH');

ALTER TABLE "Banner"
  ADD COLUMN "placement" "BannerPlacement" NOT NULL DEFAULT 'BOTH',
  ADD COLUMN "mobileImageUrl" TEXT,
  ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0;

CREATE INDEX "Banner_isActive_placement_sortOrder_idx"
  ON "Banner"("isActive", "placement", "sortOrder");

CREATE TABLE "_BannerCategories" (
  "A" TEXT NOT NULL,
  "B" TEXT NOT NULL,
  CONSTRAINT "_BannerCategories_AB_pkey" PRIMARY KEY ("A", "B")
);

CREATE INDEX "_BannerCategories_B_index" ON "_BannerCategories"("B");

ALTER TABLE "_BannerCategories"
  ADD CONSTRAINT "_BannerCategories_A_fkey"
  FOREIGN KEY ("A") REFERENCES "Banner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "_BannerCategories"
  ADD CONSTRAINT "_BannerCategories_B_fkey"
  FOREIGN KEY ("B") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;
