# =============================================================================
# BotNet Docker One-Click Installer (Windows PowerShell)
# =============================================================================

$ErrorActionPreference = "Stop"
$Host.UI.RawUI.WindowTitle = "BotNet Docker Installer"

# Colour helpers
function Write-Banner {
  Write-Host ""
  Write-Host "  BOTNET" -ForegroundColor Blue
  Write-Host "  Docker One-Click Installer" -ForegroundColor Blue
  Write-Host ""
  Write-Host "  Docker One-Click Installer -- Windows PowerShell" -ForegroundColor DarkGray
  Write-Host "  $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor DarkGray
  Write-Host ""
  Write-Host "  $('-' * 56)" -ForegroundColor Blue
}

function Write-Step ($n, $label) {
  $pad = "-" * [Math]::Max(1, 44 - $label.Length)
  Write-Host ""
  Write-Host "-- Step $n/5 - $label $pad" -ForegroundColor Blue
}

function Write-Info ($text)  { Write-Host "  ->  $text" -ForegroundColor Cyan }
function Write-Ok ($text)    { Write-Host "  OK  $text" -ForegroundColor Green }
function Write-Warn ($text)  { Write-Host "  !!  $text" -ForegroundColor Yellow }
function Write-Fail ($text)  { Write-Host "`n  XX  $text`n" -ForegroundColor Red; exit 1 }
function Write-Separator     { Write-Host "  $('-' * 56)" -ForegroundColor Blue }

# Banner
Write-Banner

# -----------------------------------------------------------------------------
# Step 1 - Dependencies
# -----------------------------------------------------------------------------
Write-Step 1 "Checking dependencies"

Write-Info "Looking for Docker CLI ..."
if (-not (Get-Command "docker" -ErrorAction SilentlyContinue)) {
  Write-Fail "Docker CLI not found. Install Docker Desktop and retry."
}
$dockerPath = (Get-Command docker).Source
Write-Ok "Docker CLI found at $dockerPath"

Write-Info "Checking Docker daemon ..."
$dockerInfo = docker info 2>&1
if ($LASTEXITCODE -ne 0) {
  Write-Fail "Docker daemon is not running. Start Docker Desktop and retry."
}
$serverVersion = (docker version --format '{{.Server.Version}}' 2>$null)
Write-Ok "Docker daemon is responsive  (server $serverVersion)"

Write-Info "Looking for Node.js / npx ..."
if (-not (Get-Command "npx" -ErrorAction SilentlyContinue)) {
  Write-Fail "npx not found. Install Node.js (https://nodejs.org) and retry."
}
$nodeVer = node --version
$npmVer  = npm --version
Write-Ok "Node $nodeVer  |  npm $npmVer"

Write-Info "Looking for Supabase CLI ..."
$supabaseCmd = Get-Command "supabase" -ErrorAction SilentlyContinue
if ($supabaseCmd) {
  $supabaseExe = $supabaseCmd.Source
  $supabaseBaseArgs = @()
  Write-Ok "Supabase CLI found at $($supabaseCmd.Source)"
} else {
  $supabaseExe = "npx.cmd"
  $supabaseBaseArgs = @("--yes", "supabase")
  Write-Warn "Supabase CLI not found on PATH -- falling back to npx --yes supabase"
}

function Invoke-Supabase {
  param([Parameter(ValueFromRemainingArguments = $true)][string[]]$Arguments)
  & $supabaseExe @supabaseBaseArgs @Arguments
}

function Invoke-SupabaseCapture {
  param([Parameter(ValueFromRemainingArguments = $true)][string[]]$Arguments)
  $previousErrorAction = $ErrorActionPreference
  $ErrorActionPreference = "Continue"
  try {
    $output = Invoke-Supabase @Arguments 2>&1 | Out-String
    return @{
      Output = $output
      ExitCode = $LASTEXITCODE
    }
  } finally {
    $ErrorActionPreference = $previousErrorAction
  }
}

function Invoke-SupabaseStatus {
  Invoke-SupabaseCapture status
}

