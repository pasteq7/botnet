#!/usr/bin/env bash
# =============================================================================
# BotNet Docker One-Click Installer (Linux / macOS)
# =============================================================================

set -e

# Sleek terminal colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}====================================================${NC}"
echo -e "${GREEN}      BotNet One-Click Installer (Option B)        ${NC}"
echo -e "${BLUE}====================================================${NC}"

# 1. Check dependencies
echo -e "\n${BLUE}[1/5] Checking dependencies...${NC}"
if ! [ -x "$(command -v docker)" ]; then
  echo -e "${RED}Error: Docker is not installed. Please install Docker first.${NC}" >&2
  exit 1
fi

if ! docker info > /dev/null 2>&1; then
  echo -e "${RED}Error: Docker daemon is not running. Please start Docker Desktop/Daemon.${NC}" >&2
  exit 1
fi
echo -e "${GREEN}✔ Docker is active and running.${NC}"

# 2. Check and start local Supabase
echo -e "\n${BLUE}[2/5] Initializing local Supabase CLI...${NC}"
if ! [ -x "$(command -v npx)" ]; then
  echo -e "${RED}Error: Node.js/npm is not installed. Please install Node.js first.${NC}" >&2
  exit 1
fi

echo -e "Checking Supabase local stack status..."
# Start supabase local containers
if ! npx supabase status > /dev/null 2>&1; then
  echo -e "${YELLOW}Local Supabase stack is not running. Starting it now...${NC}"
  npx supabase start
else
  echo -e "${GREEN}✔ Local Supabase stack is already running.${NC}"
fi

# Get Supabase status and extract keys
STATUS_OUTPUT=$(npx supabase status)
ANON_KEY=$(echo "$STATUS_OUTPUT" | grep "anon key:" | awk '{print $3}')
SERVICE_ROLE_KEY=$(echo "$STATUS_OUTPUT" | grep "service_role key:" | awk '{print $3}')

if [ -z "$ANON_KEY" ] || [ -z "$SERVICE_ROLE_KEY" ]; then
  echo -e "${RED}Error: Could not extract keys from Supabase status output.${NC}" >&2
  exit 1
fi
echo -e "${GREEN}✔ Programmatically extracted Supabase credentials.${NC}"

# 3. Generate Encryption Key
echo -e "\n${BLUE}[3/5] Resolving encryption keys...${NC}"
ENCRYPTION_KEY=""
if [ -f .env.local ]; then
  ENCRYPTION_KEY=$(grep "ENCRYPTION_KEY=" .env.local | cut -d '=' -f2 || true)
fi

if [ -z "$ENCRYPTION_KEY" ] && [ -f .env.docker ]; then
  ENCRYPTION_KEY=$(grep "ENCRYPTION_KEY=" .env.docker | cut -d '=' -f2 || true)
fi

if [ -z "$ENCRYPTION_KEY" ]; then
  echo -e "Generating a secure 64-character hexadecimal ENCRYPTION_KEY..."
  if [ -x "$(command -v openssl)" ]; then
    ENCRYPTION_KEY=$(openssl rand -hex 32)
  else
    ENCRYPTION_KEY=$(cat /dev/urandom | tr -dc 'a-f0-9' | fold -w 64 | head -n 1)
  fi
  echo -e "${GREEN}✔ Generated ENCRYPTION_KEY: $ENCRYPTION_KEY${NC}"
else
  echo -e "${GREEN}✔ Using existing ENCRYPTION_KEY.${NC}"
fi

# 4. Assembling environment configuration
echo -e "\n${BLUE}[4/5] Building environment configuration (.env.docker)...${NC}"
cat <<EOF > .env.docker
# =============================================================================
# BotNet Docker Environment Configuration (Auto-Generated)
# =============================================================================

NEXT_PUBLIC_SUPABASE_URL=http://host.docker.internal:54321
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=$ANON_KEY
SUPABASE_SECRET_KEY=$SERVICE_ROLE_KEY
ENCRYPTION_KEY=$ENCRYPTION_KEY
INNGEST_DEV=1
EOF

echo -e "${GREEN}✔ Configuration .env.docker successfully compiled.${NC}"

# 5. Launching docker-compose
echo -e "\n${BLUE}[5/5] Launching docker compose orchestration...${NC}"
echo -e "${YELLOW}Deploying BotNet Web (Next.js) & Inngest containers...${NC}"

docker compose up --build
