const fs = require('node:fs');
const {execFileSync} = require('node:child_process');
const inventory = JSON.parse(fs.readFileSync('dist/security/maven-inventory.json', 'utf8'));
if (!Array.isArray(inventory) || !inventory.length) throw Error('Empty native inventory');
const findings = [];
for (let offset = 0; offset < inventory.length; offset += 100) {
  const batch = inventory.slice(offset, offset + 100);
  const queries = batch.map(p => ({
    package: {name: p.name, ecosystem: 'Maven'},
    version: p.version,
  }));
  const result = JSON.parse(
    execFileSync(
      'curl',
      [
        '--fail',
        '--silent',
        '--show-error',
        '--max-time',
        '120',
        '--retry',
        '2',
        '-H',
        'Content-Type: application/json',
        '--data-binary',
        '@-',
        'https://api.osv.dev/v1/querybatch',
      ],
      {input: JSON.stringify({queries}), encoding: 'utf8'},
    ),
  );
  if (!Array.isArray(result.results) || result.results.length !== batch.length)
    throw Error('Invalid OSV response');
  result.results.forEach((item, i) => {
    // Pagination is never interpreted as an empty/successful audit.
    if (item.next_page_token) throw Error('OSV pagination requires review');
    for (const vuln of item.vulns || []) findings.push({...batch[i], id: vuln.id});
  });
}
const report = {
  checkedAt: new Date().toISOString(),
  source: 'OSV Maven',
  packages: inventory.length,
  findings,
};
fs.writeFileSync('dist/security/maven-audit.json', JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
if (findings.length) process.exitCode = 1;
