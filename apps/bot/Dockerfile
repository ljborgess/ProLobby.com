# syntax=docker/dockerfile:1

FROM node:22-bookworm-slim AS base
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.32.1 --activate

FROM base AS build
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps ./apps
COPY packages ./packages
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @prolobby/bot... build

FROM base AS runner
ENV NODE_ENV=production
COPY --from=build /app /app
WORKDIR /app/apps/bot
USER node
CMD ["node", "dist/index.js"]
