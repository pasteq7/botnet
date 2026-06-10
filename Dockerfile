# Multi-stage production Dockerfile for BotNet's Next.js application.

# ==========================================
# 1. Base image setup (Debian slim keeps native glibc packages compatible)
# ==========================================
FROM node:20-slim AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# ==========================================
# 2. Dependency resolution
# ==========================================
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci --include=optional && \
    npm install --no-save lightningcss-linux-x64-gnu @tailwindcss/oxide-linux-x64-gnu

# ==========================================
# 3. Code compilation/building
# ==========================================
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build args (passed from docker-compose or --build-arg)
ARG NEXT_PUBLIC_SUPABASE_URL
ARG SUPABASE_INTERNAL_URL
ARG NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV SUPABASE_INTERNAL_URL=$SUPABASE_INTERNAL_URL
ENV NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=$NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

RUN npm run build

# ==========================================
# 4. Production runner
# ==========================================
FROM base AS runner

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

RUN groupadd --system --gid 1001 nodejs && \
    useradd --system --uid 1001 -g nodejs nextjs

# Next standalone output contains the traced production server and only the
# node_modules files needed at runtime.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
