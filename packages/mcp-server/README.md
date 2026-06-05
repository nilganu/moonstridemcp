# @moonstride/mcp-server

A **provider-agnostic** [Model Context Protocol](https://modelcontextprotocol.io) server for the Moonstride CRM/booking API. Exposes every dashboard endpoint as an MCP tool, plus discovery and reference tools/resources. Works with Claude Desktop, Claude Code, Cursor, and any MCP-compatible host over **stdio** or **Streamable HTTP**.

## Tools

- `moonstride_list_endpoints` — discover every available endpoint (filter by category).
- `moonstride_get_reference` — fetch a reference set (`booking-statuses`, `enquiry-statuses`, `pipeline-stages`, `task-enums`, `currencies`, `users`, `sell-channels`).
- One tool per endpoint, named `moonstride_<id>` — e.g. `moonstride_bookings_search`, `moonstride_bookings_statistics`, `moonstride_enquiries_count`, `moonstride_payment_currencies_exchange`.

Reference data is also exposed as **resources** under `moonstride://reference/<kind>`.

## Configuration

Set these environment variables (see `.env.example` at the repo root):

| Variable | Required | Default | Notes |
| --- | --- | --- | --- |
| `MOONSTRIDE_BASE_URL` | no | `https://demo.moonstride.com` | API base URL |
| `MOONSTRIDE_API_KEY` | yes | — | sent as `x-api-key` |
| `MOONSTRIDE_CLIENT_ID` | yes | — | sent as `clientid` |
| `MOONSTRIDE_SECRET_KEY` | yes | — | token-generation body |
| `MOONSTRIDE_USER_ID` | yes | — | token-generation body |
| `MOONSTRIDE_TIMEOUT_MS` | no | `30000` | request timeout |
| `PORT` | no | `8787` | HTTP transport port |

The server generates and refreshes the access token automatically and sends it as the `token` header on every call.

## Run

```bash
npm run build                 # from repo root (builds api-client first)
node packages/mcp-server/dist/stdio.js     # stdio transport
node packages/mcp-server/dist/http.js      # Streamable HTTP on :8787/mcp
```

### Inspect locally

```bash
npx -y @modelcontextprotocol/inspector node packages/mcp-server/dist/stdio.js
```

## Client configuration

### Claude Desktop / Claude Code (stdio)

`claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "moonstride": {
      "command": "node",
      "args": ["C:/mcpmoonstride/packages/mcp-server/dist/stdio.js"],
      "env": {
        "MOONSTRIDE_BASE_URL": "https://demo.moonstride.com",
        "MOONSTRIDE_API_KEY": "...",
        "MOONSTRIDE_CLIENT_ID": "...",
        "MOONSTRIDE_SECRET_KEY": "...",
        "MOONSTRIDE_USER_ID": "..."
      }
    }
  }
}
```

### Cursor / generic stdio host

Same shape as above — `command: node`, `args: [path to dist/stdio.js]`, with the `MOONSTRIDE_*` env vars.

### Remote Streamable HTTP

Start `node packages/mcp-server/dist/http.js`, then point an HTTP-capable MCP client at:

```
http://your-host:8787/mcp
```

## Docker (HTTP transport)

```bash
docker build -t moonstride-mcp -f packages/mcp-server/Dockerfile .
docker run -p 8787:8787 --env-file .env moonstride-mcp
```
