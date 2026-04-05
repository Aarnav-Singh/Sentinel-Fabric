<#
.SYNOPSIS
    UMBRIX - Start All Components

.DESCRIPTION
    Starts the complete UMBRIX stack in one command:
      1. Docker infrastructure (ClickHouse / Redis / PostgreSQL / Kafka / Qdrant)
      2. FastAPI backend (auto-fallbacks to in-memory if Docker unavailable)
      3. Next.js frontend
      4. Event simulation (optional)

    SMART START: Each component is health-checked before launch. If a component
    is already running and healthy, it is skipped - no unnecessary restarts.

.PARAMETER Mode
    full  - Docker + Backend + Frontend + Simulation (default)
    dev   - Backend (in-memory) + Frontend + Simulation (no Docker)
    infra - Docker infrastructure only
    stop  - Stop everything

.PARAMETER SimInterval
    Seconds between simulated events (default: 3). Set to 0 to skip simulation.

.PARAMETER Force
    Force restart all components even if they are already running.

.EXAMPLE
    .\start.ps1                    # Dev mode (no Docker)
    .\start.ps1 -Mode full         # Full stack with Docker
    .\start.ps1 -Mode stop         # Stop everything
    .\start.ps1 -SimInterval 0     # No simulation
    .\start.ps1 -Force             # Force restart everything
#>

param(
    [ValidateSet('full', 'dev', 'infra', 'stop')]
    [string]$Mode = 'dev',

    [int]$SimInterval = 3,
    [int]$BackendPort = 8001,
    [int]$FrontendPort = 3000,
    [switch]$Force,
    [switch]$ResetDocker
)

$ErrorActionPreference = 'Continue'
$ROOT = Split-Path -Parent $PSScriptRoot
if (-not $ROOT) { $ROOT = (Get-Location).Path }
$BACKEND = Join-Path $ROOT 'backend'
$FRONTEND = Join-Path $ROOT 'frontend'
$INFRA = Join-Path $ROOT 'infra'

# -- Helpers --
function Write-Status($msg) { Write-Host "  > $msg" -ForegroundColor Cyan }
function Write-Ok($msg)     { Write-Host "  + $msg" -ForegroundColor Green }
function Write-Skip($msg)   { Write-Host "  ~ $msg" -ForegroundColor DarkGreen }
function Write-Warn2($msg)  { Write-Host "  ! $msg" -ForegroundColor Yellow }
function Write-Err2($msg)   { Write-Host "  x $msg" -ForegroundColor Red }

function Reset-DockerState {
    Write-Status 'Performing deep reset of Docker and WSL state...'
    
    # Kill all docker processes
    Write-Status 'Terminating Docker Desktop and related processes...'
    $dockerProcs = Get-Process -Name "*docker*", "vpnkit", "hyper-v" -ErrorAction SilentlyContinue
    if ($dockerProcs) {
        $dockerProcs | Stop-Process -Force -ErrorAction SilentlyContinue
    }
    
    # Shutdown WSL
    Write-Status 'Shutting down WSL virtualization layer...'
    wsl --shutdown
    
    Start-Sleep -Seconds 2
    Write-Ok 'Docker and WSL state cleared. You can now try starting again.'
}

function Show-Banner {
    Write-Host ''
    Write-Host '  =====================================' -ForegroundColor DarkCyan
    Write-Host '    UMBRIX                             ' -ForegroundColor DarkCyan
    Write-Host '    Security Posture Intelligence      ' -ForegroundColor DarkCyan
    Write-Host '  =====================================' -ForegroundColor DarkCyan
    Write-Host ''
}

# -- Main --
Show-Banner

if ($ResetDocker) {
    Reset-DockerState
    if ($Mode -eq 'dev') { return }
}

# -- Health check helpers --

function Test-PortListening([int]$port) {
    $conn = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
    return ($null -ne $conn -and $conn.Count -gt 0)
}

function Test-BackendHealthy([int]$port) {
    try {
        $uri = 'http://localhost:' + $port + '/api/v1/health'
        $response = Invoke-WebRequest -Uri $uri -UseBasicParsing -Method GET -TimeoutSec 3 -ErrorAction Stop
        return ($response.StatusCode -eq 200)
    }
    catch {
        return $false
    }
}

