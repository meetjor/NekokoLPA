const {X509Certificate} = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const roots = require('../../docs/security/rsp-roots.json');
const now = Date.now();
const days = 86400000;
for (const root of roots) {
  const cert = new X509Certificate(
    fs.readFileSync(path.join('android/app/src/main/resources/rsp', root.file)),
  );
  assert.equal(
    cert.fingerprint256.replaceAll(':', '').toLowerCase(),
    root.sha256,
    `Unexpected root: ${root.file}`,
  );
  assert.equal(new Date(cert.validTo).toISOString(), root.notAfter, `Expiry changed: ${root.file}`);
  assert.ok(cert.ca && cert.verify(cert.publicKey), `Not a self-signed CA: ${root.file}`);
  assert.ok(Date.parse(cert.validFrom) <= now, `Not yet valid: ${root.file}`);
  const remaining = Math.floor((Date.parse(cert.validTo) - now) / days);
  assert.ok(
    remaining > 90,
    `${root.file} expires within 90 days (${root.notAfter}); review a trusted replacement or deliberately retire this root`,
  );
  console.log(`${root.file}: fingerprint verified; ${remaining} days remaining (${root.notAfter})`);
  if (remaining <= 180)
    console.warn(`::warning::${root.file} expires within 180 days. See docs/security/rsp-tls.md`);
}
