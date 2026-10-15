import { notFound } from "next/navigation";
import Link from "next/link";
import { BannerForm } from "@/components/admin/banner-form";
import prisma from "@/lib/prisma/client";
import { requireRole } from "@/lib/auth/authorization";
import { getAdminBannerById } from "@/lib/admin/banner-queries";

export default async function EditBannerPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole("ADMIN");
  const { id } = await params;
  const [banner, categories] = await Promise.all([
    getAdminBannerById(id),
    prisma.category.findMany({ select: { id: true, name: true, slug: true }, orderBy: { name: "asc" } }),
  ]);
  if (!banner) notFound();
  return <div className="max-w-4xl space-y-6"><div><Link href="/admin/banners" className="text-sm font-medium hover:underline">← Back to banners</Link><h1 className="mt-3 text-3xl font-bold tracking-tight">Edit banner</h1></div><div className="border bg-white p-5 sm:p-7"><BannerForm banner={banner} categories={categories} /></div></div>;
}
