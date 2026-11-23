#requires -Version 5.1
[CmdletBinding()]
param(
  [Parameter(Mandatory=$true)][string]$Url,
  [ValidateSet('Allowed','Denied')][string]$Expected = 'Allowed',
  [string]$ClientCertThumbprint
)
$ErrorActionPreference = 'Stop'
$uri = $null
if (-not [Uri]::TryCreate($Url,[UriKind]::Absolute,[ref]$uri) -or $uri.Scheme -ne 'https') {
  throw 'STOP: use the IT-approved HTTPS LAN URL'
}
try {
  $dns = @(Resolve-DnsName -Name $uri.Host -Type A -ErrorAction Stop)
  if ($dns.Count -eq 0) { throw 'DNS A record missing' }
} catch { throw ('STOP: cannot verify LAN DNS: ' + $_.Exception.Message) }
$args = @{ Uri=$Url; UseBasicParsing=$true; TimeoutSec=20; ErrorAction='Stop' }
if ($ClientCertThumbprint) { $args['CertificateThumbprint'] = $ClientCertThumbprint }
$response = $null
$failure = $null
try { $response = Invoke-WebRequest @args }
catch { $failure = $_ }
if ($Expected -eq 'Denied') {
  if ($response) { throw ('FAIL: unauthorized client received HTTP ' + [int]$response.StatusCode) }
  Write-Host 'BLOCK OBSERVED, NOT VERIFIED: IT must correlate the attempted request with mTLS/proxy/firewall logs.'
  if ($failure) { Write-Host ('Client result type: ' + $failure.Exception.GetType().Name) }
  exit 2
}
if ($failure) { throw $failure }
if ([int]$response.StatusCode -ne 200) { throw ('FAIL: unexpected HTTP ' + [int]$response.StatusCode) }
Write-Host 'CLIENT HTTPS PASS: DNS resolved, trusted TLS and HTTP 200.'
Write-Host 'Next: browser login, PDCA save, second-client sync and server-side evidence.'
