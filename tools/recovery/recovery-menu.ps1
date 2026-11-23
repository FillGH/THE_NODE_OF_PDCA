param([Parameter(Mandatory = $true)][string]$EnvFile)
$ErrorActionPreference = 'Stop'
$repo = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$ops = Join-Path $repo 'src\ops.js'
if (-not (Test-Path -LiteralPath $EnvFile -PathType Leaf)) { throw 'IT environment file not found' }
$envFilePath = (Resolve-Path -LiteralPath $EnvFile).Path
$node = (Get-Command node -ErrorAction Stop).Source
Write-Host 'PDCA Recovery Operator — Offline IT Control' -ForegroundColor Cyan
Write-Host 'STOP and disable the PDCA service before ADOPT / ACTIVATE / ROLLBACK.'
$secret = Read-Host 'IT operator key (not displayed)' -AsSecureString
$ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secret)
try {
  $env:PDCA_OPERATOR_KEY = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)
} finally {
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)
}
function Invoke-Pdca([string[]]$Command) {
  & $node ('--env-file=' + $envFilePath) $ops @Command
  if ($LASTEXITCODE -ne 0) { Write-Warning ('Operation blocked/failed. Exit code: ' + $LASTEXITCODE) }
}
try {
  while ($true) {
    Write-Host ''
    Write-Host '1 Status | 2 List Backup IDs | 3 ADOPT | 4 Restore to staging | 5 Prepare candidate | 6 ACTIVATE | 7 ROLLBACK | 8 MIGRATE LEGACY COPY | 0 Exit'
    $choice = Read-Host 'Select action'
    switch ($choice) {
      '1' { Invoke-Pdca -Command @('status') }
      '2' { Invoke-Pdca -Command @('backups') }
      '3' {
        Write-Host 'ADOPT is ONLY for first-time setup. Existing live Workspace and Audit must be checked.'
        if ((Read-Host 'Type ADOPT to confirm') -ceq 'ADOPT') { Invoke-Pdca -Command @('adopt', 'ADOPT') }
      }
      '4' {
        $id = Read-Host 'Paste Snapshot ID from List Backups'
        Invoke-Pdca -Command @('restore', $id)
      }
      '5' {
        $id = Read-Host 'Paste Stage ID from Restore report'
        Invoke-Pdca -Command @('prepare', $id)
      }
      '6' {
        $id = Read-Host 'Paste PREPARED Stage ID; service must be STOPPED'
        $confirm = Read-Host 'Type ACTIVATE (exact match only) or ACTIVATE-RECOVERY (approved possible data loss)'
        if ($confirm -ceq 'ACTIVATE' -or $confirm -ceq 'ACTIVATE-RECOVERY') { Invoke-Pdca -Command @('activate', $id, $confirm) }
      }
      '7' {
        Write-Host 'ROLLBACK is blocked if there are post-cutover Audit events or other edits.'
        if ((Read-Host 'Type ROLLBACK to confirm') -ceq 'ROLLBACK') { Invoke-Pdca -Command @('rollback', 'ROLLBACK') }
      }
      '8' {
        Write-Host 'IT only: service STOPPED, pointer ABSENT, verify original Workspace/Audit and backup first.'
        if ((Read-Host 'Type MIGRATE-LEGACY to create a NEW isolated candidate copy') -ceq 'MIGRATE-LEGACY') {
          Invoke-Pdca -Command @('migrate-legacy', 'MIGRATE-LEGACY')
        }
      }
      '0' { return }
      default { Write-Warning 'Choose a valid menu option' }
    }
  }
} finally {
  Remove-Item Env:PDCA_OPERATOR_KEY -ErrorAction SilentlyContinue
}
