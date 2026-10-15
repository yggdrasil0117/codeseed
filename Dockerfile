# syntax=docker/dockerfile:1

FROM node:22-bookworm-slim AS base

WORKDIR /app
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0

FROM base AS deps

COPY package.json yarn.lock .yarnrc.yml ./
COPY .yarn/releases ./.yarn/releases

RUN corepack yarn install --immutable

FROM base AS builder

ARG NEXT_PUBLIC_SITE_URL
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    NEXT_PUBLIC_SITE_URL=${NEXT_PUBLIC_SITE_URL}

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# The current next.config.js does not enable output: 'standalone'.
# Build the Contentlayer output and run the existing RSS postbuild step, then
# execute the production server in the runtime image with `next start`.
RUN corepack yarn next build \
  && corepack yarn node ./scripts/postbuild.mjs

FROM node:22-bookworm-slim AS runner

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=3000

WORKDIR /app

RUN groupadd --system --gid 1001 nodejs \
  && useradd --system --uid 1001 --gid nodejs nextjs

COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/.contentlayer ./.contentlayer
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.js ./next.config.js
COPY --from=builder /app/package.json ./package.json

RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000

CMD ["node", "node_modules/next/dist/bin/next", "start", "-H", "0.0.0.0", "-p", "3000"]
