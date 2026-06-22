import OpenAI from "openai";
import { NextResponse } from "next/server";
import {
  fromToolName,
  listEndpoints,
  toToolName,
} from "@moonstride/api-client";
import { getClient } from "@/lib/server/client";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MODEL = process.env.OPENAI_MODEL ?? "gpt-5.4-mini";
const MAX_TOOL_TURNS = 6;

/** Shared JSON schema for every Moonstride tool (all params optional). */
const TOOL_INPUT_SCHEMA = {
  type: "object" as const,
  properties: {
    from: { type: "string", description: "Start date YYYY-MM-DD for count/metric/statistics (or source currency code for exchange)" },
    to: { type: "string", description: "End date YYYY-MM-DD for count/metric/statistics (or target currency code for exchange)" },
    userid: { type: "string", description: "Filter by Moonstride user id" },
    sellchannelid: { type: "string", description: "Filter by sell channel id" },
    status: { type: "string", description: "Status code(s), CSV e.g. COMP,CONF" },
    quote: { type: "boolean", description: "Operate on quotes instead of bookings" },
    search: { type: "string", description: "Free-text search term" },
    sort: { type: "string", description: "Sort field for search, e.g. travelstartdate, bookingdate, referencenumber" },
    order: { type: "string", enum: ["asc", "desc"], description: "Sort direction for search" },
    limit: { type: "integer", description: "Max records to return (use 200 for date-windowed searches)" },
    amount: { type: "number", description: "Amount (currency exchange)" },
    filter: {
      type: "object",
      additionalProperties: true,
      description:
        'SEARCH ONLY — body filter criteria in PascalCase. Date ranges are { "Field": { "From": "YYYY-MM-DD", "To": "YYYY-MM-DD" } }. ' +
        "Booking date fields: TravelStartDate (departure/travelling), TravelEndDate, BookingDate (when booked/created), DepartureDate, BalanceDueDate. " +
        'Example for bookings departing this month: { "TravelStartDate": { "From": "2026-05-29", "To": "2026-06-29" } }.',
    },
  },
  additionalProperties: true,
};

const TOOLS: OpenAI.Chat.Completions.ChatCompletionTool[] = listEndpoints().map((e) => ({
  type: "function",
  function: {
    name: toToolName(e.id),
    description: `[${e.category}] ${e.description}`,
    parameters: TOOL_INPUT_SCHEMA,
  },
}));

const SYSTEM = `You are the Moonstride assistant, embedded in a travel CRM dashboard. You can answer the same questions the dashboard widgets answer.
Today's date is ${new Date().toISOString().slice(0, 10)}.

CAPABILITIES (call the matching tool):
- Sales & profit: moonstride_bookings_metric_totalSales / _totalProfit (from/to date range).
- Counts: moonstride_bookings_count, moonstride_enquiries_count, moonstride_customers_count.
- Statistics & targets: moonstride_bookings_statistics, _statistics_goal, moonstride_enquiries_statistics.
- Lists/search: moonstride_bookings_search, _enquiries_search, _tasks_search, _customers_search.
- Pipeline: moonstride_enquiries_pipelineStages. Reference: statuses, currencies, users, sell channels (moonstride_get_reference or the *_status/_currencies/_sellChannels tools).
- Reports: moonstride_bookings_reports_paymentInstallments, moonstride_accounting_reports_supplierPaymentsDue, moonstride_bookings_ticketingDeadline_search.

HOW FILTERS WORK:
- count / metric / statistics: pass date range via "from" and "to" (YYYY-MM-DD) and optional "status" (CSV like "COMP,CONF"), "quote".
- search endpoints: pass structured criteria in "filter" (PascalCase). Date ranges are { "Field": { "From": "YYYY-MM-DD", "To": "YYYY-MM-DD" } }.
  * "departing / travelling in the next month" → filter { "TravelStartDate": { "From": today, "To": +30d } }, sort "travelstartdate" asc, limit 200.
  * "booked / created last week" → filter { "BookingDate": { "From": ..., "To": ... } }.
  * Do NOT put search date ranges in "from"/"to" — search ignores those; they only work on count/metric/statistics.
- Always compute concrete dates from "today" above. State which date field and range you used.

COUNTING FROM SEARCH:
- Search returns a plain array with NO total field. To COUNT matching records, set "limit": 500 and report the returned array length as the total.
- "List the soonest N" still requires limit 500 (so the count is right) — then display only the first N rows. Never lower the limit just because the user wants to see N rows.

PRESENTING DATA (important):
- LISTS of records (bookings, enquiries, tasks, supplier payments due, payment installments, users, currencies, etc.) are shown to the user automatically in ONE paginated TABLE by the UI. For these: give a one-sentence summary with the total count (and the filter/date used). Do NOT list the rows in prose and do NOT build your own table — the UI already shows it. If 0 records, say "No matching records found."
- SINGLE AGGREGATES (totals/metrics, counts, statistics, exchange rate): put the figures DIRECTLY in your reply as ONE compact Markdown table, right-aligning numbers.
- NEVER write "see the table below" / "detail data in the below table". Either the UI shows the list table, or you include the aggregate data yourself — never refer to a table that isn't there.
- If a tool returns an authorization error, say the user's credentials may lack access to that component.`;

