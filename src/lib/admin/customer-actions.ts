"use server";

import { requireRole } from "@/lib/auth/authorization";
import {
  getAdminCustomers,
  type CustomerSegment,
  type CustomerSortBy,
} from "@/lib/admin/customer-queries";

export async function loadMoreAdminCustomersAction(options: {
  search?: string;
  segment?: CustomerSegment;
  sortBy?: CustomerSortBy;
  page: number;
  pageSize?: number;
}) {
  await requireRole("ADMIN");
  return getAdminCustomers(options);
}
