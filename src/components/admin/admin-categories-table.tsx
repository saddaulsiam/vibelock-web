"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ExternalLink,
  Folder,
  FolderTree,
  Package,
  Pencil,
  RotateCcw,
  Trash2,
} from "lucide-react";
import {
  AdminTableSearchInput,
  AdminTableTabs,
  type AdminTableTabItem,
} from "@/components/admin/admin-table-controls";
import { ADMIN_TABLE_CLASSES } from "@/lib/admin/admin-table-styles";
import { deleteCategoryAction } from "@/lib/admin/catalog-actions";
import { AdminMutationForm } from "@/components/admin/admin-action-form";

export type AdminCategoryListItem = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  parentId: string | null;
  parent: { name: string } | null;
  _count: { products: number; children: number };
};

export type CategoryFilterTab = "all" | "root" | "sub" | "with_products" | "empty";

export function AdminCategoriesTable({
  initialCategories,
}: {
  initialCategories: AdminCategoryListItem[];
}) {
  const [search, setSearch] = React.useState("");
  const [activeTab, setActiveTab] = React.useState<CategoryFilterTab>("all");
  const searchInputRef = React.useRef<HTMLInputElement>(null);

  // Keyboard shortcut '/' to focus search
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === "/" &&
        !["INPUT", "TEXTAREA", "SELECT"].includes((e.target as HTMLElement)?.tagName)
      ) {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Filtered categories
  const filteredCategories = React.useMemo(() => {
    let result = initialCategories;

    // Filter by tab
    if (activeTab === "root") {
      result = result.filter((c) => !c.parentId);
    } else if (activeTab === "sub") {
      result = result.filter((c) => Boolean(c.parentId));
    } else if (activeTab === "with_products") {
      result = result.filter((c) => c._count.products > 0);
    } else if (activeTab === "empty") {
      result = result.filter((c) => c._count.products === 0);
    }

    // Filter by search query
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.slug.toLowerCase().includes(q) ||
          (c.description && c.description.toLowerCase().includes(q)) ||
          (c.parent && c.parent.name.toLowerCase().includes(q))
      );
    }

    return result;
  }, [initialCategories, activeTab, search]);

  const tabs: AdminTableTabItem<CategoryFilterTab>[] = [
    {
      key: "all",
      label: "All Categories",
      count: initialCategories.length,
    },
    {
      key: "root",
      label: "Root Departments",
      count: initialCategories.filter((c) => !c.parentId).length,
      dotColor: "bg-blue-500",
    },
    {
      key: "sub",
      label: "Sub-Categories",
      count: initialCategories.filter((c) => Boolean(c.parentId)).length,
      dotColor: "bg-amber-500",
    },
    {
      key: "with_products",
      label: "With Products",
      count: initialCategories.filter((c) => c._count.products > 0).length,
      dotColor: "bg-emerald-500",
    },
    {
      key: "empty",
      label: "Unassigned (0)",
      count: initialCategories.filter((c) => c._count.products === 0).length,
      dotColor: "bg-neutral-400",
    },
  ];

  const hasActiveFilters = Boolean(search || activeTab !== "all");

  return (
    <div className="space-y-4">
      {/* ── Tabs Bar ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <AdminTableTabs<CategoryFilterTab>
          tabs={tabs}
          activeKey={activeTab}
          onChange={setActiveTab}
        />
      </div>

      {/* ── Search Bar & Filter Controls ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 items-center gap-2.5">
          <AdminTableSearchInput
            inputRef={searchInputRef}
            value={search}
            onChange={setSearch}
            onClear={() => setSearch("")}
            placeholder="Search category name, slug, or parent... (Press / to focus)"
            className="w-full sm:max-w-md"
          />

          {hasActiveFilters && (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setActiveTab("all");
              }}
              className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-dashed border-neutral-300 px-3 text-xs font-medium text-neutral-600 hover:border-neutral-400 hover:text-neutral-900 transition-colors"
            >
              <RotateCcw className="size-3.5" />
              Reset filters
            </button>
          )}
        </div>

        <div className="text-xs text-neutral-500">
          Showing{" "}
          <span className="font-semibold text-neutral-900">
            {filteredCategories.length}
          </span>{" "}
          of{" "}
          <span className="font-semibold text-neutral-900">
            {initialCategories.length}
          </span>{" "}
          categories
        </div>
      </div>

      {/* ── Categories Table Card ── */}
      <div className={ADMIN_TABLE_CLASSES.container}>
        <table className={ADMIN_TABLE_CLASSES.table}>
          <thead className={ADMIN_TABLE_CLASSES.thead}>
            <tr>
              <th className="px-4 py-3.5">Category</th>
              <th className="px-4 py-3.5">Hierarchy / Tier</th>
              <th className="px-4 py-3.5">Catalog Products</th>
              <th className="px-4 py-3.5">Child Categories</th>
              <th className="px-4 py-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className={ADMIN_TABLE_CLASSES.tbody}>
            {filteredCategories.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-14 text-center">
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <FolderTree className="size-10 text-neutral-300" />
                    <p className="text-sm font-semibold text-neutral-800">
                      No categories found
                    </p>
                    <p className="max-w-xs text-xs text-neutral-500">
                      {hasActiveFilters
                        ? "Try clearing your search query or filter settings to see more categories."
                        : "Create your first category to start organizing products."}
                    </p>
                    {hasActiveFilters ? (
                      <button
                        type="button"
                        onClick={() => {
                          setSearch("");
                          setActiveTab("all");
                        }}
                        className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
                      >
                        <RotateCcw className="size-3" />
                        Clear filters
                      </button>
                    ) : (
                      <Link
                        href="/admin/categories/new"
                        className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-[#101114] px-4 py-2 text-xs font-semibold text-white shadow-2xs hover:bg-[#101114]/85"
                      >
                        Create Category
                      </Link>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              filteredCategories.map((category) => {
                const hasProducts = category._count.products > 0;
                const hasChildren = category._count.children > 0;
                const canDelete = !hasProducts && !hasChildren;

                return (
                  <tr key={category.id} className={ADMIN_TABLE_CLASSES.tr}>
                    {/* Category Name & Thumbnail */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="relative size-11 shrink-0 overflow-hidden rounded-lg border border-neutral-200/90 bg-neutral-100 flex items-center justify-center shadow-2xs">
                          {category.imageUrl ? (
                            <Image
                              src={category.imageUrl}
                              alt={category.name}
                              fill
                              sizes="44px"
                              className="object-cover"
                            />
                          ) : (
                            <Folder className="size-5 text-neutral-400" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-neutral-900">
                              {category.name}
                            </span>
                          </div>
                          <div className="font-mono text-[11px] text-neutral-400">
                            /{category.slug}
                          </div>
                          {category.description && (
                            <p className="mt-0.5 line-clamp-1 max-w-xs text-xs text-neutral-500">
                              {category.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Hierarchy / Parent */}
                    <td className="px-4 py-3.5">
                      {category.parent ? (
                        <div className="inline-flex items-center gap-1.5 rounded-md border border-neutral-200/90 bg-neutral-50 px-2.5 py-1 text-xs font-medium text-neutral-700 shadow-2xs">
                          <Folder className="size-3 text-neutral-400" />
                          <span>{category.parent.name}</span>
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-md border border-blue-200/80 bg-blue-50/70 px-2.5 py-1 text-[11px] font-semibold text-blue-800 shadow-2xs">
                          <span className="size-1.5 rounded-full bg-blue-500" />
                          Root Department
                        </span>
                      )}
                    </td>

                    {/* Catalog Products */}
                    <td className="px-4 py-3.5">
                      {hasProducts ? (
                        <Link
                          href={`/admin/products?category=${category.slug}`}
                          title={`View all ${category._count.products} products in ${category.name}`}
                          className="inline-flex items-center gap-1.5 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800 shadow-2xs hover:bg-emerald-100 hover:text-emerald-950 transition-colors"
                        >
                          <Package className="size-3 text-emerald-600" />
                          <span>{category._count.products} products</span>
                          <span className="text-[10px] text-emerald-600">↗</span>
                        </Link>
                      ) : (
                        <span className="inline-flex items-center rounded-md border border-neutral-200 bg-neutral-50 px-2 py-0.5 text-xs text-neutral-500">
                          0 products
                        </span>
                      )}
                    </td>

                    {/* Children / Sub-categories */}
                    <td className="px-4 py-3.5">
                      {hasChildren ? (
                        <span className="inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800 shadow-2xs">
                          <FolderTree className="size-3 text-amber-600" />
                          <span>{category._count.children} sub-tier{category._count.children === 1 ? "" : "s"}</span>
                        </span>
                      ) : (
                        <span className="text-neutral-400">—</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Storefront Link */}
                        <a
                          href={`/category/${category.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          title={`View "${category.name}" on storefront`}
                          className="inline-flex size-8 items-center justify-center rounded-lg border border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 transition-colors shadow-2xs"
                        >
                          <ExternalLink className="size-3.5" />
                        </a>

                        {/* Edit Button */}
                        <Link
                          href={`/admin/categories/${category.id}/edit`}
                          className="inline-flex h-8 items-center gap-1 rounded-lg border border-neutral-200 bg-white px-2.5 text-xs font-semibold text-neutral-800 shadow-2xs hover:bg-neutral-50 hover:text-neutral-950 transition-colors"
                        >
                          <Pencil className="size-3 text-neutral-500" />
                          <span>Edit</span>
                        </Link>

                        {/* Delete Button */}
                        {canDelete ? (
                          <AdminMutationForm
                            action={deleteCategoryAction}
                            id={category.id}
                            label="Delete"
                            destructive
                            size="sm"
                            variant="outline"
                            confirmMessage={`Are you sure you want to delete category "${category.name}"? This action cannot be undone.`}
                            className="inline-flex items-center"
                          />
                        ) : (
                          <span
                            title="Cannot delete: category has active products or sub-categories"
                            className="inline-flex size-8 items-center justify-center rounded-lg border border-neutral-200 bg-neutral-50 text-neutral-300 cursor-not-allowed"
                          >
                            <Trash2 className="size-3.5" />
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