interface ChatBody {
  messages: Array<{ role: "user" | "assistant"; content: string }>;
}

export interface ChatTable {
  columns: string[];
  rows: Array<Record<string, string | number>>;
  total: number;
  source: string;
}

/** Preferred column order when present (covers bookings/enquiries/tasks/reports). */
const PREFERRED_COLS = [
  "ReferenceNumber", "BookingReference", "Title", "Customer", "Supplier", "Service",
  "Category", "Agent", "BookingStatus", "Status", "PipelineStage",
  "TravelStartDate", "DepartureDate", "TravelEndDate",
  "DueAmount", "TotalAmount", "Amount", "AmountDue", "PaidAmount", "Currency",
  "DueDate", "BalanceDueDate", "AssignTo", "AssignedTo",
  "BookingDateTime", "BookingCurrency", "Name", "Email", "Subject",
];

const MAX_TABLE_COLS = 10;

/** Find an array-of-objects in a value (handles bare arrays and {records:[...]} shapes). */
function extractArray(data: unknown): Record<string, unknown>[] | null {
  if (Array.isArray(data)) return data as Record<string, unknown>[];
  if (data && typeof data === "object") {
    for (const v of Object.values(data)) {
      if (Array.isArray(v) && v.some((x) => x && typeof x === "object")) {
        return v as Record<string, unknown>[];
      }
    }
  }
  return null;
}

/** Flatten a record to scalar cells, picking Name/Code/Title from nested objects. */
function flattenRow(r: Record<string, unknown>): Record<string, string | number> {
  const out: Record<string, string | number> = {};
  for (const [k, v] of Object.entries(r)) {
    if (v === null || v === undefined) continue;
    if (typeof v === "number" || typeof v === "string") out[k] = v;
    else if (typeof v === "boolean") out[k] = String(v);
    else if (!Array.isArray(v)) {
      const o = v as Record<string, unknown>;
      const nested = (key: string) =>
        (o[key] as Record<string, unknown> | undefined)?.Name;
      const pick =
        o.Name ?? o.Title ?? o.Code ?? o.Value ?? o.Symbol ?? o.FullName ??
        nested("User") ?? nested("Customer") ?? nested("Agent");
      if (typeof pick === "string" || typeof pick === "number") out[k] = pick;
      // Surface a Supplier nested inside Service (supplier-payments report).
      const supplier = (o.Supplier as Record<string, unknown> | undefined)?.Name;
      if (typeof supplier === "string" && !("Supplier" in out)) out.Supplier = supplier;
    }
  }
  return out;
}

/** Build a paginated-friendly table payload from any array (or array-bearing) result.
 *  `pinned` columns (e.g. the date field the user filtered on) are shown first. */
function buildTable(source: string, data: unknown, pinned: string[] = []): ChatTable | null {
  const arr = extractArray(data);
  if (!arr || arr.length === 0) return null;
  const flat = arr
    .filter((x) => x && typeof x === "object")
    .map((x) => flattenRow(x as Record<string, unknown>));
  if (flat.length === 0) return null;

  const present = new Set<string>();
  for (const row of flat.slice(0, 50)) for (const k of Object.keys(row)) present.add(k);
  // Lead columns first, then the pinned (filtered) date, then the rest by preference.
  const lead = ["ReferenceNumber", "BookingReference", "Title", "Customer"];
  const priority = [...lead, ...pinned, ...PREFERRED_COLS];
  const ordered: string[] = [];
  for (const c of priority) if (present.has(c) && !ordered.includes(c)) ordered.push(c);
  for (const c of present) if (!ordered.includes(c)) ordered.push(c);
  const columns = ordered.slice(0, MAX_TABLE_COLS);

  return {
    columns,
    rows: flat.slice(0, 500).map((r) => {
      const o: Record<string, string | number> = {};
      for (const c of columns) o[c] = r[c] ?? "";
      return o;
    }),
    total: arr.length,
    source,
  };
}

