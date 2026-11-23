import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const read = p => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
test('LAN-01 laptop proxy template mandates HTTPS client certificate authorization', () => {
  const s = read('tools/lan/Caddyfile.laptop.template');
  assert.match(s, /https:\/\/__PDCA_FQDN__:443/);
  assert.match(s, /client_auth\s*\{/);
  assert.match(s, /mode require_and_verify/);
  assert.match(s, /trust_pool file __CLIENT_CA_PEM__/);
  assert.match(s, /admin off/);
  assert.match(s, /auto_https off/);
  assert.doesNotMatch(s, /^\s*basic_auth/m);
});
test('LAN-02 proxy preserves PDCA Bearer sessions, strips privileged header and overwrites ingress', () => {
  const s = read('tools/lan/Caddyfile.laptop.template');
  assert.match(s, /header_up Host \{host\}/);
  assert.match(s, /header_up -X-Pdca-Operator-Key/);
  assert.match(s, /header_up X-Pdca-Ingress-Key \{\$PDCA_INGRESS_KEY\}/);
  assert.doesNotMatch(s, /header_up -Authorization/);
  assert.match(s, /reverse_proxy 127\.0\.0\.1:__PDCA_PORT__/);
});
test('LAN-03 Windows scripts do not rewrite firewall, bind backend externally, or disable TLS', () => {
  for (const p of ['tools/lan/verify-laptop.ps1','tools/lan/start-proxy.ps1','tools/lan/verify-client.ps1']) {
    const s = read(p);
    assert.doesNotMatch(s, /New-NetFirewallRule|Set-NetFirewallRule|netsh\s+advfirewall|SkipCertificateCheck/);
    assert.match(s, /STOP:|Stop-Check|throw/);
  }
});
test('LAN-04 acceptance documentation keeps IT approval and Factory verification separate', () => {
  const s = read('deployment/LAPTOP_HOST_LAN_TEST.md');
  assert.match(s, /NO-GO/);
  assert.match(s, /V-01/);
  assert.match(s, /V-02/);
  assert.match(s, /V-05/);
  assert.match(s, /F-07/);
  assert.match(s, /127\.0\.0\.1/);
  assert.match(s, /Bearer/);
});
