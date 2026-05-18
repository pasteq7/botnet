# =============================================================================
# BotNet Docker One-Click Installer (Windows PowerShell)
# =============================================================================

$ErrorActionPreference = "Stop"

# Set colors
function Write-Header ($text) {
    Write-Host "`n====================================================" -ForegroundColor Cyan
    Write-Host "      $text" -ForegroundColor Green
    Write-Host "====================================================" -ForegroundColor Cyan
}

function Write-Info ($text) {
    Write-Host "$text" -ForegroundColor Cyan
}

function Write-Success ($text) {
    Write-Host "✔ $text" -ForegroundColor Green
}

function Write-Warning ($text) {
    Write-Host "⚠ $text" -ForegroundColor Yellow
}

function Write-ErrorText ($text) {
    Write-Host "✖ $text" -ForegroundColor Red
}

Write-Header "BotNet One-Click Installer (Option B)"

# 1. Check dependencies
Write-Info "`n[1/5] Checking dependencies..."

if (-not (Get-Command "docker" -ErrorAction SilentlyContinue)) {
    Write-ErrorText "Error: Docker CLI is not installed. Please install Docker Desktop first."
    exit 1
}

$dockerInfo = docker info 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-ErrorText "Error: Docker daemon is not running. Please start Docker Desktop."
    exit 1
}
Write-Success "Docker is active and running."

# 2. Check and start local Supabase
Write-Info "`n[2/5] Initializing local Supabase CLI..."

if (-not (Get-Command "npx" -ErrorAction SilentlyContinue)) {
    Write-ErrorText "Error: Node.js/npm is not installed. Please install Node.js first."
    exit 1
}

Write-Info "Checking Supabase local stack status..."
$statusCheck = npx supabase status 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Warning "Local Supabase stack is not running. Starting it now..."
    npx supabase start
} else {
    Write-Success "Local Supabase stack is already running."
}

# Fetch Supabase status and extract keys
Write-Info "Querying local credentials..."
$statusText = npx supabase status | Out-String

$anonKeyMatch = [regex]::Match($statusText, 'anon key:\s+(\S+)')
$serviceKeyMatch = [regex]::Match($statusText, 'service_role key:\s+(\S+)')

if (-not $anonKeyMatch.Success -or -not $serviceKeyMatch.Success) {
    Write-ErrorText "Error: Could not extract keys from Supabase status output."
    exit 1
}

$anonKey = $anonKeyMatch.Groups[1].Value
$serviceRoleKey = $serviceKeyMatch.Groups[1].Value
Write-Success "Programmatically extracted Supabase credentials."

# 3. Generate Encryption Key
Write-Info "`n[3/5] Resolving encryption keys..."
$encryptionKey = ""

if (Test-Path .env.local) {
    $envLocalContent = Get-Content .env.local | Out-String
    $encryptionKeyMatch = [regex]::Match($envLocalContent, 'ENCRYPTION_KEY=(\S+)')
    if ($encryptionKeyMatch.Success) {
        $encryptionKey = $encryptionKeyMatch.Groups[1].Value
    }
}

if (-not $encryptionKey -and (Test-Path .env.docker)) {
    $envDockerContent = Get-Content .env.docker | Out-String
    $encryptionKeyMatch = [regex]::Match($envDockerContent, 'ENCRYPTION_KEY=(\S+)')
    if ($encryptionKeyMatch.Success) {
        $encryptionKey = $encryptionKeyMatch.Groups[1].Value
    }
}

if (-not $encryptionKey) {
    Write-Info "Generating a secure 64-character hexadecimal ENCRYPTION_KEY..."
    $bytes = New-Object Byte[] 32
    [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
    $encryptionKey = ([System.BitConverter]::ToString($bytes) -replace '-').ToLower()
    Write-Success "Generated ENCRYPTION_KEY: $encryptionKey"
} else {
    Write-Success "Using existing ENCRYPTION_KEY."
}

# 4. Assembling environment configuration
Write-Info "`n[4/5] Building environment configuration (.env.docker)..."

$envDockerTemplate = "# =============================================================================`n" +
"# BotNet Docker Environment Configuration (Auto-Generated)`n" +
"# =============================================================================`n`n" +
"NEXT_PUBLIC_SUPABASE_URL=http://host.docker.internal:54321`n" +
"NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=$anonKey`n" +
"SUPABASE_SECRET_KEY=$serviceRoleKey`n" +
"ENCRYPTION_KEY=$encryptionKey`n" +
"INNGEST_DEV=1"

Set-Content -Path .env.docker -Value $envDockerTemplate
Write-Success "Configuration .env.docker successfully compiled."

# 5. Launching docker-compose
Write-Info "`n[5/5] Launching docker compose orchestration..."
Write-Warning "Deploying BotNet Web (Next.js) & Inngest containers..."

docker compose up --build
