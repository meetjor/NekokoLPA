import {fetchAppRelease, isNewerVersion, selectAppRelease, shouldAutomaticallyCheck, AUTOMATIC_UPDATE_INTERVAL} from '../appUpdates';

const release = (version = '1.1.5') => ({
  tag_name: `v${version}-qianlesim-3sign`, draft: false, prerelease: true, published_at: '2026-11-13', body: 'Release notes',
  assets: [{name: `QianLesim-v${version}-arm64.apk`, state: 'uploaded', size: 123,
    browser_download_url: `https://github.com/meetjor/NekokoLPA/releases/download/v${version}-qianlesim-3sign/QianLesim-v${version}-arm64.apk`}],
});
const originalFetch = global.fetch;
afterEach(() => { global.fetch = originalFetch; jest.useRealTimers(); });

test('numeric version comparison handles double digits and refuses malformed values', () => {
  expect(isNewerVersion('1.1.10', '1.1.9')).toBe(true);
  expect(isNewerVersion('1.1.4', '1.1.5')).toBe(false);
  expect(isNewerVersion('1.1.5', '1.1.5')).toBe(false);
  for (const version of ['1.1.6-beta', '01.2.3', '1.2', 'Infinity.1.0', '99999999999999999999.1.0'])
    expect(isNewerVersion(version, '1.1.5')).toBe(false);
});

test('selects newest three-signer APK including this project prereleases, independent of API order', () => {
  const result = selectAppRelease([release('1.1.5'), release('1.1.10'), release('1.1.6')]);
  expect(result.version).toBe('1.1.10');
  expect(result.prerelease).toBe(true);
  expect(result.notes).toBe('Release notes');
});

test('rejects drafts, different flavours, unfinished uploads, wrong assets and hostile destinations', () => {
  const good = release();
  const bad = [
    {...good, draft: true}, {...good, published_at: null}, {...good, tag_name: 'v99.1.1-multisign'},
    {...good, assets: []}, {...good, assets: [{...good.assets[0], state: 'new'}]},
    {...good, assets: [{...good.assets[0], size: 0}]},
    {...good, assets: [{...good.assets[0], name: 'QianLesim-x86_64.apk'}]},
    {...good, assets: [{...good.assets[0], browser_download_url: 'https://github.com.evil.invalid/a.apk'}]},
    {...good, assets: [{...good.assets[0], browser_download_url: good.assets[0].browser_download_url + '?redirect=evil'}]},
  ];
  for (const item of bad) expect(() => selectAppRelease([item])).toThrow();
  expect(() => selectAppRelease({message: 'API rate limit'})).toThrow();
  expect(() => selectAppRelease([])).toThrow();
});

test('HTTP/rate limit and malformed response never count as already up to date', async () => {
  global.fetch = jest.fn().mockResolvedValue({ok: false, status: 403});
  await expect(fetchAppRelease()).rejects.toThrow();
  global.fetch = jest.fn().mockResolvedValue({ok: true, json: async () => ({})});
  await expect(fetchAppRelease()).rejects.toThrow();
});

test('network request times out and aborts instead of leaving the checking indicator forever', async () => {
  jest.useFakeTimers();
  global.fetch = jest.fn().mockImplementation((_url, options) => new Promise((_resolve, reject) => {
    options.signal.addEventListener('abort', () => reject(Error('aborted')));
  }));
  const expected = expect(fetchAppRelease()).rejects.toThrow('aborted');
  await jest.advanceTimersByTimeAsync(15000);
  await expected;
  expect(jest.getTimerCount()).toBe(0);
});

test('successful fetch uses platform HTTPS and cleans up its deadline', async () => {
  jest.useFakeTimers();
  global.fetch = jest.fn().mockResolvedValue({ok: true, json: async () => [release()]});
  expect((await fetchAppRelease()).version).toBe('1.1.5');
  expect(jest.getTimerCount()).toBe(0);
  expect((global.fetch as jest.Mock).mock.calls[0][0]).toBe('https://api.github.com/repos/meetjor/NekokoLPA/releases?per_page=100');
});

test('automatic checks are rate limited while app is alive and tolerate a corrected device clock', () => {
  expect(shouldAutomaticallyCheck(100, 0)).toBe(true);
  expect(shouldAutomaticallyCheck(1000, 900)).toBe(false);
  expect(shouldAutomaticallyCheck(AUTOMATIC_UPDATE_INTERVAL + 900, 900)).toBe(true);
  expect(shouldAutomaticallyCheck(100, 900)).toBe(true);
});
