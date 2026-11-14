import {useSyncExternalStore} from 'react';
import {AppRelease, fetchAppRelease} from '@/shared/utils/appUpdates';

type UpdateState = {status: 'idle' | 'checking' | 'ready' | 'error'; release?: AppRelease; checkedAt: number};
let state: UpdateState = {status: 'idle', checkedAt: 0};
const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
const snapshot = () => state;
function publish(next: UpdateState) { state = next; listeners.forEach(listener => listener()); }
let pending: Promise<void> | undefined;

export function checkAppUpdate(): Promise<void> {
  if (pending) return pending;
  publish({...state, status: 'checking'});
  pending = (async () => {
    try { publish({status: 'ready', release: await fetchAppRelease(), checkedAt: Date.now()}); }
    catch { publish({...state, status: 'error', checkedAt: Date.now()}); }
    finally { pending = undefined; }
  })();
  return pending;
}

export const useAppUpdate = () => useSyncExternalStore(subscribe, snapshot);
