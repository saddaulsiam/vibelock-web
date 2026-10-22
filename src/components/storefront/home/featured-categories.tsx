import { Container } from "@/components/shared/container";
import type { CategorySummary } from "@/lib/catalog/types";
import Image from "next/image";
import Link from "next/link";
import { getCategoryImageUrl } from "./home-categories";

interface FeaturedCategoriesProps {
  categories: CategorySummary[];
}

export function FeaturedCategories({ categories }: FeaturedCategoriesProps) {
  return (
    <section className="bg-white py-12 sm:py-16 lg:py-20">
      <Container>
        {/* Centered Header with Decorative Flanking Lines */}
        <div className="mb-8 flex items-center justify-center gap-3 sm:mb-12 sm:gap-6">
          <span className="h-px w-10 bg-[#101114] sm:w-20" aria-hidden="true" />
          <h2 className="text-lg font-black tracking-widest text-[#101114] uppercase sm:text-xl md:text-2xl">
            FEATURED CATEGORIES
          </h2>
          <span className="h-px w-10 bg-[#101114] sm:w-20" aria-hidden="true" />
        </div>

        {/* 8 Category Cards (4x2 on desktop, 2x4 on mobile) */}
        {categories.length ? (
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            {categories.map((category) => {
              const cleanName = category.name.replace(/^\d+[.\s-]+/, "").trim();
              const imageUrl =
                category.imageUrl || getCategoryImageUrl(category.slug, category.name);

              return (
                <Link
                  key={category.id}
                  href={`/category/${category.slug}`}
                  className="group relative flex aspect-[3/4] flex-col justify-end overflow-hidden bg-[#101114] text-white focus-visible:ring-2 focus-visible:ring-[#00D9FF] focus-visible:outline-none"
                >
                  {/* Category Image */}
                  <Image
                    src={imageUrl}
                    alt={cleanName}
                    fill
                    sizes="(min-width: 1024px) 25vw, (min-width: 768px) 50vw, 50vw"
                    className="object-cover object-center transition-transform duration-500 ease-out group-hover:scale-105"
                  />

                  {/* Gradient Overlay for Bottom Legibility */}
                  <div
                    className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent transition-opacity group-hover:from-black/85"
                    aria-hidden="true"
                  />

                  {/* Bottom Centered Category Label */}
                  <div className="relative z-10 w-full px-2 pb-4 text-center sm:pb-5">
                    <span className="text-sm font-bold tracking-wide text-white drop-shadow-md sm:text-base">
                      {cleanName}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="text-muted-foreground rounded-sm border border-dashed border-[#101114]/20 px-4 py-12 text-center text-sm">
            No categories available yet.
          </div>
        )}
      </Container>
    </section>
  );
}
