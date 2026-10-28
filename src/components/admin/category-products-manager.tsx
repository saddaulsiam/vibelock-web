"use client";

import * as React from "react";
import { useState, useTransition, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Package,
  Plus,
  Trash2,
  Search,
  X,
  ExternalLink,
  Loader2,
  CheckCircle2,
  AlertCircle,
  FolderPlus,
  ArrowRight,
} from "lucide-react";
import { ProductStatus } from "@prisma/client";
import { ADMIN_TABLE_CLASSES } from "@/lib/admin/admin-table-styles";
import {
  assignProductsToCategoryAction,
  removeProductFromCategoryAction,
} from "@/lib/admin/catalog-actions";
import type {
  CategoryAssignedProduct,
  CategoryAvailableProduct,
} from "@/lib/admin/catalog-queries";

interface CategoryProductsManagerProps {
  categoryId: string;
  categoryName: string;
  initialAssignedProducts: CategoryAssignedProduct[];
  availableProducts: CategoryAvailableProduct[];
}

function formatPrice(amount: number | null): string {
  if (amount === null || isNaN(amount)) return "—";
  return `৳${amount.toLocaleString("en-BD", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function CategoryProductsManager({
  categoryId,
  categoryName,
  initialAssignedProducts,
  availableProducts,
}: CategoryProductsManagerProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  // Assigned products state with render-time prop sync
  const [prevInitial, setPrevInitial] = useState(initialAssignedProducts);
  const [assignedProducts, setAssignedProducts] = useState(initialAssignedProducts);
  if (initialAssignedProducts !== prevInitial) {
    setPrevInitial(initialAssignedProducts);
    setAssignedProducts(initialAssignedProducts);
  }

  // Assigned table search
  const [search, setSearch] = useState("");

  // Add modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [modalSearch, setModalSearch] = useState("");
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [modalSubmitting, setModalSubmitting] = useState(false);

  // Row removal state
  const [removingId, setRemovingId] = useState<string | null>(null);

  // Status notification
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Filter assigned products
  const filteredAssigned = useMemo(() => {
    if (!search.trim()) return assignedProducts;
    const q = search.toLowerCase().trim();
    return assignedProducts.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.slug.toLowerCase().includes(q) ||
        p.categoryNames.some((c) => c.toLowerCase().includes(q))
    );
  }, [assignedProducts, search]);

  // Filter available products in add modal
  // Filter out any that were already added to assignedProducts in local state
  const assignedIdSet = useMemo(
    () => new Set(assignedProducts.map((p) => p.id)),
    [assignedProducts]
  );

  const eligibleAvailable = useMemo(
    () => availableProducts.filter((p) => !assignedIdSet.has(p.id)),
    [availableProducts, assignedIdSet]
  );

  const filteredAvailable = useMemo(() => {
    if (!modalSearch.trim()) return eligibleAvailable;
    const q = modalSearch.toLowerCase().trim();
    return eligibleAvailable.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.slug.toLowerCase().includes(q) ||
        p.categoryNames.some((c) => c.toLowerCase().includes(q))
    );
  }, [eligibleAvailable, modalSearch]);

  // Modal selection helpers
  const toggleSelectProduct = (id: string) => {
    setSelectedProductIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllFiltered = () => {
    const allFilteredIds = filteredAvailable.map((p) => p.id);
    const allSelected = allFilteredIds.every((id) => selectedProductIds.includes(id));
    if (allSelected) {
      // Deselect all filtered
      setSelectedProductIds((prev) => prev.filter((id) => !allFilteredIds.includes(id)));
    } else {
      // Select all filtered
      const newSelection = Array.from(new Set([...selectedProductIds, ...allFilteredIds]));
      setSelectedProductIds(newSelection);
    }
  };

  // Assign action
  const handleAssignSelected = async () => {
    if (selectedProductIds.length === 0) return;
    setModalSubmitting(true);
    setNotification(null);

    const res = await assignProductsToCategoryAction(categoryId, selectedProductIds);

    if (res.error) {
      setNotification({ type: "error", message: res.error });
      setModalSubmitting(false);
      return;
    }

    // Optimistically update assigned list
    const newlyAdded = eligibleAvailable
      .filter((p) => selectedProductIds.includes(p.id))
      .map((p) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        status: p.status,
        primaryImage: p.primaryImage,
        categoryNames: [...p.categoryNames, categoryName],
        variantCount: 1,
        totalStock: p.totalStock,
        minSellingPrice: p.minSellingPrice,
        minDiscountPrice: null,
      }));

    setAssignedProducts((prev) => [...prev, ...newlyAdded]);
    setSelectedProductIds([]);
    setIsAddModalOpen(false);
    setModalSubmitting(false);
    setNotification({
      type: "success",
      message: res.message || `${newlyAdded.length} product(s) assigned successfully.`,
    });

    startTransition(() => {
      router.refresh();
    });
  };

  // Remove action
  const handleRemoveProduct = async (productId: string, productName: string) => {
    if (!window.confirm(`Remove "${productName}" from category "${categoryName}"? The product itself will not be deleted.`)) {
      return;
    }

    setRemovingId(productId);
    setNotification(null);

    const res = await removeProductFromCategoryAction(categoryId, productId);

    if (res.error) {
      setNotification({ type: "error", message: res.error });
      setRemovingId(null);
      return;
    }

    // Optimistically update
    setAssignedProducts((prev) => prev.filter((p) => p.id !== productId));
    setRemovingId(null);
    setNotification({
      type: "success",
      message: `"${productName}" removed from ${categoryName}.`,
    });

    startTransition(() => {
      router.refresh();
    });
  };

  return (
    <div className="space-y-4">
      {/* ── Notification Banner ── */}
      {notification && (
        <div
          className={`flex items-center justify-between rounded-xl border p-4 text-xs font-medium shadow-2xs transition-all ${
            notification.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-900"
              : "border-rose-200 bg-rose-50 text-rose-900"
          }`}
        >
          <div className="flex items-center gap-2.5">
            {notification.type === "success" ? (
              <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
            ) : (
              <AlertCircle className="size-4 shrink-0 text-rose-600" />
            )}
            <span>{notification.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setNotification(null)}
            className="rounded p-1 hover:bg-black/5"
          >
            <X className="size-3.5" />
          </button>
        </div>
      )}

      {/* ── Controls Bar ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 items-center gap-2.5">
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Search assigned products by name or slug...`}
              className="h-10 w-full rounded-lg border border-neutral-200 bg-white pl-9 pr-8 text-xs font-medium text-neutral-900 placeholder:text-neutral-400 shadow-2xs focus:border-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#00D9FF]"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          <div className="text-xs text-neutral-500 whitespace-nowrap">
            Showing <span className="font-semibold text-neutral-900">{filteredAssigned.length}</span>{" "}
            of <span className="font-semibold text-neutral-900">{assignedProducts.length}</span> assigned
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            setModalSearch("");
            setSelectedProductIds([]);
            setIsAddModalOpen(true);
          }}
          className={ADMIN_TABLE_CLASSES.buttonPrimary}
        >
          <Plus className="size-3.5" />
          <span>Add Products to Category</span>
        </button>
      </div>

      {/* ── Assigned Products Table ── */}
      <div className={ADMIN_TABLE_CLASSES.container}>
        <table className={ADMIN_TABLE_CLASSES.table}>
          <thead className={ADMIN_TABLE_CLASSES.thead}>
            <tr>
              <th className="px-4 py-3.5">Assigned Product</th>
              <th className="px-4 py-3.5 text-center">Status</th>
              <th className="px-4 py-3.5 text-center">Total Stock</th>
              <th className="px-4 py-3.5 text-right">Price</th>
              <th className="px-4 py-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className={ADMIN_TABLE_CLASSES.tbody}>
            {filteredAssigned.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-14 text-center">
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <Package className="size-10 text-neutral-300" />
                    <p className="text-sm font-semibold text-neutral-800">
                      {search ? "No matching products found" : "No products assigned yet"}
                    </p>
                    <p className="max-w-xs text-xs text-neutral-500">
                      {search
                        ? "Try clearing your search query to see all assigned products."
                        : `Organize your catalog by assigning products to "${categoryName}".`}
                    </p>
                    {!search && (
                      <button
                        type="button"
                        onClick={() => {
                          setModalSearch("");
                          setSelectedProductIds([]);
                          setIsAddModalOpen(true);
                        }}
                        className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-[#101114] px-4 py-2 text-xs font-semibold text-white shadow-2xs hover:bg-[#101114]/85"
                      >
                        <Plus className="size-3.5" />
                        <span>Assign Products Now</span>
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              filteredAssigned.map((product) => {
                const isRemoving = removingId === product.id;

                return (
                  <tr key={product.id} className={ADMIN_TABLE_CLASSES.tr}>
                    {/* Product Name & Thumbnail */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="relative size-11 shrink-0 overflow-hidden rounded-lg border border-neutral-200/90 bg-neutral-100 flex items-center justify-center shadow-2xs">
                          {product.primaryImage ? (
                            <Image
                              src={product.primaryImage}
                              alt={product.name}
                              fill
                              sizes="44px"
                              className="object-cover"
                            />
                          ) : (
                            <Package className="size-5 text-neutral-400" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <Link
                            href={`/admin/products/${product.id}/edit`}
                            className="font-semibold text-neutral-900 hover:text-black hover:underline"
                          >
                            {product.name}
                          </Link>
                          <div className="font-mono text-[11px] text-neutral-400">
                            /{product.slug}
                          </div>
                          {product.categoryNames.length > 1 && (
                            <div className="mt-1 flex flex-wrap gap-1">
                              {product.categoryNames
                                .filter((c) => c !== categoryName)
                                .map((cat) => (
                                  <span
                                    key={cat}
                                    className="inline-flex items-center rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] font-medium text-neutral-600"
                                  >
                                    {cat}
                                  </span>
                                ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3.5 text-center">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${
                          product.status === ProductStatus.PUBLISHED
                            ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                            : product.status === ProductStatus.DRAFT
                            ? "border-amber-200 bg-amber-50 text-amber-800"
                            : "border-neutral-200 bg-neutral-100 text-neutral-600"
                        }`}
                      >
                        <span
                          className={`size-1.5 rounded-full ${
                            product.status === ProductStatus.PUBLISHED
                              ? "bg-emerald-500"
                              : product.status === ProductStatus.DRAFT
                              ? "bg-amber-500"
                              : "bg-neutral-400"
                          }`}
                        />
                        {product.status}
                      </span>
                    </td>

                    {/* Stock Level */}
                    <td className="px-4 py-3.5 text-center">
                      <span
                        className={`inline-flex items-center rounded-md border px-2 py-0.5 font-mono text-[11px] font-semibold ${
                          product.totalStock > 5
                            ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                            : product.totalStock > 0
                            ? "border-amber-200 bg-amber-50 text-amber-800"
                            : "border-rose-200 bg-rose-50 text-rose-800"
                        }`}
                      >
                        {product.totalStock > 0 ? `${product.totalStock} in stock` : "Out of stock"}
                      </span>
                    </td>

                    {/* Selling Price */}
                    <td className="px-4 py-3.5 text-right font-medium text-neutral-900">
                      {formatPrice(product.minSellingPrice)}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          href={`/admin/products/${product.id}/edit`}
                          title={`Edit ${product.name}`}
                          className="inline-flex h-8 items-center gap-1 rounded-lg border border-neutral-200 bg-white px-2.5 text-xs font-semibold text-neutral-700 shadow-2xs hover:bg-neutral-50 hover:text-neutral-950 transition-colors"
                        >
                          <ExternalLink className="size-3 text-neutral-400" />
                          <span>Edit</span>
                        </Link>

                        <button
                          type="button"
                          onClick={() => handleRemoveProduct(product.id, product.name)}
                          disabled={isRemoving}
                          title={`Remove from ${categoryName}`}
                          className="inline-flex h-8 items-center gap-1 rounded-lg border border-rose-200 bg-white px-2.5 text-xs font-semibold text-rose-700 shadow-2xs hover:bg-rose-50 hover:text-rose-900 transition-colors disabled:opacity-50"
                        >
                          {isRemoving ? (
                            <Loader2 className="size-3 animate-spin text-rose-600" />
                          ) : (
                            <Trash2 className="size-3 text-rose-500" />
                          )}
                          <span>Remove</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ── Assign Products Modal ── */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={() => !modalSubmitting && setIsAddModalOpen(false)}
            aria-hidden="true"
          />

          <div className="relative z-10 flex w-full max-w-2xl flex-col max-h-[85vh] rounded-2xl border border-neutral-200 bg-white shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-neutral-100 p-5">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700 ring-1 ring-blue-200">
                  <FolderPlus className="size-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-neutral-900">
                    Add Products to {categoryName}
                  </h3>
                  <p className="text-xs text-neutral-500">
                    Select products from your catalog to assign them to this category.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                disabled={modalSubmitting}
                className="flex size-8 items-center justify-center rounded-lg text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 transition"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Modal Filter / Search */}
            <div className="border-b border-neutral-100 bg-neutral-50/60 p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400" />
                  <input
                    type="text"
                    value={modalSearch}
                    onChange={(e) => setModalSearch(e.target.value)}
                    placeholder="Search unassigned products..."
                    className="h-9.5 w-full rounded-lg border border-neutral-200 bg-white pl-9 pr-3 text-xs font-medium text-neutral-900 placeholder:text-neutral-400 shadow-2xs focus:border-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#00D9FF]"
                  />
                </div>

                {filteredAvailable.length > 0 && (
                  <button
                    type="button"
                    onClick={handleSelectAllFiltered}
                    className="inline-flex h-9.5 shrink-0 items-center rounded-lg border border-neutral-200 bg-white px-3 text-xs font-semibold text-neutral-700 shadow-2xs hover:bg-neutral-50 transition"
                  >
                    {filteredAvailable.every((p) => selectedProductIds.includes(p.id))
                      ? "Deselect All"
                      : "Select All"}
                  </button>
                )}
              </div>
            </div>

            {/* Scrollable Product List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {filteredAvailable.length === 0 ? (
                <div className="py-12 text-center">
                  <Package className="mx-auto size-10 text-neutral-300" />
                  <p className="mt-2 text-sm font-semibold text-neutral-800">
                    {modalSearch
                      ? "No matching unassigned products"
                      : "All catalog products are already assigned to this category"}
                  </p>
                  <p className="mt-1 text-xs text-neutral-500">
                    {modalSearch
                      ? "Try searching with a different term."
                      : "Create new products in the catalog to add them here."}
                  </p>
                </div>
              ) : (
                filteredAvailable.map((product) => {
                  const isChecked = selectedProductIds.includes(product.id);

                  return (
                    <label
                      key={product.id}
                      className={`flex cursor-pointer items-center justify-between rounded-xl border p-3 transition-colors ${
                        isChecked
                          ? "border-blue-400 bg-blue-50/50 shadow-2xs"
                          : "border-neutral-200/90 bg-white hover:border-neutral-300 hover:bg-neutral-50/60"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleSelectProduct(product.id)}
                          className="size-4 rounded border-neutral-300 text-blue-600 focus:ring-blue-500"
                        />
                        <div className="relative size-10 shrink-0 overflow-hidden rounded-lg border border-neutral-200 bg-neutral-100 flex items-center justify-center">
                          {product.primaryImage ? (
                            <Image
                              src={product.primaryImage}
                              alt={product.name}
                              fill
                              sizes="40px"
                              className="object-cover"
                            />
                          ) : (
                            <Package className="size-4 text-neutral-400" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-xs font-bold text-neutral-900">
                            {product.name}
                          </p>
                          <div className="flex items-center gap-2 text-[11px] text-neutral-500">
                            <span className="font-mono text-neutral-400">/{product.slug}</span>
                            <span>•</span>
                            <span>{product.totalStock > 0 ? `${product.totalStock} in stock` : "0 stock"}</span>
                          </div>
                        </div>
                      </div>

                      <div className="shrink-0 pl-3 text-right">
                        <span className="text-xs font-semibold text-neutral-900">
                          {formatPrice(product.minSellingPrice)}
                        </span>
                      </div>
                    </label>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between border-t border-neutral-100 bg-neutral-50/40 p-4">
              <span className="text-xs font-medium text-neutral-600">
                <span className="font-bold text-neutral-900">{selectedProductIds.length}</span> product(s) selected
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  disabled={modalSubmitting}
                  className="h-9.5 rounded-lg border border-neutral-200 px-4 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAssignSelected}
                  disabled={selectedProductIds.length === 0 || modalSubmitting}
                  className="inline-flex h-9.5 items-center justify-center gap-1.5 rounded-lg bg-[#101114] px-4 text-xs font-bold text-white shadow-2xs hover:bg-[#101114]/85 disabled:opacity-40 transition"
                >
                  {modalSubmitting ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin" />
                      <span>Assigning...</span>
                    </>
                  ) : (
                    <>
                      <span>Assign Selected ({selectedProductIds.length})</span>
                      <ArrowRight className="size-3.5" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
