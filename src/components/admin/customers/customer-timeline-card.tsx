"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Clock,
  ShoppingBag,
  Star,
  FileText,
  Lock,
  Unlock,
  Key,
  UserCheck,
  ShieldAlert,
  ShieldCheck,
  UserCog,
  ChevronDown,
  ChevronUp,
  ExternalLink,
} from "lucide-react";
import {
  AdminCustomerTimelineEvent,
  AdminCustomerTimelineEventType,
} from "@/lib/admin/customer-queries";

interface CustomerTimelineCardProps {
  timeline: AdminCustomerTimelineEvent[];
}

type TimelineFilter = "ALL" | "ORDERS" | "NOTES" | "REVIEWS" | "SECURITY";

export function CustomerTimelineCard({ timeline }: CustomerTimelineCardProps) {
  const [filter, setFilter] = useState<TimelineFilter>("ALL");
  const [isExpanded, setIsExpanded] = useState(false);

  const getFilteredEvents = () => {
    switch (filter) {
      case "ORDERS":
        return timeline.filter((e) => e.type === "ORDER_PLACED");
      case "NOTES":
        return timeline.filter((e) => e.type === "STAFF_NOTE");
      case "REVIEWS":
        return timeline.filter((e) => e.type === "REVIEW_SUBMITTED");
      case "SECURITY":
        return timeline.filter(
          (e) =>
            e.type === "ACCOUNT_SUSPENDED" ||
            e.type === "ACCOUNT_ACTIVATED" ||
            e.type === "COD_RESTRICTED" ||
            e.type === "COD_ALLOWED" ||
            e.type === "PASSWORD_RESET_SENT" ||
            e.type === "PROFILE_UPDATED"
        );
      case "ALL":
      default:
        return timeline;
    }
  };

  const filteredEvents = getFilteredEvents();
  const visibleEvents = isExpanded ? filteredEvents : filteredEvents.slice(0, 6);

  const getEventIcon = (type: AdminCustomerTimelineEventType) => {
    switch (type) {
      case "ACCOUNT_CREATED":
        return {
          icon: <UserCheck className="size-3.5" />,
          bg: "bg-blue-100 text-blue-700 border-blue-200",
        };
      case "ORDER_PLACED":
        return {
          icon: <ShoppingBag className="size-3.5" />,
          bg: "bg-emerald-100 text-emerald-700 border-emerald-200",
        };
      case "REVIEW_SUBMITTED":
        return {
          icon: <Star className="size-3.5 fill-amber-400 text-amber-500" />,
          bg: "bg-amber-100 text-amber-700 border-amber-200",
        };
      case "STAFF_NOTE":
        return {
          icon: <FileText className="size-3.5" />,
          bg: "bg-neutral-100 text-neutral-700 border-neutral-300",
        };
      case "COD_RESTRICTED":
        return {
          icon: <ShieldAlert className="size-3.5" />,
          bg: "bg-red-100 text-red-700 border-red-200",
        };
      case "COD_ALLOWED":
        return {
          icon: <ShieldCheck className="size-3.5" />,
          bg: "bg-emerald-100 text-emerald-700 border-emerald-200",
        };
      case "ACCOUNT_SUSPENDED":
        return {
          icon: <Lock className="size-3.5" />,
          bg: "bg-amber-100 text-amber-800 border-amber-300",
        };
      case "ACCOUNT_ACTIVATED":
        return {
          icon: <Unlock className="size-3.5" />,
          bg: "bg-emerald-100 text-emerald-700 border-emerald-200",
        };
      case "PASSWORD_RESET_SENT":
        return {
          icon: <Key className="size-3.5" />,
          bg: "bg-purple-100 text-purple-700 border-purple-200",
        };
      case "PROFILE_UPDATED":
        return {
          icon: <UserCog className="size-3.5" />,
          bg: "bg-indigo-100 text-indigo-700 border-indigo-200",
        };
      default:
        return {
          icon: <Clock className="size-3.5" />,
          bg: "bg-neutral-100 text-neutral-600 border-neutral-200",
        };
    }
  };

  const getBadgeStyle = (badgeVariant?: string) => {
    switch (badgeVariant) {
      case "success":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "destructive":
        return "bg-red-50 text-red-700 border-red-200";
      case "warning":
        return "bg-amber-50 text-amber-800 border-amber-200";
      case "purple":
        return "bg-purple-50 text-purple-700 border-purple-200";
      case "info":
        return "bg-blue-50 text-blue-700 border-blue-200";
      default:
        return "bg-neutral-100 text-neutral-700 border-neutral-200";
    }
  };

  const formatEventDate = (date: Date) => {
    return new Date(date).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const ordersCount = timeline.filter((e) => e.type === "ORDER_PLACED").length;
  const notesCount = timeline.filter((e) => e.type === "STAFF_NOTE").length;
  const reviewsCount = timeline.filter((e) => e.type === "REVIEW_SUBMITTED").length;
  const securityCount = timeline.filter(
    (e) =>
      e.type === "ACCOUNT_SUSPENDED" ||
      e.type === "ACCOUNT_ACTIVATED" ||
      e.type === "COD_RESTRICTED" ||
      e.type === "COD_ALLOWED" ||
      e.type === "PASSWORD_RESET_SENT" ||
      e.type === "PROFILE_UPDATED"
  ).length;

  return (
    <div className="rounded-xl border border-neutral-200/90 bg-white p-5 shadow-2xs space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-100 pb-3">
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-lg bg-neutral-100 text-neutral-700">
            <Clock className="size-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-neutral-900">
              Unified 360° Activity Timeline
            </h2>
            <p className="text-[11px] text-neutral-400">
              Chronological journey: registration, orders, reviews, staff notes, and audit events
            </p>
          </div>
        </div>

        <span className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-semibold text-neutral-600">
          Total {timeline.length} {timeline.length === 1 ? "Event" : "Events"}
        </span>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 text-xs">
        <button
          onClick={() => setFilter("ALL")}
          className={`rounded-lg px-2.5 py-1 font-semibold transition ${
            filter === "ALL"
              ? "bg-[#101114] text-white shadow-xs"
              : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200/70"
          }`}
        >
          All ({timeline.length})
        </button>
        <button
          onClick={() => setFilter("ORDERS")}
          className={`rounded-lg px-2.5 py-1 font-semibold transition ${
            filter === "ORDERS"
              ? "bg-[#101114] text-white shadow-xs"
              : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200/70"
          }`}
        >
          Orders ({ordersCount})
        </button>
        <button
          onClick={() => setFilter("NOTES")}
          className={`rounded-lg px-2.5 py-1 font-semibold transition ${
            filter === "NOTES"
              ? "bg-[#101114] text-white shadow-xs"
              : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200/70"
          }`}
        >
          Staff Notes ({notesCount})
        </button>
        <button
          onClick={() => setFilter("REVIEWS")}
          className={`rounded-lg px-2.5 py-1 font-semibold transition ${
            filter === "REVIEWS"
              ? "bg-[#101114] text-white shadow-xs"
              : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200/70"
          }`}
        >
          Reviews ({reviewsCount})
        </button>
        <button
          onClick={() => setFilter("SECURITY")}
          className={`rounded-lg px-2.5 py-1 font-semibold transition ${
            filter === "SECURITY"
              ? "bg-[#101114] text-white shadow-xs"
              : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200/70"
          }`}
        >
          Security &amp; Account ({securityCount})
        </button>
      </div>

      {/* Timeline Stream */}
      {filteredEvents.length === 0 ? (
        <div className="py-8 text-center text-xs text-neutral-400 italic">
          No activity records found in this category.
        </div>
      ) : (
        <div className="relative pl-6 space-y-6 before:absolute before:bottom-2 before:left-2.5 before:top-2 before:w-0.5 before:bg-neutral-200">
          {visibleEvents.map((event) => {
            const { icon, bg } = getEventIcon(event.type);
            return (
              <div key={event.id} className="relative group">
                {/* Node icon */}
                <div
                  className={`absolute -left-6 top-0 flex size-5.5 -translate-x-1/2 items-center justify-center rounded-full border shadow-2xs ${bg}`}
                >
                  {icon}
                </div>

                {/* Content Box */}
                <div className="rounded-xl border border-neutral-100 bg-neutral-50/50 p-3 text-xs space-y-1 hover:border-neutral-200 hover:bg-neutral-50 transition">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 font-bold text-neutral-900">
                      <span>{event.title}</span>
                      {event.badge && (
                        <span
                          className={`rounded-full px-2 py-0.2 text-[10px] font-bold border ${getBadgeStyle(
                            event.badgeVariant
                          )}`}
                        >
                          {event.badge}
                        </span>
                      )}
                    </div>

                    <span className="text-[11px] font-mono text-neutral-400">
                      {formatEventDate(event.timestamp)}
                    </span>
                  </div>

                  {event.description && (
                    <p className="text-neutral-600 leading-relaxed text-[11px]">
                      {event.description}
                    </p>
                  )}

                  <div className="flex items-center justify-between pt-1 text-[11px]">
                    {event.actorName ? (
                      <span className="text-neutral-400 italic">
                        By {event.actorName}
                      </span>
                    ) : (
                      <span />
                    )}

                    {event.link && (
                      <Link
                        href={event.link}
                        target={event.link.startsWith("/products") ? "_blank" : undefined}
                        className="inline-flex items-center gap-1 font-semibold text-neutral-800 hover:text-black transition"
                      >
                        <span>{event.linkLabel || "View Details"}</span>
                        <ExternalLink className="size-3 text-neutral-400" />
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Show More / Show Less Toggle */}
      {filteredEvents.length > 6 && (
        <div className="pt-2 text-center border-t border-neutral-100">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="inline-flex items-center gap-1 text-xs font-bold text-neutral-700 hover:text-neutral-900 transition py-1 px-3 rounded-lg hover:bg-neutral-100"
          >
            {isExpanded ? (
              <>
                <span>Show Fewer</span>
                <ChevronUp className="size-3.5" />
              </>
            ) : (
              <>
                <span>Show {filteredEvents.length - 6} More Events</span>
                <ChevronDown className="size-3.5" />
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
