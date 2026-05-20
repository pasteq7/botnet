#!/usr/bin/env bash
# =============================================================================
# BotNet Docker One-Click Installer (Linux / macOS)
# =============================================================================

set -euo pipefail

# ── Colours & symbols ────────────────────────────────────────────────────────
BOLD='\033[1m';     RESET='\033[0m'
RED='\033[0;31m';   GREEN='\033[0;32m'
YELLOW='\033[1;33m';BLUE='\033[0;34m'
CYAN='\033[0;36m';  DIM='\033[2m'

OK="${GREEN}✔${RESET}";  WARN="${YELLOW}⚠${RESET}";  ERR="${RED}✖${RESET}";  INFO="${CYAN}→${RESET}"

# ── Helpers ──────────────────────────────────────────────────────────────────
print_banner() {
  echo -e "\n${BLUE}${BOLD}"
  echo "  ██████╗  ██████╗ ████████╗███╗  ██╗███████╗████████╗"
  echo "  ██╔══██╗██╔═══██╗╚══██╔══╝████╗ ██║██╔════╝╚══██╔══╝"
  echo "  ██████╔╝██║   ██║   ██║   ██╔██╗██║█████╗     ██║   "
  echo "  ██╔══██╗██║   ██║   ██║   ██║╚████║██╔══╝     ██║   "
  echo "  ██████╔╝╚██████╔╝   ██║   ██║ ╚███║███████╗   ██║   "
  echo "  ╚═════╝  ╚═════╝    ╚═╝   ╚═╝  ╚══╝╚══════╝   ╚═╝   "
  echo -e "${RESET}"
  echo -e "  ${DIM}Docker One-Click Installer — Linux / macOS${RESET}"
  echo -e "  ${DIM}$(date '+%Y-%m-%d %H:%M:%S')${RESET}\n"
  echo -e "${BLUE}$(printf '─%.0s' {1..58})${RESET}\n"
}

step() {   echo -e "\n${BLUE}${BOLD}── Step $1/5 · $2 ${RESET}${BLUE}$(printf '─%.0s' $(seq 1 $((42 - ${#2}))))${RESET}"; }
info()  {   echo -e "  ${INFO}  $*"; }
ok()    {   echo -e "  ${OK}  $*"; }
warn()  {   echo -e "  ${WARN}  ${YELLOW}$*${RESET}"; }
fail()  {   echo -e "\n  ${ERR}  ${RED}${BOLD}$*${RESET}\n" >&2; exit 1; }

spinner() {
  local pid=$1 msg=$2
  local frames=("⠋" "⠙" "⠹" "⠸" "⠼" "⠴" "⠦" "⠧" "⠇" "⠏")
  local i=0
  tput civis 2>/dev/null || true
  while kill -0 "$pid" 2>/dev/null; do
    printf "\r  ${CYAN}%s${RESET}  %s …" "${frames[$((i % ${#frames[@]}))]}" "$msg"
    sleep 0.08; ((i++))
  done
  tput cnorm 2>/dev/null || true
  printf "\r\033[2K"
}

# ── Banner ────────────────────────────────────────────────────────────────────
print_banner

# ─────────────────────────────────────────────────────────────────────────────
# Step 1 — Dependencies
# ─────────────────────────────────────────────────────────────────────────────
step 1 "Checking dependencies"

info "Looking for Docker CLI …"
command -v docker &>/dev/null || fail "Docker CLI not found. Install Docker Desktop and retry."
ok "Docker CLI found at $(command -v docker)"

info "Checking Docker daemon …"
docker info &>/dev/null || fail "Docker daemon is not running. Start Docker Desktop/Daemon and retry."
ok "Docker daemon is responsive  ($(docker version --format '{{.Server.Version}}' 2>/dev/null || echo 'unknown') server)"