function Test-FrontendHealthy([int]$port) {
    try {
        $uri = 'http://localhost:' + $port
        $response = Invoke-WebRequest -Uri $uri -Method HEAD -TimeoutSec 3 -UseBasicParsing -ErrorAction Stop
        return ($response.StatusCode -eq 200)
    }
    catch {
        return $false
    }
}

function Test-SimulationRunning([int]$bPort) {
    try {
        $uri = 'http://localhost:' + $bPort + '/api/v1/simulate/status'
        $response = Invoke-RestMethod -Uri $uri -Method GET -TimeoutSec 3 -ErrorAction Stop
        return ($response.running -eq $true)
    }
    catch {
        return $false
    }
}

function Test-DockerContainersRunning {
    $composeFile = Join-Path $INFRA 'docker-compose.yml'
    if (-not (Test-Path $composeFile)) { return $false }

    try {
        Push-Location $INFRA
        $output = docker compose ps --status running --format '{{.Name}}' 2>$null
        Pop-Location
        if ($null -eq $output -or $output.Count -eq 0) { return $false }
        $count = @($output).Count
        return ($count -ge 2)
    }
    catch {
        Pop-Location -ErrorAction SilentlyContinue
        return $false
    }
}

function Test-ProdContainersRunning {
    $prodCompose = Join-Path $ROOT 'docker-compose.prod.yml'
    if (-not (Test-Path $prodCompose)) { return $false }

    try {
        Push-Location $ROOT
        $output = docker compose -f docker-compose.prod.yml ps --status running --format '{{.Name}}' 2>$null
        Pop-Location
        if ($null -eq $output -or $output.Count -eq 0) { return $false }
        $count = @($output).Count
        return ($count -ge 2)
    }
    catch {
        Pop-Location -ErrorAction SilentlyContinue
        return $false
    }
}

# -- Kill port --
function Stop-Port([int]$port) {
    Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue |
    ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }
}

# -- Stop Everything --
function Stop-All {
    Write-Status 'Stopping all UMBRIX components...'

    try {
        $uri = 'http://localhost:' + $BackendPort + '/api/v1/simulate/stop'
        Invoke-RestMethod -Uri $uri -Method POST -ErrorAction SilentlyContinue | Out-Null
    }
    catch {}

    Stop-Port $FrontendPort
    Stop-Port $BackendPort

    $infraCompose = Join-Path $INFRA 'docker-compose.yml'
    if (Test-Path $infraCompose) {
        Push-Location $INFRA
        docker compose down 2>$null
        Pop-Location
    }

    $prodCompose = Join-Path $ROOT 'docker-compose.prod.yml'
    if (Test-Path $prodCompose) {
        Push-Location $ROOT
        docker compose -f docker-compose.prod.yml down 2>$null
        Pop-Location
    }

    Start-Sleep -Seconds 2
    Write-Ok 'All components stopped.'
}

# -- Ensure .env files exist --
function Initialize-EnvironmentVariables {
    $rootEnv = Join-Path $ROOT '.env'
    if (-not (Test-Path $rootEnv)) {
        $template = Join-Path $ROOT '.env.prod.example'
        if (Test-Path $template) {
            Write-Status 'Generating root .env from template...'
            Copy-Item $template $rootEnv
        }
    }
    else {
        Write-Skip 'Root .env already exists'
    }

    $backendEnv = Join-Path $BACKEND '.env'
    if (-not (Test-Path $backendEnv)) {
        $template = Join-Path $BACKEND '.env.example'
        if (Test-Path $template) {
            Write-Status 'Generating backend .env from template...'
            Copy-Item $template $backendEnv
        }
    }
    else {
        Write-Skip 'Backend .env already exists'
    }
}

