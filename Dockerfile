# Multi-Stage Dockerfile for BotNet (Next.js Application)
# Handles both production standalone execution and local development mounts.

# ==========================================
# 1. Base Image Setup (Debian Slim for native glibc compatibility)
# ==========================================
FROM node:20-slim AS base
WORKDIR /app

# ==========================================
# 2. Dependency Resolution
# ==========================================
FROM base AS deps
COPY package.json package-lock.json ./
# Use npm install to dynamically resolve and install optional platform-specific binaries (e.g. lightningcss glibc)
RUN npm install

# ==========================================
# 3. Code Compilation/Building
# ==========================================
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Disable Next.js telemetry during builds
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# ==========================================
# 4. Production Runner
# ==========================================
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Non-root security best-practices (Debian shadow-utils)
RUN groupadd --system --gid 1001 nodejs && \
    useradd --system --uid 1001 -g nodejs nextjs

# Copy essential build output files
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json

USER nextjs

EXPOSE 3000

# Runs the Next.js production server
CMD ["npm", "run", "start"]