info "Looking for Node.js / npx …"
command -v npx &>/dev/null || fail "npx not found. Install Node.js (https://nodejs.org) and retry."
ok "Node $(node --version)  ·  npm $(npm --version)  ·  npx $(npx --version 2>/dev/null || echo 'ok')"

# ─────────────────────────────────────────────────────────────────────────────
# Step 2 — Supabase
# ─────────────────────────────────────────────────────────────────────────────
step 2 "Initialising local Supabase"

info "Querying Supabase stack status …"
if npx supabase status &>/dev/null; then
  ok "Supabase stack is already running — skipping cold start"
else
  warn "Supabase stack is not running — starting now (may take a few minutes on first run)"
  info "Running: npx supabase start"
  npx supabase start 2>&1 | sed 's/^/      /' \
    || fail "supabase start failed. Check the output above for details."
  ok "Supabase stack started successfully"
fi

info "Extracting API credentials …"
STATUS_OUTPUT=$(npx supabase status)

ANON_KEY=$(echo "$STATUS_OUTPUT"        | grep -i "anon key:"          | awk '{print $NF}')
SERVICE_ROLE_KEY=$(echo "$STATUS_OUTPUT"| grep -i "service_role key:"  | awk '{print $NF}')
SUPABASE_URL=$(echo "$STATUS_OUTPUT"    | grep -i "API URL:"            | awk '{print $NF}')
DB_URL=$(echo "$STATUS_OUTPUT"          | grep -i "DB URL:"             | awk '{print $NF}' || true)
STUDIO_URL=$(echo "$STATUS_OUTPUT"      | grep -i "Studio URL:"         | awk '{print $NF}' || true)

[[ -z "$ANON_KEY"         ]] && fail "Could not parse anon key from 'supabase status'. Output:\n$STATUS_OUTPUT"
[[ -z "$SERVICE_ROLE_KEY" ]] && fail "Could not parse service_role key from 'supabase status'."
[[ -z "$SUPABASE_URL"     ]] && SUPABASE_URL="http://localhost:54321"

SUPABASE_INTERNAL_URL=$(python3 - "$SUPABASE_URL" <<'PY'
from urllib.parse import urlparse
import sys

url = urlparse(sys.argv[1])
if not url.scheme or not url.port:
    raise SystemExit(f"Could not convert Supabase URL for Docker networking: {sys.argv[1]}")
print(f"{url.scheme}://host.docker.internal:{url.port}")
PY
)

ok "Anon key        →  ${ANON_KEY:0:24}…  (${#ANON_KEY} chars)"
ok "Service key     →  ${SERVICE_ROLE_KEY:0:24}…  (${#SERVICE_ROLE_KEY} chars)"
[[ -n "$SUPABASE_URL" ]] && ok "Supabase URL    →  $SUPABASE_URL"
ok "Docker URL      →  $SUPABASE_INTERNAL_URL"
[[ -n "$STUDIO_URL"   ]] && ok "Studio URL      →  $STUDIO_URL"

# ─────────────────────────────────────────────────────────────────────────────
# Step 3 — Encryption key
# ─────────────────────────────────────────────────────────────────────────────
step 3 "Resolving encryption key"

ENCRYPTION_KEY=""
if [[ -f .env.local ]]; then
  ENCRYPTION_KEY=$(grep -E '^ENCRYPTION_KEY=' .env.local | cut -d'=' -f2- || true)
  [[ -n "$ENCRYPTION_KEY" ]] && ok "Loaded ENCRYPTION_KEY from .env.local"
fi

if [[ -z "$ENCRYPTION_KEY" && -f .env.docker ]]; then
  ENCRYPTION_KEY=$(grep -E '^ENCRYPTION_KEY=' .env.docker | cut -d'=' -f2- || true)
  [[ -n "$ENCRYPTION_KEY" ]] && ok "Loaded ENCRYPTION_KEY from .env.docker"
fi

