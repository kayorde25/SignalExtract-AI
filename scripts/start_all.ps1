$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot

$backendScript = Join-Path $repoRoot 'scripts\start_backend.ps1'
$frontendScript = Join-Path $repoRoot 'scripts\start_frontend.ps1'

Start-Process powershell -ArgumentList @(
  '-NoExit',
  '-ExecutionPolicy',
  'Bypass',
  '-File',
  $backendScript
)

Start-Process powershell -ArgumentList @(
  '-NoExit',
  '-ExecutionPolicy',
  'Bypass',
  '-File',
  $frontendScript
)
