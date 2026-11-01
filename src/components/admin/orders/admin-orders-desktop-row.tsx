"use client";

import * as React from "react";
import Link from "next/link";
import {
  Banknote,
  Check,
  CheckCircle2,
  Copy,
  CreditCard,
  Eye,
  MessageCircle,
  Package,
  Phone,
  Truck,
} from "lucide-react";
import type { OrderStatus } from "@prisma/client";
import { TableCell, TableRow } from "@/components/ui/table";
import type { AdminOrderItem } from "@/lib/admin/orders/order-queries";
import {
  getOrderStatusBadge,
  getPaymentStatusBadge,
} from "@/components/admin/orders/admin-order-badges";
import type { OrderColumnKey } from "./order-table-types";
import { formatBdt, formatDate, formatWhatsAppUrl } from "./order-table-utils";

export interface AdminOrdersDesktopRowProps {
  order: AdminOrderItem;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
  visibleColumns: Record<OrderColumnKey, boolean>;
  copiedTracking: string | null;
  onCopyTracking: (tracking: string) => void;
  updatingOrderId: string | null;
  onQuickStatus: (orderId: string, nextStatus: OrderStatus) => void;
}

export function AdminOrdersDesktopRow({
  order,
  isSelected,
  onToggleSelect,
  visibleColumns,
  copiedTracking,
  onCopyTracking,
  updatingOrderId,
  onQuickStatus,
}: AdminOrdersDesktopRowProps) {
  return (
    <TableRow className={isSelected ? "bg-amber-50/40" : undefined}>
      {/* Row Checkbox */}
      <TableCell className="px-4 text-center">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onToggleSelect(order.id)}
          aria-label={`Select order ${order.orderNumber}`}
          className="size-3.5 rounded-xs border-neutral-300 accent-[#101114] focus:ring-1 focus:ring-[#00D9FF]"
        />
      </TableCell>

      {/* Order # and Date */}
      {visibleColumns.date && (
        <TableCell>
          <div className="flex flex-wrap items-center gap-1.5">
            <Link
              href={`/admin/orders/${order.id}`}
              className="font-mono text-xs font-bold text-[#101114] hover:text-[#00D9FF] hover:underline"
            >
              {order.orderNumber}
            </Link>
            <span
              className={`rounded-2xs py-0.2 inline-flex items-center px-1.5 text-[9px] font-bold tracking-wider uppercase ${
                order.salesChannel === "POS"
                  ? "border border-purple-200 bg-purple-50 text-purple-700"
                  : "border border-blue-200 bg-blue-50 text-blue-700"
              }`}
            >
              {order.salesChannel === "POS" ? "POS" : "WEB"}
            </span>
          </div>
          <div className="mt-0.5 text-[11px] text-neutral-500">{formatDate(order.createdAt)}</div>
        </TableCell>
      )}

      {/* Customer Info with WhatsApp and Phone 1-click links */}
      {visibleColumns.customer && (
        <TableCell>
          <div className="font-semibold text-neutral-900">
            {order.customerName || "Guest Customer"}
          </div>
          <div className="text-[11px] text-neutral-500">{order.customerEmail}</div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-neutral-700">
            {order.customerPhone && (
              <div className="flex items-center gap-1">
                <span className="font-mono">{order.customerPhone}</span>
                {/* 1-click Direct Call */}
                <a
                  href={`tel:${order.customerPhone}`}
                  className="rounded p-0.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-900"
                  title={`Call ${order.customerPhone}`}
                >
                  <Phone className="size-3" />
                </a>
                {/* 1-click Direct WhatsApp Chat */}
                <a
                  href={formatWhatsAppUrl(
                    order.customerPhone,
                    order.orderNumber,
                    order.customerName
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded p-0.5 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"
                  title="Chat on WhatsApp to confirm order"
                >
                  <MessageCircle className="size-3" />
                </a>
              </div>
            )}
            {order.shippingCity && (
              <span className="py-0.2 rounded-xs bg-neutral-100 px-1 text-[10px] font-medium text-neutral-600">
                {order.shippingCity}
              </span>
            )}
          </div>
        </TableCell>
      )}

      {/* Items */}
      {visibleColumns.items && (
        <TableCell className="text-center">
          <div className="flex flex-col items-center gap-0.5">
            <span className="inline-flex items-center gap-1 rounded-sm bg-[#F3F0E8] px-2 py-0.5 text-xs font-semibold text-[#101114]">
              <Package className="size-3 text-neutral-600" />
              {order.itemCount} {order.itemCount === 1 ? "item" : "items"}
            </span>
            {order.itemsSummary ? (
              <span
                className="block max-w-[150px] truncate text-[10px] text-neutral-500 transition-colors hover:text-neutral-900"
                title={order.itemsSummary}
              >
                {order.itemsSummary}
              </span>
            ) : null}
          </div>
        </TableCell>
      )}

      {/* Total Amount in BDT */}
      {visibleColumns.total && (
        <TableCell className="text-right whitespace-nowrap tabular-nums">
          <div className="font-bold text-[#101114]">{formatBdt(order.total)}</div>
          {order.discount > 0 && (
            <div className="text-[10px] text-neutral-500">Saved {formatBdt(order.discount)}</div>
          )}
        </TableCell>
      )}

      {/* Payment */}
      {visibleColumns.payment && (
        <TableCell className="whitespace-nowrap">
          <div className="flex items-center gap-1.5">
            <span className="inline-flex items-center gap-1 rounded-xs bg-neutral-100 px-1.5 py-0.5 text-[10px] font-semibold text-neutral-800">
              {order.paymentMethod === "COD" ? (
                <>
                  <Banknote className="size-3 text-emerald-700" /> COD
                </>
              ) : (
                <>
                  <CreditCard className="size-3 text-blue-700" /> ONLINE
                </>
              )}
            </span>
            {getPaymentStatusBadge(order.paymentStatus)}
          </div>
        </TableCell>
      )}

      {/* Courier Provider & Tracking */}
      {visibleColumns.shipment && (
        <TableCell>
          {order.shipment ? (
            <div className="space-y-1">
              <div className="flex items-center gap-1.5">
                <span className="inline-flex items-center gap-1 rounded-xs border border-purple-200 bg-purple-50 px-1.5 py-0.5 text-[10px] font-bold text-purple-800">
                  <Truck className="size-2.5 text-purple-600" />
                  {order.shipment.provider}
                </span>
                <span className="text-[10px] font-medium text-neutral-500">
                  {order.shipment.status}
                </span>
              </div>
              {order.shipment.trackingNumber && (
                <div className="flex items-center gap-1 font-mono text-[11px] text-neutral-700">
                  <span>{order.shipment.trackingNumber}</span>
                  <button
                    type="button"
                    onClick={() => onCopyTracking(order.shipment!.trackingNumber!)}
                    className="rounded p-0.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-800"
                    title="Copy tracking code"
                  >
                    {copiedTracking === order.shipment.trackingNumber ? (
                      <Check className="size-2.5 text-emerald-600" />
                    ) : (
                      <Copy className="size-2.5" />
                    )}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <span className="text-xs text-neutral-400">—</span>
          )}
        </TableCell>
      )}

      {/* Order Status */}
      {visibleColumns.status && (
        <TableCell className="text-center whitespace-nowrap">
          {getOrderStatusBadge(order.status)}
        </TableCell>
      )}

      {/* Quick Action & View link */}
      <TableCell className="text-right whitespace-nowrap">
        <div className="flex items-center justify-end gap-1.5">
          {/* 1-Click Status Quick Actions */}
          {order.status === "PENDING" && (
            <button
              type="button"
              disabled={updatingOrderId === order.id}
              onClick={() => onQuickStatus(order.id, "CONFIRMED")}
              className="inline-flex h-7 items-center gap-1 rounded-sm bg-emerald-600 px-2 text-xs font-semibold text-white shadow-2xs transition-colors hover:bg-emerald-700 disabled:opacity-50"
              title="Confirm order after customer verification"
            >
              <CheckCircle2 className="size-3" />
              <span>{updatingOrderId === order.id ? "..." : "Confirm"}</span>
            </button>
          )}

          {order.status === "CONFIRMED" && (
            <button
              type="button"
              disabled={updatingOrderId === order.id}
              onClick={() => onQuickStatus(order.id, "PROCESSING")}
              className="inline-flex h-7 items-center gap-1 rounded-sm border border-neutral-300 bg-white px-2 text-xs font-semibold text-neutral-800 shadow-2xs transition-colors hover:bg-neutral-50 disabled:opacity-50"
              title="Mark order as Processing / Package"
            >
              <Package className="size-3 text-indigo-600" />
              <span>{updatingOrderId === order.id ? "..." : "Pack"}</span>
            </button>
          )}

          <Link
            href={`/admin/orders/${order.id}`}
            className="inline-flex h-7 items-center gap-1 rounded-sm border border-[#101114]/20 bg-white px-2.5 text-xs font-semibold text-[#101114] shadow-2xs transition-colors hover:bg-[#F3F0E8]"
          >
            <Eye className="size-3" />
            <span>View</span>
          </Link>
        </div>
      </TableCell>
    </TableRow>
  );
}
