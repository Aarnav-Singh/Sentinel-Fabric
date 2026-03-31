<#
.SYNOPSIS
    Sentinel Fabric V2 — Start All Components

.DESCRIPTION
    Starts the complete Sentinel Fabric stack in one command:
      1. Docker infrastructure (ClickHouse / Redis / PostgreSQL / Kafka / Qdrant)
      2. FastAPI backend (auto-fallbacks to in-memory if Docker unavailable)
      3. Next.js frontend
      4. Event simulation (optional)

.PARAMETER Mode
    full  — Docker + Backend + Frontend + Simulation (default)
    dev   — Backend (in-memory) + Frontend + Simulation (no Docker)
    infra — Docker infrastructure only
    stop  — Stop everything

.PARAMETER SimInterval
    Seconds between simulated events (default: 3). Set to 0 to skip simulation.

.EXAMPLE
    .\start.ps1                    # Dev mode (no Docker)
    .\start.ps1 -Mode full         # Full stack with Docker
    .\start.ps1 -Mode stop         # Stop everything
    .\start.ps1 -SimInterval 0     # No simulation
#>

param(
    [ValidateSet("full", "dev", "infra", "stop")]
    [string]$Mode = "dev",

    [int]$SimInterval = 3,
    [int]$BackendPort = 8001,
    [int]$FrontendPort = 3000
)

$ErrorActionPreference = "Continue"
$ROOT = Split-Path -Parent $PSScriptRoot
if (-not $ROOT) { $ROOT = (Get-Location).Path }
$BACKEND = Join-Path $ROOT "backend"
$FRONTEND = Join-Path $ROOT "frontend"
$INFRA = Join-Path $ROOT "infra"

# ── Helpers ─────────────────────────────────────────────
function Write-Status($msg) { Write-Host "  > $msg" -ForegroundColor Cyan }
function Write-Ok($msg) { Write-Host "  + $msg" -ForegroundColor Green }
function Write-Warn2($msg) { Write-Host "  ! $msg" -ForegroundColor Yellow }
function Write-Err2($msg) { Write-Host "  x $msg" -ForegroundColor Red }

function Show-Banner {
    Write-Host ""
    Write-Host "  =====================================" -ForegroundColor DarkCyan
    Write-Host "    SENTINEL FABRIC V2                  " -ForegroundColor DarkCyan
    Write-Host "    Security Posture Intelligence       " -ForegroundColor DarkCyan
    Write-Host "  =====================================" -ForegroundColor DarkCyan
    Write-Host ""
}

# ── Kill port ───────────────────────────────────────────
function Stop-Port([int]$port) {
    Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue |
    ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }
}

# ── Stop Everything ─────────────────────────────────────
function Stop-All {
    Write-Status "Stopping all Sentinel Fabric components..."

    try {
        Invoke-RestMethod -Uri "http://localhost:${BackendPort}/api/v1/simulate/stop" -Method POST -ErrorAction SilentlyContinue | Out-Null
    }
    catch {}

    Stop-Port $FrontendPort
    Stop-Port $BackendPort

    if (Test-Path (Join-Path $INFRA "docker-compose.yml")) {
        Push-Location $INFRA
        docker compose down 2>$null
        Pop-Location
    }

    Start-Sleep -Seconds 2
    Write-Ok "All components stopped."
}

# ── Start Docker ────────────────────────────────────────
function Start-Infra {
    Write-Status "Starting Docker infrastructure..."

    if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
        Write-Warn2 "Docker not found command. Backend will use in-memory fallbacks."
        return $false
    }
    
    if (-not (Test-Path (Join-Path $ROOT ".env"))) {
        Write-Status "Generating root .env from template..."
        Copy-Item (Join-Path $ROOT ".env.prod.example") (Join-Path $ROOT ".env")
    }
    
    if (-not (Test-Path (Join-Path $BACKEND ".env"))) {
        Write-Status "Generating backend .env from template..."
        Copy-Item (Join-Path $BACKEND ".env.example") (Join-Path $BACKEND ".env")
    }

    if (-not (Test-Path (Join-Path $INFRA "docker-compose.yml"))) {
        Write-Warn2 "docker-compose.yml not found in $INFRA. Backend will use in-memory fallbacks."
        return $false
    }

    # Verify if Docker daemon is actually running
    docker info 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) {
        Write-Warn2 "Docker daemon is not running."
        $dockerPath = "C:\Program Files\Docker\Docker\Docker Desktop.exe"
        if (Test-Path $dockerPath) {
            Write-Status "Attempting to start Docker Desktop..."
            Start-Process -FilePath $dockerPath
            Write-Status "Waiting for Docker daemon to initialize (this may take up to 90s)..."
            
            $daemonReady = $false
            for ($i = 0; $i -lt 90; $i++) {
                Start-Sleep -Seconds 1
                docker info 2>&1 | Out-Null
                if ($LASTEXITCODE -eq 0) {
                    $daemonReady = $true
                    break
                }
            }
            if (-not $daemonReady) {
                Write-Warn2 "Docker daemon did not start in time. Backend will use in-memory fallbacks."
                return $false
            }
            Write-Ok "Docker daemon is now running."
        }
        else {
            Write-Warn2 "Could not find Docker Desktop to start it. Backend will use in-memory fallbacks."
            return $false
        }
    }

    Push-Location $INFRA
    docker compose up -d 2>&1 | Out-Null
    $code = $LASTEXITCODE
    Pop-Location

    if ($code -eq 0) {
        Write-Ok "Docker infrastructure started."
        return $true
    }
    else {
        Write-Warn2 "Docker failed to start containers. Backend will use in-memory fallbacks."
        return $false
    }
}

