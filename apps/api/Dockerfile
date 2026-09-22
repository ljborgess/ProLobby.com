# syntax=docker/dockerfile:1

FROM node:22-bookworm-slim AS base
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.32.1 --activate

FROM base AS build
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps ./apps
COPY packages ./packages
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @prolobby/api... build

FROM base AS runner
ENV NODE_ENV=production
COPY --from=build /app /app
WORKDIR /app/apps/api
# The one directory the process writes to. Everything above is copied as root,
# and `node` cannot create anything in it — account-recovery evidence failed
# with EACCES and every recovery was lost in silence (audit of 2026-09-21).
# Production mounts a volume here (docker-compose.prod.yml); owning the mount
# point makes a fresh named volume start out owned by `node` too.
RUN mkdir -p /app/apps/api/uploads/account-recovery && chown -R node:node /app/apps/api/uploads
USER node
CMD ["node", "dist/main.js"]

# pg_dump / pg_restore live here, not in the API process. The API image must
# not gain DATABASE_DIRECT_URL; this stage is the only consumer (#123).
FROM runner AS backup
USER root
RUN apt-get update \
  && apt-get install -y --no-install-recommends postgresql-client \
  && rm -rf /var/lib/apt/lists/*
USER node
CMD ["node", "dist/common/backup/cli.js"]
