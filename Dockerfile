# syntax=docker/dockerfile:1

# Next.js 16 requiere Node.js >= 20.9, por eso se usa la LTS 22 en Alpine
# en lugar de node:18-alpine. Se puede cambiar con --build-arg NODE_VERSION=...
ARG NODE_VERSION=22-alpine

# ---------------------------------------------------------------------------
# Etapa 1 · base: imagen común para todas las etapas
# ---------------------------------------------------------------------------
FROM node:${NODE_VERSION} AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# ---------------------------------------------------------------------------
# Etapa 2 · deps: todas las dependencias (incluye devDependencies para compilar)
# ---------------------------------------------------------------------------
FROM base AS deps
# libc6-compat ayuda a binarios nativos compilados para glibc
RUN apk add --no-cache libc6-compat
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci

# ---------------------------------------------------------------------------
# Etapa 3 · builder: compila la aplicación con `next build`
# ---------------------------------------------------------------------------
FROM base AS builder
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ---------------------------------------------------------------------------
# Etapa 4 · prod-deps: solo dependencias de producción para la imagen final
# ---------------------------------------------------------------------------
FROM base AS prod-deps
RUN apk add --no-cache libc6-compat
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --omit=dev

# ---------------------------------------------------------------------------
# Etapa 5 · runner: imagen final y mínima que ejecuta `next start`
# ---------------------------------------------------------------------------
FROM base AS runner
ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0

# Se ejecuta con el usuario sin privilegios `node` que trae la imagen oficial
COPY --from=prod-deps --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/package.json /app/next.config.ts ./
COPY --from=builder --chown=node:node /app/public ./public
COPY --from=builder --chown=node:node /app/.next ./.next
USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:${PORT}/api/health || exit 1

CMD ["node_modules/.bin/next", "start"]