function Write-CommandOutput {
  param([string]$Output)
  if (-not $Output.Trim()) { return }
  $Output.Trim() -split "`r?`n" | ForEach-Object {
    Write-Host "  |  $_" -ForegroundColor DarkGray
  }
}

# -----------------------------------------------------------------------------
# Step 2 - Supabase
# -----------------------------------------------------------------------------
Write-Step 2 "Initialising local Supabase"

Write-Info "Querying Supabase stack status ..."
$statusCheck = Invoke-SupabaseStatus
if ($statusCheck.ExitCode -ne 0) {
  $statusReason = $statusCheck.Output.Trim()
  if ($statusReason) {
    Write-Warn "Supabase status returned: $statusReason"
  }
  Write-Warn "Supabase stack is not running -- starting now (may take a few minutes on first run)"
  Write-Info "Running: supabase start"
  $startResult = Invoke-SupabaseCapture start
  Write-CommandOutput $startResult.Output
  if ($startResult.ExitCode -ne 0 -and $startResult.Output -match 'already running|container is not running: exited') {
    Write-Warn "Supabase is in a partial state -- stopping local stack and retrying once"
    $stopResult = Invoke-SupabaseCapture stop
    Write-CommandOutput $stopResult.Output
    if ($stopResult.ExitCode -ne 0) { Write-Fail "supabase stop failed. See output above for details." }

    Write-Info "Retrying: supabase start"
    $startResult = Invoke-SupabaseCapture start
    Write-CommandOutput $startResult.Output
  }
  if ($startResult.ExitCode -ne 0) { Write-Fail "supabase start failed. See output above for details." }
  Write-Ok "Supabase stack started successfully"
} else {
  Write-Ok "Supabase stack is already running -- skipping cold start"
}

Write-Info "Extracting API credentials ..."
$statusCheck = Invoke-SupabaseStatus
$statusText = $statusCheck.Output
if ($statusCheck.ExitCode -ne 0) {
  Write-Fail "Could not read Supabase status after start: $($statusText.Trim())"
}

# Support both new sb_* key format and legacy JWT format
if ($statusText -match 'sb_publishable_(\S+)') {
  $anonKey = "sb_publishable_$($Matches[1])"
} elseif ($statusText -match 'anon key:\s+(\S+)') {
  $anonKey = $Matches[1]
} else {
  $anonKey = $null
}

if ($statusText -match 'sb_secret_(\S+)') {
  $serviceRoleKey = "sb_secret_$($Matches[1])"
} elseif ($statusText -match 'service_role key:\s+(\S+)') {
  $serviceRoleKey = $Matches[1]
} else {
  $serviceRoleKey = $null
}

$supabaseUrl = if ($statusText -match 'API URL:\s+(\S+)')    { $Matches[1] } else { "http://localhost:54321" }
$studioUrl   = if ($statusText -match 'Studio URL:\s+(\S+)') { $Matches[1] } else { "http://localhost:54323" }

$supabaseInternalUrl = $supabaseUrl
try {
  $supabaseUri = [Uri]$supabaseUrl
  $supabaseInternalUrl = "$($supabaseUri.Scheme)://host.docker.internal:$($supabaseUri.Port)"
} catch {
  Write-Fail "Could not convert Supabase URL for Docker networking: $supabaseUrl"
}

if (-not $anonKey)        { Write-Fail "Could not parse anon key from 'supabase status'." }
if (-not $serviceRoleKey) { Write-Fail "Could not parse service_role key from 'supabase status'." }

$anonPreview    = $anonKey.Substring(0, [Math]::Min(24, $anonKey.Length))
$servicePreview = $serviceRoleKey.Substring(0, [Math]::Min(24, $serviceRoleKey.Length))
Write-Ok "Anon key     ->  $anonPreview...  ($($anonKey.Length) chars)"
Write-Ok "Service key  ->  $servicePreview...  ($($serviceRoleKey.Length) chars)"
Write-Ok "Supabase URL ->  $supabaseUrl"
Write-Ok "Docker URL   ->  $supabaseInternalUrl"
Write-Ok "Studio URL   ->  $studioUrl"

# -----------------------------------------------------------------------------
# Step 3 - Encryption key
# -----------------------------------------------------------------------------
Write-Step 3 "Resolving encryption key"

