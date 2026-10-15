import Image from "next/image";
import Link from "next/link";
import type { PublicPromoBanner } from "@/lib/catalog/banners";

export function PromoBanner({
  banner,
  className,
}: {
  banner: PublicPromoBanner;
  className?: string;
}) {
  const content = (
    <div
      className={`relative isolate mx-auto aspect-[3/2] max-h-[420px] w-full overflow-hidden bg-[#F3F0E8] sm:aspect-[16/5] lg:aspect-[16/4] ${className ?? ""}`}
    >
      {banner.mobileImageUrl ? (
        <>
          <Image
            src={banner.imageUrl}
            alt={banner.title}
            fill
            priority
            sizes="100vw"
            className="hidden object-cover sm:block"
          />
          <Image
            src={banner.mobileImageUrl}
            alt={banner.title}
            fill
            priority
            sizes="100vw"
            className="object-cover sm:hidden"
          />
        </>
      ) : (
        <Image
          src={banner.imageUrl}
          alt={banner.title}
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
      )}
    </div>
  );

  return banner.linkUrl ? (
    <Link
      href={banner.linkUrl}
      aria-label={banner.title}
      className="group block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#00D9FF]"
    >
      {content}
    </Link>
  ) : content;
}