if [[ -z "$ENCRYPTION_KEY" ]]; then
  info "No existing key found — generating a fresh 256-bit hex key …"
  if command -v openssl &>/dev/null; then
    ENCRYPTION_KEY=$(openssl rand -hex 32)
    ok "Generated via openssl  →  ${ENCRYPTION_KEY:0:16}…"
  else
    ENCRYPTION_KEY=$(tr -dc 'a-f0-9' </dev/urandom | head -c 64)
    ok "Generated via /dev/urandom  →  ${ENCRYPTION_KEY:0:16}…"
  fi
else
  ok "Reusing existing ENCRYPTION_KEY  →  ${ENCRYPTION_KEY:0:16}…  (${#ENCRYPTION_KEY} chars)"
fi

# ─────────────────────────────────────────────────────────────────────────────
# Step 4 — Write .env.docker
# ─────────────────────────────────────────────────────────────────────────────
step 4 "Writing environment file"

GENERATED_AT="$(date '+%Y-%m-%d %H:%M:%S')"

cat > .env.docker <<EOF
# =============================================================================
# BotNet Docker Environment — Auto-Generated by docker-setup.sh
# Generated: $GENERATED_AT
# WARNING: Do NOT commit this file to version control.
# =============================================================================

NEXT_PUBLIC_SUPABASE_URL=$SUPABASE_URL
SUPABASE_INTERNAL_URL=$SUPABASE_INTERNAL_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=$ANON_KEY
SUPABASE_SECRET_KEY=$SERVICE_ROLE_KEY
ENCRYPTION_KEY=$ENCRYPTION_KEY
INNGEST_DEV=1
EOF

ok ".env.docker written  ($(wc -l < .env.docker) lines)"
info "Path: $(pwd)/.env.docker"

# ─────────────────────────────────────────────────────────────────────────────
# Step 5 — Docker Compose
# ─────────────────────────────────────────────────────────────────────────────
step 5 "Launching Docker Compose stack"

info "Running: docker compose --env-file .env.docker up --build"
echo -e "\n${DIM}  ┌─ docker compose output $( printf '─%.0s' {1..32})${RESET}"

docker compose --env-file .env.docker up --build 2>&1 | sed 's/^/  │ /'

echo -e "${DIM}  └$( printf '─%.0s' {1..56})${RESET}"

# ─────────────────────────────────────────────────────────────────────────────
# Summary
# ─────────────────────────────────────────────────────────────────────────────
echo -e "\n${BLUE}${BOLD}$(printf '─%.0s' {1..58})${RESET}"
echo -e "${GREEN}${BOLD}  🚀 BotNet is up and running!${RESET}\n"
echo -e "  ${BOLD}Service endpoints${RESET}"
echo -e "  ${OK}  Next.js app       →  ${CYAN}http://localhost:3000${RESET}"
echo -e "  ${OK}  Inngest dashboard →  ${CYAN}http://localhost:8288${RESET}"
[[ -n "$STUDIO_URL" ]] \
  && echo -e "  ${OK}  Supabase Studio   →  ${CYAN}$STUDIO_URL${RESET}" \
  || echo -e "  ${OK}  Supabase Studio   →  ${CYAN}http://localhost:54323${RESET}"
echo -e "  ${OK}  Supabase API      →  ${CYAN}$SUPABASE_URL${RESET}"
echo -e "  ${OK}  Inbucket mail     →  ${CYAN}$(echo "$STUDIO_URL" | sed 's/54383/54384/')${RESET}"
echo -e "\n  ${BOLD}Quick commands${RESET}"
echo -e "  ${DIM}Logs   :${RESET}  docker compose --env-file .env.docker logs -f"
echo -e "  ${DIM}Stop   :${RESET}  docker compose --env-file .env.docker down"
echo -e "  ${DIM}Rebuild:${RESET}  docker compose --env-file .env.docker up --build"
echo -e "\n${BLUE}${BOLD}$(printf '─%.0s' {1..58})${RESET}\n"
