"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import type {
  AdminInventoryDetailResult,
  AdminInventoryItem,
} from "@/lib/admin/inventory/inventory-queries";
import { AdminInventoryPoModal } from "./admin-inventory-po-modal";
import { AdminInventoryBarcodeModal } from "./admin-inventory-barcode-modal";
import { AdminInventoryDetailHeader } from "./admin-inventory-detail-header";
import { AdminInventoryDetailKpi } from "./admin-inventory-detail-kpi";
import { AdminInventoryDetailLedger } from "./admin-inventory-detail-ledger";
import { AdminInventoryDetailAdjustModal } from "./admin-inventory-detail-adjust-modal";

export function AdminInventoryDetail({ data }: { data: AdminInventoryDetailResult }) {
  const router = useRouter();
  const {
    variant,
    totalStock,
    reservedStock,
    availableStock,
    totalSold,
    totalRestocked,
    totalDamaged,
    transactions,
    totalPages,
    page,
    typeFilter,
    totalTransactions,
  } = data;

  // Valuation metrics
  const costValuation = totalStock * variant.costPrice;
  const retailValuation = totalStock * variant.sellingPrice;

  // Modals state
  const [isAdjustModalOpen, setIsAdjustModalOpen] = React.useState(false);
  const [showBarcodeModal, setShowBarcodeModal] = React.useState(false);
  const [showPoModal, setShowPoModal] = React.useState(false);

  // Convert variant to AdminInventoryItem for Barcode Modal and PO Modal
  const barcodeItem: AdminInventoryItem = React.useMemo(
    () => ({
      id: variant.id,
      sku: variant.sku,
      size: variant.size,
      color: variant.color,
      costPrice: variant.costPrice,
      sellingPrice: variant.sellingPrice,
      discountPrice: variant.discountPrice,
      productId: variant.product.id,
      productSlug: variant.product.slug,
      primaryImage: variant.primaryImage,
      totalStock,
      reserved: reservedStock,
      available: availableStock,
      product: {
        id: variant.product.id,
        name: variant.product.name,
        slug: variant.product.slug,
      },
    }),
    [variant, totalStock, reservedStock, availableStock]
  );

  const handleFilterChange = (type: string) => {
    const params = new URLSearchParams(window.location.search);
    if (type === "ALL") {
      params.delete("type");
    } else {
      params.set("type", type);
    }
    params.delete("page"); // Reset to page 1 on filter change
    router.push(`/admin/inventory/${variant.id}?${params.toString()}`);
  };

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(window.location.search);
    params.set("page", String(newPage));
    router.push(`/admin/inventory/${variant.id}?${params.toString()}`);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Hero Variant Profile Card & Navigation Header */}
      <AdminInventoryDetailHeader
        variant={variant}
        availableStock={availableStock}
        onOpenPrintTag={() => setShowBarcodeModal(true)}
        onOpenPo={() => setShowPoModal(true)}
        onOpenAdjust={() => setIsAdjustModalOpen(true)}
      />

      {/* KPI Metric Cards */}
      <AdminInventoryDetailKpi
        totalStock={totalStock}
        reservedStock={reservedStock}
        availableStock={availableStock}
        costValuation={costValuation}
        retailValuation={retailValuation}
        totalSold={totalSold}
        totalRestocked={totalRestocked}
        totalDamaged={totalDamaged}
        totalTransactions={totalTransactions}
      />

      {/* Stock Movement Timeline & Ledger Table */}
      <AdminInventoryDetailLedger
        sku={variant.sku}
        transactions={transactions}
        totalPages={totalPages}
        page={page}
        typeFilter={typeFilter}
        onFilterChange={handleFilterChange}
        onPageChange={handlePageChange}
      />

      {/* Quick Stock Adjustment Modal */}
      <AdminInventoryDetailAdjustModal
        isOpen={isAdjustModalOpen}
        onClose={() => setIsAdjustModalOpen(false)}
        variant={variant}
        totalStock={totalStock}
        reservedStock={reservedStock}
        onSuccess={() => {
          router.refresh();
        }}
      />

      {/* Barcode & Price Tag Printing Modal */}
      <AdminInventoryBarcodeModal
        items={showBarcodeModal ? [barcodeItem] : null}
        onClose={() => setShowBarcodeModal(false)}
      />

      {/* Supplier Purchase Order (PO) Modal */}
      <AdminInventoryPoModal
        isOpen={showPoModal}
        onClose={() => setShowPoModal(false)}
        initialItems={[barcodeItem]}
        availableVariants={[barcodeItem]}
      />
    </div>
  );
}