# -- Start Docker --
function Start-Infra {
    Write-Status 'Checking Docker infrastructure...'

    if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
        Write-Warn2 'Docker not found. Backend will use in-memory fallbacks.'
        return $false
    }

    Initialize-EnvironmentVariables

    $composeFile = Join-Path $INFRA 'docker-compose.yml'
    if (-not (Test-Path $composeFile)) {
        Write-Warn2 "docker-compose.yml not found in $INFRA. Backend will use in-memory fallbacks."
        return $false
    }

    # Check if Docker daemon is running
    docker info 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Write-Skip 'Docker daemon already running.'
    }
    else {
        Write-Warn2 'Docker daemon is not running.'
        $dockerPath = 'C:\Program Files\Docker\Docker\Docker Desktop.exe'
        if (-not (Test-Path $dockerPath)) {
            Write-Warn2 'Could not find Docker Desktop to start it. Backend will use in-memory fallbacks.'
            return $false
        }

        # Avoid launching Docker Desktop if it is already starting
        $ddProcess = Get-Process -Name 'Docker Desktop' -ErrorAction SilentlyContinue
        if ($null -eq $ddProcess) {
            Write-Status 'Launching Docker Desktop...'
            Start-Process -FilePath $dockerPath
        }
        else {
            Write-Status 'Docker Desktop process already running. Waiting for daemon...'
        }

        Write-Status 'Waiting for Docker daemon to initialize (up to 90s)...'
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
            Write-Warn2 'Docker daemon did not start in time. Backend will use in-memory fallbacks.'
            return $false
        }
        Write-Ok 'Docker daemon is now running.'
    }

    # Check if containers are already running and healthy
    if (-not $Force -and (Test-DockerContainersRunning)) {
        Write-Skip 'Docker infrastructure containers already running - skipping.'
        return $true
    }

    Write-Status 'Starting Docker infrastructure containers...'
    Push-Location $INFRA
    docker compose up -d 2>&1 | Out-Null
    $code = $LASTEXITCODE
    Pop-Location

    if ($code -eq 0) {
        Write-Ok 'Docker infrastructure started.'
        return $true
    }
    else {
        Write-Warn2 'Docker failed to start containers. Backend will use in-memory fallbacks.'
        return $false
    }
}

# -- Start Backend --
function Start-Backend {
    Write-Status "Checking FastAPI backend on port $BackendPort..."

    # Check if backend is already running and healthy
    if (-not $Force -and (Test-BackendHealthy $BackendPort)) {
        Write-Skip "Backend already running and healthy at http://localhost:$BackendPort - skipping."
        return
    }

    $venvPython = Join-Path $BACKEND 'venv\Scripts\python.exe'
    if (-not (Test-Path $venvPython)) {
        Write-Err2 "Python venv not found at $venvPython"
        Write-Err2 'Run:  cd backend; python -m venv venv; .\venv\Scripts\pip install -e .[dev]'
        return
    }

    # Kill existing unhealthy process on the port if occupied
    if (Test-PortListening $BackendPort) {
        Write-Status "Backend port $BackendPort is occupied but unhealthy - restarting..."
        Stop-Port $BackendPort
        Start-Sleep -Seconds 2
    }

    $logFile = Join-Path $ROOT 'backend_startup.log'
    $proc = Start-Process -FilePath $venvPython `
        -ArgumentList @('-m', 'uvicorn', 'app.main:app', '--host', '0.0.0.0', '--port', "$BackendPort") `
        -WorkingDirectory $BACKEND `
        -WindowStyle Hidden `
        -RedirectStandardError $logFile `
        -PassThru

    Write-Status 'Waiting for backend to load ML models...'
    Start-Sleep -Seconds 8

    $ready = $false
    $healthUri = 'http://localhost:' + $BackendPort + '/api/v1/health'
    for ($i = 0; $i -lt 60; $i++) {
        if ($proc.HasExited) {
            Write-Err2 "Backend process exited prematurely (exit code: $($proc.ExitCode))."
            if (Test-Path $logFile) {
                Write-Err2 'Last 5 lines of backend_startup.log:'
                Get-Content $logFile -Tail 5 | ForEach-Object { Write-Err2 "  $_" }
            }
            return
        }
        Start-Sleep -Seconds 1
        try {
            Invoke-WebRequest -Uri $healthUri -UseBasicParsing -Method GET -TimeoutSec 3 -ErrorAction Stop | Out-Null
            $ready = $true
            break
        }
        catch {}
    }

    if ($ready) {
        Write-Ok "Backend ready at http://localhost:$BackendPort (PID: $($proc.Id))"
    }
    else {
        Write-Warn2 'Backend started but health check timed out after 60s.'
        if (Test-Path $logFile) {
            Write-Warn2 'Check backend_startup.log for details.'
        }
    }
}

# -- Start Frontend --
function Start-Frontend {
    Write-Status "Checking Next.js frontend on port $FrontendPort..."

    # Check if frontend is already running and healthy
    if (-not $Force -and (Test-FrontendHealthy $FrontendPort)) {
        Write-Skip "Frontend already running and healthy at http://localhost:$FrontendPort - skipping."
        return
    }

    # Write .env.local only if content has changed
    $line1 = '# Auto-generated by start.ps1'
    $line2 = 'BACKEND_API_URL=http://localhost:' + $BackendPort
    $line3 = 'BACKEND_API_KEY=CHANGE-ME-IN-PRODUCTION'
    $line4 = 'NEXT_PUBLIC_APP_URL=http://localhost:' + $FrontendPort
    $envContent = $line1 + "`n" + $line2 + "`n" + $line3 + "`n" + $line4

    $envFile = Join-Path $FRONTEND '.env.local'
    $needsUpdate = $true
    if (Test-Path $envFile) {
        $existingRaw = Get-Content $envFile -Raw -ErrorAction SilentlyContinue
        if ($null -ne $existingRaw) {
            $existingNorm = $existingRaw -replace "`r", ''
            $newNorm = $envContent -replace "`r", ''
            if ($existingNorm.Trim() -eq $newNorm.Trim()) {
                $needsUpdate = $false
            }
        }
    }

    if ($needsUpdate) {
        Set-Content -Path $envFile -Value $envContent -Encoding UTF8
        Write-Status 'Updated frontend .env.local'
    }
    else {
        Write-Skip 'Frontend .env.local already up to date'
    }

    # Kill existing unhealthy process on the port if occupied
    if (Test-PortListening $FrontendPort) {
        Write-Status "Frontend port $FrontendPort is occupied but unhealthy - restarting..."
        Stop-Port $FrontendPort
        Start-Sleep -Seconds 1
    }

    Start-Process -FilePath 'cmd.exe' `
        -ArgumentList "/c cd /d `"$FRONTEND`" & npm run dev" `
        -WindowStyle Hidden

    $ready = $false
    $frontUri = 'http://localhost:' + $FrontendPort
    for ($i = 0; $i -lt 20; $i++) {
        Start-Sleep -Seconds 1
        try {
            Invoke-WebRequest -Uri $frontUri -Method HEAD -TimeoutSec 2 -UseBasicParsing -ErrorAction Stop | Out-Null
            $ready = $true
            break
        }
        catch {}
    }

    if ($ready) {
        Write-Ok "Frontend ready at http://localhost:$FrontendPort"
    }
    else {
        Write-Warn2 'Frontend started but health check timed out.'
    }
}

