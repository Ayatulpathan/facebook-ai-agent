# Start Backend Server
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $scriptDir
$backendDir = Join-Path $projectRoot "backend"

Set-Location $backendDir
Write-Host "Starting Local FastAPI Backend on http://127.0.0.1:8000 ..." -ForegroundColor Cyan
& ".\venv\Scripts\python.exe" -m app.main