export async function POST(request: Request): Promise<Response> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "OPENAI_API_KEY is not set. Add it to your environment to enable the AI assistant.",
      },
      { status: 400 },
    );
  }

  const body = (await request.json()) as ChatBody;
  if (!Array.isArray(body.messages)) {
    return NextResponse.json({ error: "messages[] required" }, { status: 400 });
  }

  const openai = new OpenAI({ apiKey, baseURL: process.env.OPENAI_BASE_URL });
  const client = getClient();
  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: SYSTEM },
    ...body.messages.map((m) => ({ role: m.role, content: m.content })),
  ];
  const toolTrace: Array<{ tool: string; input: unknown; ok: boolean }> = [];
  let table: ChatTable | null = null;

  // If the configured model isn't available to this key, fall back automatically.
  let activeModel = MODEL;
  const FALLBACK_MODEL = "gpt-4o-mini";
  const createCompletion = async () => {
    try {
      return await openai.chat.completions.create({
        model: activeModel,
        messages,
        tools: TOOLS,
        tool_choice: "auto",
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (activeModel !== FALLBACK_MODEL && /model/i.test(msg)) {
        activeModel = FALLBACK_MODEL;
        return await openai.chat.completions.create({
          model: activeModel,
          messages,
          tools: TOOLS,
          tool_choice: "auto",
        });
      }
      throw e;
    }
  };

  try {
  for (let turn = 0; turn < MAX_TOOL_TURNS; turn++) {
    const completion = await createCompletion();

    const choice = completion.choices[0]?.message;
    if (!choice) {
      return NextResponse.json({ error: "No response from model" }, { status: 502 });
    }

    const toolCalls = choice.tool_calls ?? [];
    if (toolCalls.length === 0) {
      return NextResponse.json({
        reply: (choice.content ?? "").trim(),
        toolTrace,
        table,
        model: activeModel,
      });
    }

    // Record the assistant turn that requested tools, then execute each.
    messages.push(choice);
    for (const call of toolCalls) {
      if (call.type !== "function") continue;
      const endpointId = fromToolName(call.function.name);
      let ok = false;
      let content: string;
      let parsedArgs: unknown = {};
      try {
        parsedArgs = call.function.arguments
          ? JSON.parse(call.function.arguments)
          : {};
        if (!endpointId) throw new Error(`Unknown tool: ${call.function.name}`);
        // Search returns no total count; enforce a high limit floor so the
        // model counts the full matching set rather than a truncated page.
        if (endpointId.endsWith(".search")) {
          const a = parsedArgs as Record<string, unknown>;
          a.limit = Math.max(Number(a.limit) || 0, 500);
        }
        const data = await client.call(
          endpointId,
          parsedArgs as Record<string, unknown>,
        );
        // Any list/record-set result is shown to the user as ONE paginated
        // table; the model gets a compact summary (count + first rows) and is
        // told to summarise rather than repeat the rows in prose.
        // Pin whatever date field the search filtered on (e.g. TravelStartDate
        // for "departing") so it's always a visible column.
        const pinned: string[] = [];
        const filterObj = (parsedArgs as { filter?: Record<string, unknown> }).filter;
        if (filterObj && typeof filterObj === "object") {
          for (const [k, v] of Object.entries(filterObj)) {
            if (v && typeof v === "object" && ("From" in v || "To" in v)) pinned.push(k);
          }
        }
        const built = buildTable(call.function.name, data, pinned);
        if (built) {
          table = built;
          content = JSON.stringify({
            total: built.total,
            columns: built.columns,
            sample: built.rows.slice(0, 5),
            note: "These records are shown to the user in a paginated TABLE in the UI. Give a one-sentence summary with the total count — do NOT list the rows in prose.",
          });
          ok = true;
          toolTrace.push({ tool: call.function.name, input: parsedArgs, ok });
          messages.push({ role: "tool", tool_call_id: call.id, content });
          continue;
        }
        const json = JSON.stringify(data);
        content = json.length > 6000 ? `${json.slice(0, 6000)}… (truncated)` : json;
        ok = true;
      } catch (err) {
        content = `ERROR: ${(err as Error).message}`;
      }
      toolTrace.push({ tool: call.function.name, input: parsedArgs, ok });
      messages.push({
        role: "tool",
        tool_call_id: call.id,
        content,
      });
    }
  }

  return NextResponse.json({
    reply:
      "I reached the tool-call limit for this turn. Please refine your question.",
    toolTrace,
    table,
  });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Assistant error: ${message}` }, { status: 500 });
  }
}
