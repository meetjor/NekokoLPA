import type {ProfileMetadataMap} from '@/lpa/types/profile';
import {parseMetadataOnly} from './parser';
import {maskProfileText, type RedactMode} from './redact';

/** Match list privacy: strict mode displays the provider, never a personal nickname. */
export function profileOrderLabel(profile: ProfileMetadataMap, mode: RedactMode, fallback: string): string {
  const name = mode === 'hard' || mode === 'block'
    ? profile.serviceProviderName || fallback
    : parseMetadataOnly(profile).name || profile.serviceProviderName || fallback;
  return maskProfileText(name, mode);
}

/** Presentation only: never change the Redux/card profile array or write APDUs. */
export function profileOrderKey(eid: string | undefined): string | null {
  return eid && /^\d{32}$/.test(eid) ? `profile-order.v1.${eid}` : null;
}

export function parseProfileOrder(value: string | undefined): string[] {
  try {
    const parsed: unknown = JSON.parse(value || '[]');
    return Array.isArray(parsed)
      ? [...new Set(parsed.filter((id): id is string => typeof id === 'string' && id.length > 0))]
      : [];
  } catch {
    return [];
  }
}

export function orderProfiles<T extends {iccid: string}>(profiles: readonly T[], order: readonly string[]): T[] {
  const remaining = new Map(profiles.map(profile => [profile.iccid, profile]));
  const result: T[] = [];
  for (const id of order) {
    const profile = remaining.get(id);
    if (profile) {
      result.push(profile);
      remaining.delete(id);
    }
  }
  return [...result, ...remaining.values()];
}

export function moveProfile(order: readonly string[], id: string, direction: -1 | 1): string[] {
  const next = [...order];
  const from = next.indexOf(id);
  const to = from + direction;
  if (from >= 0 && to >= 0 && to < next.length) [next[from], next[to]] = [next[to], next[from]];
  return next;
}
