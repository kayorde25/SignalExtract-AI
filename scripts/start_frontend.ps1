$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$frontendPath = Join-Path $repoRoot 'frontend'

Push-Location $frontendPath
try {
  if (-not (Test-Path '.\\.venv')) {
    python -m venv .venv
  }

  if (Test-Path '.\\.venv\\Scripts\\Activate.ps1') {
    . .\\.venv\\Scripts\\Activate.ps1
  }

  pip install -r requirements.txt
  python -m streamlit run streamlit_app.py --server.port 8501
}
finally {
  Pop-Location
}
