const REPOSITORY = 'https://github.com/meetjor/NekokoLPA';
export const RELEASES_API = 'https://api.github.com/repos/meetjor/NekokoLPA/releases?per_page=100';
export const RELEASES_PAGE = `${REPOSITORY}/releases`;
export const AUTOMATIC_UPDATE_INTERVAL = 24 * 60 * 60 * 1000;

export interface AppRelease {
  version: string;
  notes: string;
  downloadUrl: string;
  pageUrl: string;
  prerelease: boolean;
}

function versionParts(version: string): number[] | null {
  if (!/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(version)) return null;
  const parts = version.split('.').map(Number);
  return parts.every(Number.isSafeInteger) ? parts : null;
}

export function isNewerVersion(candidate: string, installed: string): boolean {
  const a = versionParts(candidate), b = versionParts(installed);
  if (!a || !b) return false;
  for (let i = 0; i < 3; i++) if (a[i] !== b[i]) return a[i] > b[i];
  return false;
}

const record = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

/** Ignore upstream/other flavours and incomplete releases, including during upload. */
export function selectAppRelease(value: unknown): AppRelease {
  if (!Array.isArray(value)) throw Error('Invalid release response');
  let latest: AppRelease | undefined;
  for (const item of value) {
    if (!record(item) || item.draft !== false || typeof item.tag_name !== 'string') continue;
    const match = /^v(\d+\.\d+\.\d+)-qianlesim-3sign$/.exec(item.tag_name);
    if (!match || !versionParts(match[1]) || !Array.isArray(item.assets) || !item.published_at) continue;
    const version = match[1];
    const name = `QianLesim-v${version}-arm64.apk`;
    const downloadUrl = `${REPOSITORY}/releases/download/${item.tag_name}/${name}`;
    const apk = item.assets.find(asset => record(asset) && asset.name === name &&
      asset.state === 'uploaded' && typeof asset.size === 'number' && asset.size > 0 &&
      asset.browser_download_url === downloadUrl);
    if (!apk) continue;
    if (!latest || isNewerVersion(version, latest.version)) {
      latest = {version, downloadUrl, pageUrl: `${REPOSITORY}/releases/tag/${item.tag_name}`,
        notes: typeof item.body === 'string' ? item.body.slice(0, 12000) : '', prerelease: item.prerelease === true};
    }
  }
  if (!latest) throw Error('No compatible published APK');
  return latest;
}

export async function fetchAppRelease(): Promise<AppRelease> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    // Normal platform HTTPS validation; never the RSP compatibility trust path.
    const response = await fetch(RELEASES_API, {signal: controller.signal,
      headers: {Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28'}});
    if (!response.ok) throw Error('Update check failed');
    return selectAppRelease(await response.json());
  } finally { clearTimeout(timeout); }
}

export function shouldAutomaticallyCheck(now: number, checkedAt: number): boolean {
  return checkedAt === 0 || now < checkedAt || now - checkedAt >= AUTOMATIC_UPDATE_INTERVAL;
}
