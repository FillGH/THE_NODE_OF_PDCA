#requires -Version 5.1
[CmdletBinding()]
param(
  [Parameter(Mandatory=$true)][string]$EnvFile,
  [Parameter(Mandatory=$true)][string]$CaddyExe,
  [Parameter(Mandatory=$true)][string]$Caddyfile
)
$ErrorActionPreference = 'Stop'
if (-not (Test-Path -LiteralPath $EnvFile -PathType Leaf)) { throw 'STOP: IT host.env missing' }
if (-not (Test-Path -LiteralPath $CaddyExe -PathType Leaf)) { throw 'STOP: IT-approved Caddy executable missing' }
if (-not (Test-Path -LiteralPath $Caddyfile -PathType Leaf)) { throw 'STOP: IT Caddyfile missing' }
$configText = Get-Content -LiteralPath $Caddyfile -Raw
if ($configText -match '__[A-Z_]+__') { throw 'STOP: unresolved Caddyfile placeholders' }
$matchesInFile = @(Get-Content -LiteralPath $EnvFile |
  Where-Object { $_ -match '^PDCA_INGRESS_KEY=([A-Za-z0-9_-]{32,})\s*$' })
if ($matchesInFile.Count -ne 1) { throw 'STOP: exactly one valid PDCA_INGRESS_KEY required in IT host.env' }
$ingress = $matchesInFile[0].Substring('PDCA_INGRESS_KEY='.Length).Trim()
try {
  # Child Caddy process receives ONLY this secret from host.env, without CLI arguments.
  $env:PDCA_INGRESS_KEY = $ingress
  $ingress = $null
  & $CaddyExe validate --config $Caddyfile --adapter caddyfile
  if ($LASTEXITCODE -ne 0) { throw 'STOP: Caddyfile validation failed' }
  Write-Host 'Caddy configuration validated. HTTPS LAN endpoint is starting (IT approval required).'
  & $CaddyExe run --config $Caddyfile --adapter caddyfile
  if ($LASTEXITCODE -ne 0) { throw 'Proxy terminated with nonzero exit' }
} finally {
  Remove-Item Env:PDCA_INGRESS_KEY -ErrorAction SilentlyContinue
}
