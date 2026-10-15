import Link from "next/link";
import Image from "next/image";
import { BannerPlacement } from "@prisma/client";
import { getAdminBanners } from "@/lib/admin/banner-queries";
import { deleteBannerAction, toggleBannerAction } from "@/lib/admin/banner-actions";

function placementLabel(value: BannerPlacement) {
  return value === "BOTH" ? "Category + search" : value === "CATEGORY" ? "Category pages" : "Search results";
}

export default async function AdminBannersPage() {
  const banners = await getAdminBanners();
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><h1 className="text-3xl font-bold tracking-tight">Promotional banners</h1><p className="mt-1 text-sm text-muted-foreground">Manage full-width category and search campaign banners.</p></div>
        <Link href="/admin/banners/new" className="inline-flex min-h-10 items-center justify-center bg-[#101114] px-4 text-sm font-semibold text-white">Create banner</Link>
      </div>
      {banners.length === 0 ? <div className="border border-dashed p-12 text-center"><h2 className="font-semibold">No banners yet</h2><p className="mt-1 text-sm text-muted-foreground">Create a banner to promote a collection or campaign.</p></div> : (
        <div className="space-y-4">
          {banners.map((banner) => (
            <article key={banner.id} className="grid gap-4 border bg-white p-4 md:grid-cols-[240px_1fr]">
              <div className="relative aspect-[16/7] overflow-hidden bg-[#F3F0E8]">
                <Image src={banner.imageUrl} alt={banner.title} fill sizes="240px" className="object-cover" />
              </div>
              <div className="flex min-w-0 flex-col justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2"><h2 className="font-semibold">{banner.title}</h2><span className={`border px-2 py-0.5 text-xs ${banner.isActive ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-[#101114]/15 bg-[#F3F0E8] text-[#101114]/70"}`}>{banner.isActive ? "Active" : "Inactive"}</span></div>
                  <p className="mt-1 text-sm text-muted-foreground">{placementLabel(banner.placement)} · Order {banner.sortOrder}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{banner.categories.length ? banner.categories.map((category) => category.name).join(", ") : "All categories"}</p>
                  {banner.linkUrl ? <p className="mt-1 break-all text-xs text-muted-foreground">Link: {banner.linkUrl}</p> : null}
                </div>
                <div className="flex flex-wrap gap-3">
                  <Link href={`/admin/banners/${banner.id}/edit`} className="inline-flex min-h-9 items-center border border-[#101114]/20 px-3 text-sm font-medium hover:bg-[#F3F0E8]">Edit</Link>
                  <form action={toggleBannerAction}><input type="hidden" name="id" value={banner.id} /><input type="hidden" name="active" value={String(!banner.isActive)} /><button className="inline-flex min-h-9 items-center border border-[#101114]/20 px-3 text-sm font-medium hover:bg-[#F3F0E8]">{banner.isActive ? "Deactivate" : "Activate"}</button></form>
                  <form action={deleteBannerAction}><input type="hidden" name="id" value={banner.id} /><button className="inline-flex min-h-9 items-center border border-red-200 px-3 text-sm font-medium text-red-700 hover:bg-red-50">Delete</button></form>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