# -- Start Simulation --
function Start-Simulation {
    if ($SimInterval -le 0) {
        Write-Warn2 'Simulation skipped (interval=0)'
        return
    }

    # Check if simulation is already running
    if (-not $Force -and (Test-SimulationRunning $BackendPort)) {
        Write-Skip 'Event simulation already running - skipping.'
        return
    }

    Write-Status "Starting event simulation -- 1 event every ${SimInterval}s..."

    $burstOk = $false
    $burstUri = 'http://localhost:' + $BackendPort + '/api/v1/simulate/burst?count=10'
    for ($attempt = 1; $attempt -le 3; $attempt++) {
        try {
            $r = Invoke-RestMethod -Uri $burstUri -Method POST -TimeoutSec 15
            Write-Ok "Seeded $($r.events_processed) initial events"
            $burstOk = $true
            break
        }
        catch {
            if ($attempt -lt 3) {
                Write-Status "Burst attempt $attempt failed, retrying in 5s..."
                Start-Sleep -Seconds 5
            }
        }
    }

    if (-not $burstOk) {
        Write-Warn2 'Initial burst failed after 3 attempts. Backend may not be ready.'
        return
    }

    try {
        $startUri = 'http://localhost:' + $BackendPort + '/api/v1/simulate/start?interval=' + $SimInterval
        Invoke-RestMethod -Uri $startUri -Method POST -TimeoutSec 5 | Out-Null
        Write-Ok 'Continuous simulation running'
    }
    catch {
        Write-Warn2 'Continuous simulation failed to start.'
    }
}

# -- Main --
Show-Banner

if ($Force) {
    Write-Warn2 'Force mode: all components will be restarted regardless of current state.'
}

