import Link from "next/link";
import Image from "next/image";
import { BannerPlacement } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getAdminBanners } from "@/lib/admin/banners";
import { deleteBannerAction, toggleBannerAction } from "@/lib/admin/banners";

function placementLabel(value: BannerPlacement) {
  return value === "BOTH"
    ? "Category + search"
    : value === "CATEGORY"
      ? "Category pages"
      : "Search results";
}

export default async function AdminBannersPage() {
  const banners = await getAdminBanners();
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Promotional banners</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Manage full-width category and search campaign banners.
          </p>
        </div>
        <Button asChild variant="primary">
          <Link href="/admin/banners/new">Create banner</Link>
        </Button>
      </div>
      {banners.length === 0 ? (
        <div className="border border-dashed p-12 text-center">
          <h2 className="font-semibold">No banners yet</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Create a banner to promote a collection or campaign.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {banners.map((banner) => (
            <article
              key={banner.id}
              className="grid gap-4 border bg-white p-4 md:grid-cols-[240px_1fr]"
            >
              <div className="bg-vl-white-300 relative aspect-16/7 overflow-hidden">
                <Image
                  src={banner.imageUrl}
                  alt={banner.title}
                  fill
                  sizes="240px"
                  className="object-cover"
                />
              </div>
              <div className="flex min-w-0 flex-col justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-semibold">{banner.title}</h2>
                    <Badge variant={banner.isActive ? "success" : "secondary"}>
                      {banner.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground mt-1 text-sm">
                    {placementLabel(banner.placement)} · Order {banner.sortOrder}
                  </p>
                  <p className="text-muted-foreground mt-1 text-sm">
                    {banner.categories.length
                      ? banner.categories.map((category) => category.name).join(", ")
                      : "All categories"}
                  </p>
                  {banner.linkUrl ? (
                    <p className="text-muted-foreground mt-1 text-xs break-all">
                      Link: {banner.linkUrl}
                    </p>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button asChild variant="secondary" size="sm">
                    <Link href={`/admin/banners/${banner.id}/edit`}>Edit</Link>
                  </Button>
                  <form action={toggleBannerAction}>
                    <input type="hidden" name="id" value={banner.id} />
                    <input type="hidden" name="active" value={String(!banner.isActive)} />
                    <Button type="submit" variant="secondary" size="sm">
                      {banner.isActive ? "Deactivate" : "Activate"}
                    </Button>
                  </form>
                  <form action={deleteBannerAction}>
                    <input type="hidden" name="id" value={banner.id} />
                    <Button type="submit" variant="destructive" size="sm">
                      Delete
                    </Button>
                  </form>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