# ── Start Backend ───────────────────────────────────────
function Start-Backend {
    Write-Status "Starting FastAPI backend on port $BackendPort..."

    $venvPython = Join-Path $BACKEND "venv\Scripts\python.exe"
    if (-not (Test-Path $venvPython)) {
        Write-Err2 "Python venv not found at $venvPython"
        Write-Err2 "Run: cd backend && python -m venv venv && .\venv\Scripts\pip install -e .[dev]"
        return
    }

    Stop-Port $BackendPort
    Start-Sleep -Seconds 1

    $proc = Start-Process -FilePath $venvPython `
        -ArgumentList @("-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "$BackendPort") `
        -WorkingDirectory $BACKEND `
        -WindowStyle Hidden `
        -PassThru

    # Grace period: let lifespan() finish connecting to Docker infra
    Start-Sleep -Seconds 5
    $ready = $false
    for ($i = 0; $i -lt 60; $i++) {
        Start-Sleep -Seconds 1
        try {
            Invoke-WebRequest -Uri "http://localhost:${BackendPort}/api/v1/health" -UseBasicParsing -Method GET -TimeoutSec 2 -ErrorAction Stop | Out-Null
            $ready = $true
            break
        }
        catch {}
    } if ($ready) {
        Write-Ok "Backend ready at http://localhost:$BackendPort (PID: $($proc.Id))"
    }
    else {
        Write-Warn2 "Backend started but health check timed out."
    }
}

# ── Start Frontend ──────────────────────────────────────
function Start-Frontend {
    Write-Status "Starting Next.js frontend on port $FrontendPort..."

    $envContent = @"
# Auto-generated by start.ps1
BACKEND_API_URL=http://localhost:$BackendPort
BACKEND_API_KEY=CHANGE-ME-IN-PRODUCTION
NEXT_PUBLIC_APP_URL=http://localhost:$FrontendPort
"@
    $envFile = Join-Path $FRONTEND ".env.local"
    Set-Content -Path $envFile -Value $envContent -Encoding UTF8

    Stop-Port $FrontendPort
    Start-Sleep -Seconds 1

    Start-Process -FilePath "cmd.exe" `
        -ArgumentList @("/c", "cd /d `"$FRONTEND`" && npm run dev") `
        -WindowStyle Hidden

    $ready = $false
    for ($i = 0; $i -lt 20; $i++) {
        Start-Sleep -Seconds 1
        try {
            Invoke-WebRequest -Uri "http://localhost:$FrontendPort" -Method HEAD -TimeoutSec 2 -UseBasicParsing -ErrorAction Stop | Out-Null
            $ready = $true
            break
        }
        catch {}
    }

    if ($ready) {
        Write-Ok "Frontend ready at http://localhost:$FrontendPort"
    }
    else {
        Write-Warn2 "Frontend started but health check timed out."
    }
}

# ── Start Simulation ────────────────────────────────────
function Start-Simulation {
    if ($SimInterval -le 0) {
        Write-Warn2 "Simulation skipped (interval=0)"
        return
    }

    Write-Status "Starting event simulation (1 event every ${SimInterval}s)..."

    try {
        $r = Invoke-RestMethod -Uri "http://localhost:${BackendPort}/api/v1/simulate/burst?count=10" -Method POST -TimeoutSec 15
        Write-Ok "Seeded $($r.events_processed) initial events"
    }
    catch {
        Write-Warn2 "Initial burst failed."
        return
    }

    try {
        Invoke-RestMethod -Uri "http://localhost:${BackendPort}/api/v1/simulate/start?interval=$SimInterval" -Method POST -TimeoutSec 5 | Out-Null
        Write-Ok "Continuous simulation running"
    }
    catch {
        Write-Warn2 "Continuous simulation failed to start."
    }
}

# ── Main ────────────────────────────────────────────────
Show-Banner

switch ($Mode) {
    "stop" {
        Stop-All
    }
    "infra" {
        Start-Infra | Out-Null
    }
    "full" {
        Stop-All
        Write-Status "Starting full stack via Docker Compose..."
        $dockerOk = Start-Infra
        if ($dockerOk) { 
            # Booting up API and Frontend exclusively via Docker to avoid local environment bugs
            Push-Location $ROOT
            docker compose -f docker-compose.prod.yml up -d --build 2>&1 | Out-Null
            Pop-Location
            Start-Sleep -Seconds 10 
        } Else {
            Write-Err2 "Docker failed to initialize. Full mode requires Docker to bypass local environment issues."
            return
        }
        Start-Simulation
    }
    "dev" {
        Stop-All
        Start-Backend
        Start-Frontend
        Start-Simulation
    }
}

Write-Host ""
Write-Host "  -----------------------------------------" -ForegroundColor DarkGray
if ($Mode -ne "stop" -and $Mode -ne "infra") {
    Write-Host "  Dashboard:  http://localhost:$FrontendPort/dashboard" -ForegroundColor White
    Write-Host "  API Docs:   http://localhost:${BackendPort}/docs" -ForegroundColor White
    Write-Host "  Stop:       .\scripts\start.ps1 -Mode stop" -ForegroundColor DarkGray
}
Write-Host "  -----------------------------------------" -ForegroundColor DarkGray
Write-Host ""
