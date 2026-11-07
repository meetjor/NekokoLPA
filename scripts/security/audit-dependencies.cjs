// Audit the physically installed tree, including development dependencies and nested copies.
// Fail closed on unavailable advisories, unknown findings, or an unapplied local patch.
const fs = require('node:fs');
const path = require('node:path');
const {execFileSync} = require('node:child_process');
const semver = require('semver');
const {verifyDeepmerge} = require('./check-deepmerge.cjs');
const packages = new Map();
const visited = new Set();
function scan(directory) {
  if (!fs.existsSync(directory)) return;
  for (const entry of fs.readdirSync(directory, {withFileTypes: true})) {
    if (entry.name.startsWith('.')) continue;
    const dir = path.join(directory, entry.name);
    if (entry.name.startsWith('@')) {
      scan(dir);
      continue;
    }
    const manifest = path.join(dir, 'package.json');
    if (!fs.existsSync(manifest)) continue;
    const real = fs.realpathSync(dir);
    if (visited.has(real)) continue;
    visited.add(real);
    const pkg = JSON.parse(fs.readFileSync(manifest, 'utf8'));
    if (!pkg.name || !semver.valid(pkg.version)) throw Error(`Invalid package metadata: ${dir}`);
    if (!packages.has(pkg.name)) packages.set(pkg.name, new Map());
    const versions = packages.get(pkg.name);
    if (!versions.has(pkg.version)) versions.set(pkg.version, []);
    versions.get(pkg.version).push(dir);
    scan(path.join(dir, 'node_modules'));
  }
}
scan(path.resolve('node_modules'));
if (!packages.size) throw Error('No installed dependencies to audit');
const payload = Object.fromEntries(
  [...packages].map(([name, versions]) => [name, [...versions.keys()]]),
);
const response = execFileSync(
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
    'https://registry.npmjs.org/-/npm/v1/security/advisories/bulk',
  ],
  {input: JSON.stringify(payload), encoding: 'utf8', maxBuffer: 32 * 1024 * 1024},
);
const advisories = JSON.parse(response);
if (!advisories || Array.isArray(advisories) || typeof advisories !== 'object')
  throw Error('Invalid advisory response');
const findings = [];
for (const [name, entries] of Object.entries(advisories)) {
  if (!Array.isArray(entries)) throw Error(`Invalid advisories for ${name}`);
  for (const advisory of entries) {
    if (!semver.validRange(advisory.vulnerable_versions) || !advisory.url)
      throw Error(`Invalid advisory for ${name}`);
    for (const [version, locations] of packages.get(name) || []) {
      if (!semver.satisfies(version, advisory.vulnerable_versions)) continue;
      let disposition = 'unresolved';
      if (
        name === 'deepmerge' &&
        version === '4.3.1' &&
        advisory.url === 'https://github.com/advisories/GHSA-gcqx-w48m-w2h4'
      ) {
        // Narrow, time-limited exception ONLY for the reviewed and regression-tested patched bytes.
        if (Date.now() >= Date.parse('2027-02-01T00:00:00Z'))
          throw Error('Review deepmerge patch and upstream release before building');
        for (const location of locations) verifyDeepmerge(location);
        disposition = 'locally-patched';
      }
      findings.push({
        name,
        version,
        advisory: advisory.url,
        severity: advisory.severity,
        disposition,
      });
    }
  }
}
fs.mkdirSync('dist/security', {recursive: true});
const report = {
  checkedAt: new Date().toISOString(),
  source: 'npm bulk advisories',
  packageNames: packages.size,
  findings,
};
fs.writeFileSync('dist/security/npm-audit.json', JSON.stringify(report, null, 2) + '\n');
fs.writeFileSync('dist/security/npm-inventory.json', JSON.stringify(payload, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
if (findings.some(x => x.disposition === 'unresolved')) process.exitCode = 1;
