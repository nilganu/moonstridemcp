# Build + run the Moonstride MCP server (Streamable HTTP transport).
# Build context must be the repo root: docker build -f packages/mcp-server/Dockerfile .
ARG NODE_VERSION=22.22.2
FROM 068026327892.dkr.ecr.eu-west-2.amazonaws.com/node-base-repo:${NODE_VERSION}-alpine AS build

WORKDIR /app

# Install workspace deps using the root manifests.
COPY package.json package-lock.json* turbo.json tsconfig.base.json ./
COPY packages/api-client/package.json packages/api-client/
COPY packages/mcp-server/package.json packages/mcp-server/
RUN npm install --workspaces --include-workspace-root --no-audit --no-fund

# Build api-client then mcp-server.
COPY packages/api-client packages/api-client
COPY packages/mcp-server packages/mcp-server
RUN npm run build -w @moonstride/api-client \
 && npm run build -w @moonstride/mcp-server

FROM 068026327892.dkr.ecr.eu-west-2.amazonaws.com/node-base-repo:${NODE_VERSION}-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=14003
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages/api-client/dist ./packages/api-client/dist
COPY --from=build /app/packages/api-client/package.json ./packages/api-client/package.json
COPY --from=build /app/packages/mcp-server/dist ./packages/mcp-server/dist
COPY --from=build /app/packages/mcp-server/package.json ./packages/mcp-server/package.json
# Provide Moonstride credentials at runtime from the committed env file.
# The server's loadEnv() reads /app/.env (its working directory) on startup.
COPY apps/dashboard/.env.local ./.env
EXPOSE 14003
CMD ["node", "packages/mcp-server/dist/http.js"]