switch ($Mode) {
    'stop' {
        Stop-All
    }
    'infra' {
        Start-Infra | Out-Null
    }
    'full' {
        Write-Status 'Checking full production stack...'

        # -- Step 1: Verify Docker CLI exists --
        if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
            Write-Err2 'Docker not found. Full mode requires Docker.'
            return
        }

        # -- Step 2: Check if Docker daemon is already running --
        docker info 2>&1 | Out-Null
        if ($LASTEXITCODE -eq 0) {
            Write-Skip 'Docker daemon already running - no restart needed.'
        }
        else {
            Write-Status 'Docker daemon not running. Attempting to start Docker Desktop...'
            $dockerPath = 'C:\Program Files\Docker\Docker\Docker Desktop.exe'
            if (-not (Test-Path $dockerPath)) {
                Write-Err2 'Docker Desktop not found. Cannot start Docker daemon.'
                return
            }

            # Check if Docker Desktop process is already launching
            $ddProcess = Get-Process -Name 'Docker Desktop' -ErrorAction SilentlyContinue
            if ($null -eq $ddProcess) {
                Start-Process -FilePath $dockerPath
                Write-Status 'Docker Desktop launched. Waiting for daemon (up to 90s)...'
            }
            else {
                Write-Status 'Docker Desktop process found. Waiting for daemon to be ready (up to 90s)...'
            }

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
                Write-Err2 'Docker daemon failed to start in 90s. This often happens if the WSL backend is hung.'
                Write-Warn2 'Try running: .\scripts\start.ps1 -ResetDocker'
                return
            }
            Write-Ok 'Docker daemon is now running.'
        }

        Initialize-EnvironmentVariables

        # -- Step 3: Check if production containers are already running --
        if (-not $Force -and (Test-ProdContainersRunning)) {
            Write-Skip 'Production containers already running - skipping rebuild.'
        }
        else {
            if ($Force) {
                Write-Status 'Force-stopping existing containers...'
                Push-Location $ROOT
                docker compose -f docker-compose.prod.yml down 2>$null
                Pop-Location
                Start-Sleep -Seconds 2
            }

            # Check if images already exist to decide --build flag
            $existingImages = docker images --format '{{.Repository}}' 2>$null | Select-String 'umbrix-'
            if ($Force -or $null -eq $existingImages -or $existingImages.Count -eq 0) {
                Write-Status 'Building and starting production containers (may take several minutes on first run)...'
                Push-Location $ROOT
                docker compose -f docker-compose.prod.yml up -d --build
                $code = $LASTEXITCODE
                Pop-Location
            }
            else {
                Write-Status 'Images already built. Starting production containers...'
                Push-Location $ROOT
                docker compose -f docker-compose.prod.yml up -d
                $code = $LASTEXITCODE
                Pop-Location
            }

            if ($code -eq 0) {
                Write-Ok 'Production stack started successfully.'
            }
            else {
                Write-Warn2 "Some containers may have failed. Check 'docker ps -a' for details."
            }

        }

        # -- Step 4: Final health check before simulation --
        $BackendPort = 8000
        Write-Status "Waiting for API on port $BackendPort to be healthy..."
        $backendReady = $false
        for ($i = 0; $i -lt 30; $i++) {
            if (Test-BackendHealthy $BackendPort) {
                $backendReady = $true
                break
            }
            Start-Sleep -Seconds 2
        }

        if ($backendReady) {
            Write-Ok 'API is healthy and ready for simulation.'
            Start-Simulation
        }
        else {
            Write-Err2 'API failed to become healthy in time. Simulation skipped.'
        }
    }
    'dev' {
        # Smart start: only restart what is not already running
        if ($Force) {
            Stop-All
        }
        Initialize-EnvironmentVariables
        Start-Backend
        Start-Frontend
        Start-Simulation
    }
}

Write-Host ''
Write-Host '  -----------------------------------------' -ForegroundColor DarkGray
if ($Mode -ne 'stop' -and $Mode -ne 'infra') {
    Write-Host "  Dashboard:  http://localhost:$FrontendPort/dashboard" -ForegroundColor White
    Write-Host "  API Docs:   http://localhost:${BackendPort}/docs" -ForegroundColor White
    Write-Host '  Stop:       .\scripts\start.ps1 -Mode stop' -ForegroundColor DarkGray
}
Write-Host '  -----------------------------------------' -ForegroundColor DarkGray
Write-Host ''
