const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

function verifyDeepmerge(root) {
  const expected = require('../../docs/security/deepmerge-patch.json');
  for (const [file, digest] of Object.entries(expected.files)) {
    const actual = crypto
      .createHash('sha256')
      .update(fs.readFileSync(path.join(root, file)))
      .digest('hex');
    assert.equal(actual, digest, `Unreviewed deepmerge file: ${file}`);
  }
  for (const file of ['dist/cjs.js', 'dist/umd.js']) {
    const merge = require(path.resolve(root, file));
    const poisoned = JSON.parse('{"__proto__":{"polluted":"yes"}}');
    for (const result of [
      merge(poisoned, {}),
      merge(Object.create(null), poisoned),
      merge({}, {nested: poisoned}).nested,
      merge.all([poisoned, {}]),
    ]) {
      assert.equal(result.polluted, undefined);
      assert.equal(Object.getPrototypeOf(result), Object.prototype);
    }
    assert.deepEqual(merge({a: {x: 1}, b: [1]}, {a: {y: 2}, b: [2]}), {a: {x: 1, y: 2}, b: [1, 2]});
    assert.equal({}.polluted, undefined);
  }
}
module.exports = {verifyDeepmerge};
if (require.main === module) {
  verifyDeepmerge(path.dirname(require.resolve('deepmerge/package.json')));
  console.log('deepmerge patch integrity and prototype regressions passed');
}
