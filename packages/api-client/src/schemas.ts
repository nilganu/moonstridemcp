import { z } from "zod";

/** YYYY-MM-DD date string. */
const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Expected a YYYY-MM-DD date");

/** A UUID, accepted loosely (Moonstride mixes upper/lower case). */
const uuid = z.string().uuid().or(z.string().min(8));

/**
 * Filters common to most search/count/statistics/metric endpoints.
 * `.passthrough()` lets unknown params flow through untouched while schemas mature.
 */
export const CommonFilter = z
  .object({
    from: dateString.optional().describe("Start date (YYYY-MM-DD)"),
    to: dateString.optional().describe("End date (YYYY-MM-DD)"),
    userid: uuid.optional().describe("Filter by Moonstride user id"),
    sellchannelid: uuid.optional().describe("Filter by sell channel id"),
    status: z
      .union([z.string(), z.array(z.string())])
      .optional()
      .describe('Status code(s), e.g. "COMP,CONF" or ["COMP","CONF"]'),
    quote: z
      .boolean()
      .optional()
      .describe("Operate on quotes instead of confirmed bookings"),
  })
  .passthrough();

export const Pagination = z
  .object({
    // coerce so string query values ("2") parse to numbers.
    page: z.coerce.number().int().positive().optional().describe("1-based page number"),
    limit: z.coerce
      .number()
      .int()
      .positive()
      .max(500)
      .optional()
      .describe("Max records to return"),
    sort: z.string().optional().describe("Sort expression, e.g. 'referencenumber'"),
    order: z.enum(["asc", "desc"]).optional().describe("Sort direction"),
    search: z.string().optional().describe("Free-text search term"),
  })
  .passthrough();

/**
 * Body filter criteria for POST search endpoints. Moonstride reads filters from
 * the request BODY as PascalCase objects; date ranges use `{ From, To }`.
 * Verified fields for bookings: TravelStartDate, TravelEndDate, BookingDate,
 * DepartureDate, BalanceDueDate (each `{ From, To }`).
 */
export const SearchFilter = z
  .record(z.any())
  .describe(
    'PascalCase body filter. Date ranges as { "TravelStartDate": { "From": "YYYY-MM-DD", "To": "YYYY-MM-DD" } }. ' +
      "Booking date fields: TravelStartDate, TravelEndDate, BookingDate, DepartureDate.",
  );

/** Search-style endpoints accept the common filter + pagination + a body filter. */
export const SearchParams = CommonFilter.merge(Pagination).extend({
  filter: SearchFilter.optional(),
});

/** Currency-exchange specific params. */
export const ExchangeParams = z
  .object({
    from: z.string().min(3).describe("Source currency code, e.g. GBP"),
    to: z.string().min(3).describe("Target currency code, e.g. USD"),
    amount: z.coerce.number().optional().describe("Amount to convert (default 1)"),
  })
  .passthrough();

export type CommonFilterInput = z.input<typeof CommonFilter>;
export type SearchParamsInput = z.input<typeof SearchParams>;
