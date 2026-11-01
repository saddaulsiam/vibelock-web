"use client";

import * as React from "react";
import Link from "next/link";
import { CheckCircle2, Eye, MessageCircle, Package, Phone, Truck } from "lucide-react";
import type { OrderStatus } from "@prisma/client";
import type { AdminOrderItem } from "@/lib/admin/orders/order-queries";
import { getOrderStatusBadge } from "@/components/admin/orders/admin-order-badges";
import { formatBdt, formatDate, formatWhatsAppUrl } from "./order-table-utils";

export interface AdminOrdersMobileCardProps {
  order: AdminOrderItem;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
  updatingOrderId: string | null;
  onQuickStatus: (orderId: string, nextStatus: OrderStatus) => void;
}

export function AdminOrdersMobileCard({
  order,
  isSelected,
  onToggleSelect,
  updatingOrderId,
  onQuickStatus,
}: AdminOrdersMobileCardProps) {
  return (
    <div
      className={`rounded-xl border border-neutral-200/90 bg-white p-4 shadow-2xs transition-colors ${
        isSelected ? "border-amber-300 bg-amber-50/40" : ""
      }`}
    >
      {/* Header: Checkbox, Order #, Channel & Status */}
      <div className="flex items-start justify-between gap-2 border-b border-neutral-100 pb-2.5">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onToggleSelect(order.id)}
            aria-label={`Select order ${order.orderNumber}`}
            className="size-4 rounded-xs border-neutral-300 accent-[#101114] focus:ring-1 focus:ring-[#00D9FF]"
          />
          <div>
            <div className="flex items-center gap-1.5">
              <Link
                href={`/admin/orders/${order.id}`}
                className="font-mono text-xs font-bold text-[#101114] hover:text-[#00D9FF] hover:underline"
              >
                #{order.orderNumber}
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
            <div className="text-[10px] text-neutral-500">
              {formatDate(order.createdAt)}
            </div>
          </div>
        </div>
        <div>{getOrderStatusBadge(order.status)}</div>
      </div>

      {/* Customer Info & Direct Quick Contacts */}
      <div className="mt-2.5 flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-bold text-neutral-900">
            {order.customerName || "Guest Customer"}
          </p>
          <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-neutral-500">
            {order.shippingCity && (
              <span className="py-0.2 rounded-xs bg-neutral-100 px-1 text-[10px] font-medium text-neutral-600">
                {order.shippingCity}
              </span>
            )}
            <span className="font-mono">{order.customerPhone}</span>
          </div>
        </div>

        {order.customerPhone && (
          <div className="flex shrink-0 items-center gap-1">
            <a
              href={`tel:${order.customerPhone}`}
              className="flex size-7 items-center justify-center rounded-lg border border-neutral-200 bg-neutral-50 text-neutral-700 hover:bg-neutral-100"
              title="Call customer"
            >
              <Phone className="size-3" />
            </a>
            <a
              href={formatWhatsAppUrl(
                order.customerPhone,
                order.orderNumber,
                order.customerName
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="flex size-7 items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
              title="WhatsApp chat"
            >
              <MessageCircle className="size-3" />
            </a>
          </div>
        )}
      </div>

      {/* Items & Payment Strip */}
      <div className="mt-3 flex items-center justify-between rounded-lg bg-neutral-50/80 p-2 text-xs">
        <div>
          <div className="flex items-center gap-1">
            <Package className="size-3 text-neutral-500" />
            <span className="font-semibold text-neutral-800">
              {order.itemCount} {order.itemCount === 1 ? "item" : "items"}
            </span>
          </div>
          {order.itemsSummary ? (
            <p className="mt-0.5 max-w-[170px] truncate text-[10px] text-neutral-500">
              {order.itemsSummary}
            </p>
          ) : null}
        </div>

        <div className="text-right">
          <div className="font-bold text-[#101114]">{formatBdt(order.total)}</div>
          <div className="flex items-center justify-end gap-1 text-[10px]">
            <span className="font-semibold text-neutral-600">{order.paymentMethod}</span>
            <span>&middot;</span>
            <span
              className={
                order.paymentStatus === "SUCCESS"
                  ? "font-bold text-emerald-700"
                  : "text-amber-700"
              }
            >
              {order.paymentStatus}
            </span>
          </div>
        </div>
      </div>

      {/* Courier info (if dispatched) */}
      {order.shipment ? (
        <div className="mt-2 flex items-center justify-between text-[11px] text-neutral-600">
          <span className="inline-flex items-center gap-1 font-semibold text-purple-700">
            <Truck className="size-3" />
            {order.shipment.provider}
          </span>
          {order.shipment.trackingNumber && (
            <span className="font-mono text-[10px] text-neutral-500">
              Trk: {order.shipment.trackingNumber}
            </span>
          )}
        </div>
      ) : null}

      {/* Actions Footer */}
      <div className="mt-3 flex items-center justify-end gap-2 border-t border-neutral-100 pt-2.5">
        {order.status === "PENDING" && (
          <button
            type="button"
            disabled={updatingOrderId === order.id}
            onClick={() => onQuickStatus(order.id, "CONFIRMED")}
            className="inline-flex h-8 items-center gap-1 rounded-lg bg-emerald-600 px-3 text-xs font-semibold text-white shadow-2xs hover:bg-emerald-700 disabled:opacity-50"
          >
            <CheckCircle2 className="size-3.5" />
            <span>{updatingOrderId === order.id ? "..." : "Confirm"}</span>
          </button>
        )}

        {order.status === "CONFIRMED" && (
          <button
            type="button"
            disabled={updatingOrderId === order.id}
            onClick={() => onQuickStatus(order.id, "PROCESSING")}
            className="inline-flex h-8 items-center gap-1 rounded-lg border border-neutral-300 bg-white px-3 text-xs font-semibold text-neutral-800 shadow-2xs hover:bg-neutral-50 disabled:opacity-50"
          >
            <Package className="size-3.5 text-indigo-600" />
            <span>{updatingOrderId === order.id ? "..." : "Pack"}</span>
          </button>
        )}

        <Link
          href={`/admin/orders/${order.id}`}
          className="inline-flex h-8 items-center gap-1 rounded-lg border border-[#101114]/20 bg-white px-3 text-xs font-semibold text-[#101114] shadow-2xs hover:bg-[#F3F0E8]"
        >
          <Eye className="size-3.5" />
          <span>View Details</span>
        </Link>
      </div>
    </div>
  );
}

