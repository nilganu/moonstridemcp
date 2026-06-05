# Moonstride MCP + Dashboard

A monorepo with two products over the **Moonstride** CRM/booking API:

1. **`@moonstride/mcp-server`** — a provider-agnostic [MCP](https://modelcontextprotocol.io) server (stdio + Streamable HTTP) exposing every Moonstride endpoint as a tool. Works with Claude Desktop/Code, Cursor, and any MCP host.
2. **`@moonstride/dashboard`** — a Next.js dashboard + **AI chat assistant** (OpenAI function-calling, grounded in live API calls).

Both share **`@moonstride/api-client`** — one typed client + a single **endpoint registry** that is the source of truth for both products.

```
packages/api-client   shared client, auth/token manager, endpoint registry
packages/mcp-server   MCP server (stdio + HTTP), tools generated from the registry
apps/dashboard        Next.js dashboard, generic proxy, AI chat, login/auth
```

## Authentication — two layers

**1. Upstream (Moonstride API).** Handled entirely inside `api-client`:
- `TokenManager` calls `POST {base}/authentication/generatetoken` with the `x-api-key` + `clientid` headers and a `{ secretkey, userid }` body.
- The returned `accessToken` is cached, auto-refreshed ~60s before expiry, and sent as the **`token`** header on every call. A 401 / "Authorization token is missing" triggers one transparent refresh + retry.
- Credentials come from `MOONSTRIDE_*` env vars and are validated with Zod. They are **only ever used server-side**.

**2. Our exposed surfaces** (added because they use the service credentials):
- **Dashboard** — a login page + signed-cookie session + Edge `middleware.ts` protect every page and API route. Auth turns on automatically once `DASHBOARD_PASSWORD` is set; unauthenticated page requests redirect to `/login`, API requests get `401`. The session cookie is an HMAC-signed token (`AUTH_SECRET`), `HttpOnly`, `SameSite=Lax`, 12h expiry.
- **MCP HTTP transport** — set `MCP_AUTH_TOKEN` to require `Authorization: Bearer <token>` on `/mcp`. (stdio runs as a trusted local subprocess and needs no extra layer.)

## Setup

```bash
npm install              # installs all workspaces
cp .env.example .env     # fill in MOONSTRIDE_* (and OPENAI_API_KEY for chat)
npm run build            # builds api-client → mcp-server → dashboard (turbo)
npm test                 # vitest across packages
```

Required env (see `.env.example` for the full list): `MOONSTRIDE_API_KEY`, `MOONSTRIDE_CLIENT_ID`, `MOONSTRIDE_SECRET_KEY`, `MOONSTRIDE_USER_ID` (base URL defaults to the demo). Optional: `OPENAI_API_KEY` (chat), `DASHBOARD_PASSWORD` (dashboard login), `MCP_AUTH_TOKEN` (MCP HTTP auth).

## Run

```bash
npm run mcp:stdio        # MCP server over stdio
npm run mcp:http         # MCP server over Streamable HTTP (:8787/mcp)
npm run dashboard:dev    # Next.js dashboard at http://localhost:3000
```

Inspect the MCP server: `npm run -w @moonstride/mcp-server inspect`.

See [`packages/mcp-server/README.md`](packages/mcp-server/README.md) for client (Claude Desktop / Cursor / remote) configuration snippets.

## Dashboard pages

- **Overview** — KPI cards (sales, profit, booking & enquiry counts), goal, volume chart.
- **Bookings** — filters, metrics, results table, payment-installments & ticketing-deadline reports.
- **Enquiries** — pipeline-stage funnel + searchable list.
- **Accounting** — supplier payments due.
- **API Explorer** — call any of the registry endpoints directly (table/JSON views).
- **AI Assistant** — chat that answers from live Moonstride data via OpenAI tool calls.

## Adding an endpoint

Add one entry to `packages/api-client/src/registry.ts`. It instantly becomes: an MCP tool, an Explorer entry, a proxy route, and a chat tool — no other code changes.