$encryptionKey = ""

if (Test-Path .env.local) {
  $m = Select-String -Path .env.local -Pattern '^ENCRYPTION_KEY=(.+)$'
  if ($m) {
    $encryptionKey = $m.Matches[0].Groups[1].Value.Trim()
    Write-Ok "Loaded ENCRYPTION_KEY from .env.local"
  }
}

if (-not $encryptionKey -and (Test-Path .env.docker)) {
  $m = Select-String -Path .env.docker -Pattern '^ENCRYPTION_KEY=(.+)$'
  if ($m) {
    $encryptionKey = $m.Matches[0].Groups[1].Value.Trim()
    Write-Ok "Loaded ENCRYPTION_KEY from .env.docker"
  }
}

if (-not $encryptionKey) {
  Write-Info "No existing key found -- generating a fresh 256-bit hex key ..."
  $bytes = [Byte[]]::new(32)
  [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
  $encryptionKey = ([System.BitConverter]::ToString($bytes) -replace '-').ToLower()
  $keyPreview = $encryptionKey.Substring(0, 16)
  Write-Ok "Generated  ->  $keyPreview...  ($($encryptionKey.Length) chars)"
} else {
  $keyLen     = $encryptionKey.Length
  $keyPreview = $encryptionKey.Substring(0, [Math]::Min(16, $keyLen))
  Write-Ok "Reusing existing ENCRYPTION_KEY  ->  $keyPreview...  ($keyLen chars)"
}

# -----------------------------------------------------------------------------
# Step 4 - Write .env.docker
# -----------------------------------------------------------------------------
Write-Step 4 "Writing environment file"

$generatedAt = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
$envContent  = @"
# =============================================================================
# BotNet Docker Environment -- Auto-Generated by docker-setup.ps1
# Generated: $generatedAt
# WARNING: Do NOT commit this file to version control.
# =============================================================================

NEXT_PUBLIC_SUPABASE_URL=$supabaseUrl
SUPABASE_INTERNAL_URL=$supabaseInternalUrl
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=$anonKey
SUPABASE_SECRET_KEY=$serviceRoleKey
ENCRYPTION_KEY=$encryptionKey
INNGEST_DEV=1
"@

Set-Content -Path .env.docker -Value $envContent -Encoding UTF8
$lineCount = (Get-Content .env.docker).Count
Write-Ok ".env.docker written  ($lineCount lines)"
Write-Info "Path: $(Resolve-Path .env.docker)"

# -----------------------------------------------------------------------------
# Step 5 - Docker Compose
# -----------------------------------------------------------------------------
Write-Step 5 "Launching Docker Compose stack"

Write-Info "Running: docker compose --progress plain --env-file .env.docker up --build -d"
Write-Host ""
$env:COMPOSE_PROGRESS = "plain"
docker compose --progress plain --env-file .env.docker up --build -d
if ($LASTEXITCODE -ne 0) { Write-Fail "docker compose up failed. See output above for details." }

# -----------------------------------------------------------------------------
# Summary
# -----------------------------------------------------------------------------
Write-Host ""
Write-Separator
Write-Host "  BotNet is up and running!" -ForegroundColor Green
Write-Host ""
Write-Host "  Service endpoints" -ForegroundColor White
Write-Ok "Next.js app       ->  http://localhost:3000"
Write-Ok "Inngest dashboard ->  http://localhost:8288"
Write-Ok "Supabase Studio   ->  $studioUrl"
Write-Ok "Supabase API      ->  $supabaseUrl"
Write-Ok "Inbucket mail     ->  http://localhost:54324"
Write-Host ""
Write-Host "  Quick commands" -ForegroundColor White
Write-Host "  Logs   :  docker compose --env-file .env.docker logs -f"  -ForegroundColor DarkGray
Write-Host "  Stop   :  docker compose --env-file .env.docker down"      -ForegroundColor DarkGray
Write-Host "  Rebuild:  docker compose --env-file .env.docker up --build" -ForegroundColor DarkGray
Write-Host ""
Write-Separator
Write-Host ""
