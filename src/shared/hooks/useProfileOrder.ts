import {useCallback, useMemo, useSyncExternalStore} from 'react';
import {preferences} from '@/shared/storage';
import {parseProfileOrder, profileOrderKey} from '@/shared/utils/profileOrder';

export function useProfileOrder(eid: string | undefined) {
  const key = profileOrderKey(eid);
  const subscribe = useCallback((notify: () => void) => {
    const listener = preferences.addOnValueChangedListener(changed => { if (changed === key) notify(); });
    return () => listener.remove();
  }, [key]);
  const read = useCallback(() => key ? preferences.getString(key) : undefined, [key]);
  const raw = useSyncExternalStore(subscribe, read);
  return useMemo(() => ({key, order: parseProfileOrder(raw)}), [key, raw]);
}
