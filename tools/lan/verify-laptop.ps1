#requires -Version 5.1
[CmdletBinding()]
param(
  [Parameter(Mandatory=$true)][string]$EnvFile,
  [ValidateSet('Prepare','Running')][string]$Mode = 'Prepare',
  [string]$Caddyfile
)
$ErrorActionPreference = 'Stop'
function Stop-Check([string]$Reason) { throw ('STOP: ' + $Reason) }
if (-not (Test-Path -LiteralPath $EnvFile -PathType Leaf)) { Stop-Check 'host.env not found' }
$settings = @{}
foreach ($line in (Get-Content -LiteralPath $EnvFile)) {
  if (-not $line.Trim() -or $line.TrimStart().StartsWith('#')) { continue }
  if ($line -notmatch '^([A-Za-z_][A-Za-z0-9_]*)=(.*)$') { Stop-Check 'Unsupported host.env line format' }
  $key = $Matches[1]; $value = $Matches[2].Trim().Trim('"')
  if ($settings.ContainsKey($key)) { Stop-Check ('Duplicate key: ' + $key) }
  $settings[$key] = $value
}
foreach ($name in @('PDCA_DB','PDCA_AUDIT','PDCA_DATA_ROOT','PDCA_ACTIVE_DB_POINTER',
    'PDCA_BACKUP_DIR','PDCA_RESTORE_DIR','PDCA_OPS_LOG','PDCA_PORT',
    'PDCA_ORIGIN','PDCA_INGRESS_KEY','PDCA_IT_KEY','PDCA_PHIL_KEY')) {
  if (-not $settings.ContainsKey($name) -or -not $settings[$name]) { Stop-Check ('Missing ' + $name) }
}
$keyNames = @('PDCA_INGRESS_KEY','PDCA_IT_KEY','PDCA_PHIL_KEY')
$keyValues = @($keyNames | ForEach-Object { $settings[$_] })
if (@($keyValues | Select-Object -Unique).Count -ne 3) { Stop-Check 'Ingress/IT/Phil keys must differ' }
foreach ($value in $keyValues) {
  if ($value -cnotmatch '^[A-Za-z0-9_-]{32,}$') { Stop-Check 'Invalid secret shape (value withheld)' }
}
$origin = $null
if (-not [Uri]::TryCreate($settings['PDCA_ORIGIN'], [UriKind]::Absolute, [ref]$origin)) {
  Stop-Check 'Invalid PDCA_ORIGIN'
}
if ($origin.Scheme -ne 'https' -or $origin.UserInfo -or $origin.Query -or $origin.Fragment -or
    $origin.AbsolutePath -ne '/' -or $settings['PDCA_ORIGIN'].TrimEnd('/') -ne $origin.GetLeftPart([UriPartial]::Authority)) {
  Stop-Check 'PDCA_ORIGIN must be an exact HTTPS origin without userinfo, path or query'
}
$nodePort = 0
if (-not [int]::TryParse($settings['PDCA_PORT'], [ref]$nodePort) -or $nodePort -lt 1 -or $nodePort -gt 65535) {
  Stop-Check 'Invalid PDCA_PORT'
}
$node = Get-Command node.exe -ErrorAction SilentlyContinue
if (-not $node) { Stop-Check 'Node.js is missing; IT must install approved Node.js 24.11.0' }
$nodeVersion = (& $node.Source --version).Trim()
if ($nodeVersion -ne 'v24.11.0') { Stop-Check ('Node version not approved for this artifact: ' + $nodeVersion) }
foreach ($name in @('PDCA_DB','PDCA_AUDIT','PDCA_ACTIVE_DB_POINTER')) {
  if (-not [IO.Path]::IsPathRooted($settings[$name])) { Stop-Check ($name + ' must use an absolute path') }
}
if ($Mode -eq 'Running' -and -not (Test-Path -LiteralPath $settings['PDCA_ACTIVE_DB_POINTER'] -PathType Leaf)) {
  Stop-Check 'Managed Active DB pointer absent: IT must perform controlled ADOPT first'
}
$listeners = @(Get-NetTCPConnection -State Listen -LocalPort $nodePort -ErrorAction SilentlyContinue)
$exposed = @($listeners | Where-Object { $_.LocalAddress -ne '127.0.0.1' })
if ($exposed.Count -gt 0) { Stop-Check 'PDCA Node port is reachable beyond 127.0.0.1' }
if ($Mode -eq 'Running' -and $listeners.Count -eq 0) { Stop-Check 'PDCA backend not listening on loopback' }
if ($Caddyfile) {
  if (-not (Test-Path -LiteralPath $Caddyfile -PathType Leaf)) { Stop-Check 'Caddyfile missing' }
  $cfg = Get-Content -LiteralPath $Caddyfile -Raw
  if ($cfg -match '__[A-Z_]+__') { Stop-Check 'Caddyfile still has unresolved placeholders' }
  if ($cfg -match '(?m)^\s*basic_auth\s') { Stop-Check 'Basic Auth conflicts with app Bearer header; use IT approved mTLS' }
  if (-not $cfg.Contains($origin.Host) -or -not $cfg.Contains('client_auth')) {
    Stop-Check 'Proxy host or mTLS access control missing'
  }
}
Write-Host ('LOCAL PREFLIGHT PASS: ' + $Mode + '; Node ' + $nodeVersion +
  '; Backend port ' + $nodePort + '; HTTPS Origin ' + $origin.GetLeftPart([UriPartial]::Authority))
Write-Host 'LOCAL ONLY: NOT proof of LAN, certificate trust, firewall or access-control acceptance.'
