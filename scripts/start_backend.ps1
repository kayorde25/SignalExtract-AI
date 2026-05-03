$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$backendPath = Join-Path $repoRoot 'backend'

Push-Location $backendPath
try {
  if (-not (Test-Path '.\\.venv')) {
    python -m venv .venv
  }

  if (Test-Path '.\\.venv\\Scripts\\Activate.ps1') {
    . .\\.venv\\Scripts\\Activate.ps1
  }

  pip install -r requirements.txt
  python -m uvicorn app.main:app --reload --port 8000
}
finally {
  Pop-Location
}
