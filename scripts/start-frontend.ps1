# Start Frontend Development Server
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $scriptDir
$frontendDir = Join-Path $projectRoot "frontend"

Set-Location $frontendDir
Write-Host "Starting Local React Frontend on http://127.0.0.1:5173 ..." -ForegroundColor Cyan
& "cmd.exe" /c "npm run dev"
