import { NextResponse } from "next/server";
import { MoonstrideApiError, getEndpoint } from "@moonstride/api-client";
import { getClient } from "@/lib/server/client";

export const dynamic = "force-dynamic";

/**
 * Generic proxy: GET /api/moonstride/<endpointId>?<filters>
 * Validates the endpoint id, forwards query params to the Moonstride client,
 * and returns the JSON result. Credentials stay server-side.
 */
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await context.params;
  const endpoint = getEndpoint(id);
  if (!endpoint) {
    return NextResponse.json(
      { error: `Unknown endpoint: ${id}` },
      { status: 404 },
    );
  }

  const url = new URL(request.url);
  const params: Record<string, unknown> = {};
  for (const [key, value] of url.searchParams.entries()) {
    // Numeric coercion for known numeric params; arrays via comma.
    if (key === "page" || key === "limit") params[key] = Number(value);
    else if (key === "quote") params[key] = value === "true";
    else if (value.includes(",")) params[key] = value.split(",");
    else params[key] = value;
  }

  try {
    const data = await getClient().call(endpoint.id, params);
    return NextResponse.json({ data });
  } catch (err) {
    const status = err instanceof MoonstrideApiError ? err.status || 502 : 500;
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: status || 502 });
  }
}
