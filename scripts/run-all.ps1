# Launch both backend and frontend in separate local windows
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendScript = Join-Path $scriptDir "start-backend.ps1"
$frontendScript = Join-Path $scriptDir "start-frontend.ps1"

Write-Host "Launching Local-Only AI Facebook Page Management System..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-File", "`"$backendScript`""
Start-Process powershell -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-File", "`"$frontendScript`""

Write-Host "Both servers launched." -ForegroundColor Cyan
Write-Host "Backend API:  http://127.0.0.1:8000 (Docs: http://127.0.0.1:8000/docs)" -ForegroundColor Yellow
Write-Host "Frontend App: http://127.0.0.1:5173" -ForegroundColor Yellow
