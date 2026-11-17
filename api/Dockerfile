# Dashboard stage: build the management SPA into static assets
FROM node:22-bookworm-slim AS dashboard
WORKDIR /dash
COPY dashboard/package.json dashboard/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY dashboard/ ./
RUN npm run build

# Build stage: install all dependencies and compile TypeScript
FROM node:22-bookworm-slim AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json ./
COPY script ./script
RUN npm run build && npm prune --omit=dev

# Runtime stage: production dependencies and compiled output only
FROM node:22-bookworm-slim
ENV NODE_ENV=production
WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends curl \
  && rm -rf /var/lib/apt/lists/*

COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/bin ./bin
COPY --from=dashboard /dash/dist ./bin/script/dashboard

EXPOSE 3000
CMD ["node", "bin/script/server.js"]
