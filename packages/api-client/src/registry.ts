import { z } from "zod";
import {
  CommonFilter,
  ExchangeParams,
  SearchParams,
} from "./schemas.js";

export type EndpointCategory =
  | "Bookings"
  | "Enquiries"
  | "Customers"
  | "Suppliers"
  | "Tasks"
  | "Communications"
  | "Accounting"
  | "Payment"
  | "Administration"
  | "B2B"
  | "Group Booking";

export interface EndpointDef {
  /** Stable id, dot-namespaced, e.g. "bookings.search". */
  id: string;
  category: EndpointCategory;
  /** Human label for UIs. */
  label: string;
  method: "GET" | "POST";
  /** API path (no base URL). */
  path: string;
  description: string;
  /** Validates + shapes the params object. */
  input: z.ZodTypeAny;
  /**
   * Where validated params go. Defaults: GET→query, POST→body.
   * "split" = paging/sort/quote in the query, `filter` object in the POST body
   * (used by search endpoints).
   */
  paramTarget?: "query" | "body" | "split";
}

const empty = z.object({}).passthrough();

/**
 * Every Moonstride endpoint used by the dashboard, in one place.
 * Both the MCP server and the dashboard consume this list.
 */
export const ENDPOINTS: readonly EndpointDef[] = [
  // ── CRM: Bookings (v2) ────────────────────────────────────────────────
  {
    id: "bookings.search",
    category: "Bookings",
    label: "Search bookings",
    method: "POST",
    paramTarget: "split",
    path: "/api/crm/v2/bookings/search",
    description:
      "Search bookings with filters (date range, user, sell channel, status). Supports pagination (page, limit) and sort.",
    input: SearchParams,
  },
  {
    id: "bookings.status",
    category: "Bookings",
    label: "Booking statuses",
    method: "GET",
    path: "/api/crm/v2/bookings/bookingstatus",
    description: "List available booking statuses. Pass quote=true for quote statuses.",
    input: z.object({ quote: z.boolean().optional() }).passthrough(),
  },
  {
    id: "bookings.count",
    category: "Bookings",
    label: "Booking count",
    method: "GET",
    path: "/api/crm/v2/bookings/count",
    description: "Count bookings matching the filter. Pass quote=true to count quotes.",
    input: CommonFilter,
  },
  {
    id: "bookings.statistics",
    category: "Bookings",
    label: "Booking statistics",
    method: "POST",
    paramTarget: "query",
    path: "/api/crm/v2/bookings/statistics",
    description: "Aggregated booking statistics over the filter. quote=true for quotes.",
    input: CommonFilter,
  },
  {
    id: "bookings.statistics.goal",
    category: "Bookings",
    label: "Booking goal",
    method: "POST",
    paramTarget: "query",
    path: "/api/crm/v2/bookings/statistics/goal",
    description: "Sales goal / target progress statistics.",
    input: CommonFilter,
  },
  {
    id: "bookings.metric.totalSales",
    category: "Bookings",
    label: "Total sales",
    method: "GET",
    path: "/api/crm/v2/bookings/metric/totalsales",
    description: "Total sales metric for the filter (date range, user, status, sell channel).",
    input: CommonFilter,
  },
  {
    id: "bookings.metric.totalProfit",
    category: "Bookings",
    label: "Total profit",
    method: "GET",
    path: "/api/crm/v2/bookings/metric/totalprofit",
    description: "Total profit metric for the filter (date range, user, status, sell channel).",
    input: CommonFilter,
  },
  {
    id: "bookings.reports.paymentInstallments",
    category: "Bookings",
    label: "Payment installments report",
    method: "POST",
    paramTarget: "query",
    path: "/api/crm/v2/bookings/reports/paymentinstallments",
    description: "Report of upcoming/overdue customer payment installments.",
    input: SearchParams,
  },
  {
    id: "bookings.ticketingDeadline.search",
    category: "Bookings",
    label: "Ticketing deadlines",
    method: "POST",
    paramTarget: "split",
    path: "/api/crm/v2/bookings/ticketingdeadline/search",
    description: "Search bookings by ticketing deadline.",
    input: SearchParams,
  },

  // ── CRM: Enquiries (v1) ───────────────────────────────────────────────
  {
    id: "enquiries.search",
    category: "Enquiries",
    label: "Search enquiries",
    method: "POST",
    paramTarget: "split",
    path: "/api/crm/v1/enquiries/search",
    description: "Search enquiries with filters and pagination.",
    input: SearchParams,
  },
  {
    id: "enquiries.count",
    category: "Enquiries",
    label: "Enquiry count",
    method: "GET",
    path: "/api/crm/v1/enquiries/count",
    description: "Count enquiries matching the filter.",
    input: CommonFilter,
  },
  {
    id: "enquiries.statistics",
    category: "Enquiries",
    label: "Enquiry statistics",
    method: "POST",
    paramTarget: "query",
    path: "/api/crm/v1/enquiries/statistics",
    description: "Aggregated enquiry statistics over the filter.",
    input: CommonFilter,
  },
  {
    id: "enquiries.pipelineStages",
    category: "Enquiries",
    label: "Pipeline stages",
    method: "GET",
    path: "/api/crm/v1/enquiries/pipelinestages",
    description: "List enquiry pipeline stages (for funnel views).",
    input: empty,
  },
  {
    id: "enquiries.status",
    category: "Enquiries",
    label: "Enquiry statuses",
    method: "GET",
    path: "/api/crm/v1/enquiries/enquirystatus",
    description: "List available enquiry statuses.",
    input: empty,
  },

  // ── CRM: Customers (v1) ───────────────────────────────────────────────
  {
    id: "customers.search",
    category: "Customers",
    label: "Search customers",
    method: "POST",
    paramTarget: "split",
    path: "/api/crm/v1/customers/search",
    description: "Search customers with filters and pagination.",
    input: SearchParams,
  },
  {
    id: "customers.count",
    category: "Customers",
    label: "Customer count",
    method: "GET",
    path: "/api/crm/v1/customers/count",
    description: "Count customers matching the filter.",
    input: CommonFilter,
  },

  // ── CRM: Suppliers (v1) ───────────────────────────────────────────────
  {
    id: "suppliers.list",
    category: "Suppliers",
    label: "List suppliers",
    method: "GET",
    path: "/api/crm/v1/suppliers",
    description: "List suppliers.",
    input: SearchParams,
  },

  // ── CRM: Tasks (v1) ───────────────────────────────────────────────────
  {
    id: "tasks.enums",
    category: "Tasks",
    label: "Task enums",
    method: "GET",
    path: "/api/crm/v1/tasks/enums",
    description: "Reference enums for tasks (types, priorities, statuses).",
    input: empty,
  },
  {
    id: "tasks.search",
    category: "Tasks",
    label: "Search tasks",
    method: "POST",
    paramTarget: "split",
    path: "/api/crm/v1/tasks/search",
    description: "Search tasks with filters and pagination.",
    input: SearchParams,
  },

  // ── Communications (v1) ───────────────────────────────────────────────
  {
    id: "communications.messages.search",
    category: "Communications",
    label: "Search messages",
    method: "POST",
    paramTarget: "split",
    path: "/api/communications/v1/messages/search",
    description: "Search communication messages.",
    input: SearchParams,
  },
  {
    id: "communications.emailNotifications.search",
    category: "Communications",
    label: "Search email notifications",
    method: "POST",
    paramTarget: "split",
    path: "/api/communications/v1/emailnotification/search",
    description: "Search email notifications.",
    input: SearchParams,
  },

  // ── Accounting (v1) ───────────────────────────────────────────────────
  {
    id: "accounting.reports.supplierPaymentsDue",
    category: "Accounting",
    label: "Supplier payments due",
    method: "POST",
    paramTarget: "query",
    path: "/api/accounting/v1/accounts/reports/supplierpaymentsdue",
    description: "Report of supplier payments that are due.",
    input: SearchParams,
  },

  // ── Payment (v1) ──────────────────────────────────────────────────────
  {
    id: "payment.currencies",
    category: "Payment",
    label: "Currencies",
    method: "GET",
    path: "/api/payment/v1/currencies",
    description: "List supported currencies.",
    input: empty,
  },
  {
    id: "payment.currencies.exchange",
    category: "Payment",
    label: "Currency exchange",
    method: "GET",
    path: "/api/payment/v1/currencies/exchange",
    description: "Get exchange rate / converted amount between two currencies.",
    input: ExchangeParams,
  },

  // ── Administration (v1) ───────────────────────────────────────────────
  {
    id: "admin.users",
    category: "Administration",
    label: "Users",
    method: "GET",
    path: "/api/administration/v1/users",
    description: "List Moonstride users (for user filters and assignment).",
    input: SearchParams,
  },

  // ── B2B (v1) ──────────────────────────────────────────────────────────
  {
    id: "b2b.sellChannels",
    category: "B2B",
    label: "Sell channels",
    method: "GET",
    path: "/api/b2b/v1/sellchannels",
    description: "List B2B sell channels (for sellchannelid filters).",
    input: empty,
  },

  // ── Group Booking (legacy 1.5) ────────────────────────────────────────
  {
    id: "groupBooking.statistics",
    category: "Group Booking",
    label: "Group booking statistics",
    method: "POST",
    paramTarget: "query",
    path: "/groupbooking/1.5/api/statistics",
    description: "Legacy group-booking statistics.",
    input: CommonFilter,
  },
] as const;

const byId = new Map(ENDPOINTS.map((e) => [e.id, e]));

export function getEndpoint(id: string): EndpointDef | undefined {
  return byId.get(id);
}

export function listEndpoints(): readonly EndpointDef[] {
  return ENDPOINTS;
}

/** Convert an endpoint id to a safe MCP tool name, e.g. moonstride_bookings_search. */
export function toToolName(id: string): string {
  return `moonstride_${id.replace(/\./g, "_")}`;
}

/** Inverse of {@link toToolName}. */
export function fromToolName(toolName: string): string | undefined {
  if (!toolName.startsWith("moonstride_")) return undefined;
  const id = toolName.slice("moonstride_".length).replace(/_/g, ".");
  return byId.has(id) ? id : undefined;
}
