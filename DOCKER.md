# BotNet Docker Architecture & Orchestration Guide

This guide provides a comprehensive overview of how BotNet's containerized orchestration works, port maps, networking topologies, and commands for managing local development and deployments using Docker.

---

## 1. Architectural Overview

```
                      ┌──────────────────────────────────────────────┐
                      │                 HOST MACHINE                 │
                      │                                              │
                      │   ┌──────────────────────────────────────┐   │
                      │   │       Supabase Local CLI Stack       │   │
                      │   │                                      │   │
                      │   │  Postgres Db  : 54322                │   │
                      │   │  Auth Gateway : 54321                │   │
                      │   │  Studio UI    : 54323                │   │
                      │   └──────────────────▲───────────────────┘   │
                      └──────────────────────┼───────────────────────┘
                                             │
                       Bridge via host.docker.internal:54321
                                             │
                      ┌──────────────────────┼───────────────────────┐
                      │              DOCKER CONTAINER NETWORK         │
                      │              (botnet-network)                │
                      │                                              │
                      │   ┌──────────────────┴───┐                   │
                      │   │  botnet-web (Next)   │◄──────────────┐   │
                      │   │  Port: 3000          │               │   │
                      │   └──────────────────────┘       Register & │   │
                      │                                  Trigger     │   │
                      │   ┌──────────────────────┐               │   │
                      │   │   botnet-inngest     ├───────────────┘   │
                      │   │   Port: 8288             │               │
                      │   └──────────────────────────┘               │
                      └──────────────────────────────────────────────┘
```

The Docker environment isolates the main application services while bridging key resources back to the host machine:
- **`botnet-web`**: Built via a multi-stage compilation using `node:20-slim` (Debian), running the Next.js runtime on port `3000`.
- **`botnet-inngest`**: Operates the Inngest Dev Server on port `8288` within the `botnet-network` and is configured to register and trigger functions in the `web` container.
- **`host.docker.internal`**: A bridge that lets containerized services (like Next.js) communicate directly with host-bound ports (like the local Supabase stack running on port `54321`).

---

## 2. Ports Overview

| Service | Host Port | Target Port | Access URL | Description |
|---|---|---|---|---|
| **Next.js Web** | `3000` | `3000` | `http://localhost:3000` | Main application UI & APIs |
| **Inngest Server** | `8288` | `8288` | `http://localhost:8288` | Background jobs status panel & registration |
| **Supabase Studio** | `54323` | `54323` | `http://localhost:54323` | Local database dashboard & editor |
| **Supabase API** | `54321` | `54321` | `http://localhost:54321` | Combined API gateway (GoTrue/PostgREST/Realtime) |
| **Supabase Inbucket** | `54324` | `54324` | `http://localhost:54324` | SMTP webmail monitor |

---

## 3. One-Click Installation & Startup

We provide custom interactive installers to automatically build the network, extract credentials from your active/new local Supabase instance, compile `.env.docker`, and start the containers.

### Windows (PowerShell)
Open a PowerShell terminal and run:
```powershell
.\docker-setup.ps1
```

### macOS / Linux (Bash)
Open a shell terminal and run:
```bash
chmod +x docker-setup.sh
./docker-setup.sh
```

---

## 4. Manual Orchestration Commands

If you have already configured `.env.docker` and want to bypass the setup scripts, use these standard commands:

### Start the containers in the background
```bash
docker compose up -d
```

### View container output logs
```bash
docker compose logs -f
```

### Rebuild and launch containers
```bash
docker compose up --build
```

### Stop all containers and remove networks
```bash
docker compose down
```

---

## 5. Troubleshooting & Gotchas

### 1. Host Gateway Resolution (Linux)
On some Linux environments, Docker compose requires explicit routing to reach `host.docker.internal`. The `docker-compose.yml` has this built-in via the following block:
```yaml
extra_hosts:
  - "host.docker.internal:host-gateway"
```

### 2. Node Modules Portability Conflicts
If you encounter compilation errors inside the container, delete the local `node_modules` directory and `package-lock.json` and let the Docker build perform a clean installation:
```bash
rm -rf node_modules package-lock.json
docker compose build --no-cache
```

### 3. Port Allocation Conflicts
Ensure ports `3000`, `8288`, and `54321` are not being used by other software on your machine before running the installation. To see what process is holding a port on Windows, run:
```powershell
Get-NetTCPConnection -LocalPort 3000 | Select-Object -Property OwnProcess, State
```
On macOS/Linux, run:
```bash
lsof -i :3000
```
