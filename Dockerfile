FROM node:20-slim AS builder

# Install system deps needed for better-sqlite3 (native module)
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Enable corepack and set up pnpm
RUN corepack enable && corepack prepare pnpm@10 --activate

WORKDIR /app

# Copy workspace manifests for dependency resolution
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./

# Copy all package.json files so pnpm can set up the workspace
COPY artifacts/api-server/package.json       ./artifacts/api-server/
COPY artifacts/task-tracker/package.json     ./artifacts/task-tracker/
COPY artifacts/mockup-sandbox/package.json   ./artifacts/mockup-sandbox/
COPY lib/db/package.json                     ./lib/db/
COPY lib/api-client-react/package.json       ./lib/api-client-react/
COPY lib/api-zod/package.json                ./lib/api-zod/
COPY lib/api-spec/package.json               ./lib/api-spec/

# Copy full source (needed for workspace:* local deps)
COPY lib/ ./lib/
COPY artifacts/ ./artifacts/

# Install all workspace dependencies
RUN pnpm install --no-frozen-lockfile

# Build the api-server bundle
RUN pnpm --filter @workspace/api-server build

# ---- Runtime stage ----
FROM node:20-slim AS runtime

RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

RUN corepack enable && corepack prepare pnpm@10 --activate

WORKDIR /app

# Bring workspace manifests
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY artifacts/api-server/package.json       ./artifacts/api-server/
COPY artifacts/task-tracker/package.json     ./artifacts/task-tracker/
COPY artifacts/mockup-sandbox/package.json   ./artifacts/mockup-sandbox/
COPY lib/db/package.json                     ./lib/db/
COPY lib/api-client-react/package.json       ./lib/api-client-react/
COPY lib/api-zod/package.json                ./lib/api-zod/
COPY lib/api-spec/package.json               ./lib/api-spec/
COPY lib/ ./lib/

# Production install (native modules must be rebuilt for this image)
RUN pnpm install --no-frozen-lockfile --prod

# Copy compiled server bundle from builder
COPY --from=builder /app/artifacts/api-server/dist ./artifacts/api-server/dist

# Copy DB seed script
COPY lib/db/scripts/setup-local-sqlite.mjs ./lib/db/scripts/
COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

# Ensure /data directory exists (Railway volume will mount here)
RUN mkdir -p /data

EXPOSE 3000

CMD ["./docker-entrypoint.sh"]
