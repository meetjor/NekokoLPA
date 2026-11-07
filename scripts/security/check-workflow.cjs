const fs = require('node:fs');
const assert = require('node:assert/strict');
const workflow = fs.readFileSync('.github/workflows/qianlesim-release.yml', 'utf8');
const pins = require('../../docs/security/actions-pins.json');
for (const [, action, sha] of workflow.matchAll(/uses:\s+([^@\s]+)@([^\s]+)/g)) {
  assert.match(sha, /^[a-f0-9]{40}$/, `Unpinned action: ${action}`);
  const repo = action.split('/').slice(0, 2).join('/');
  assert.equal(pins.find(p => p.repo === repo)?.sha, sha, `Unreviewed action: ${action}`);
}
console.log('Release Actions pins match reviewed commit SHAs');
