import {useEffect, useState} from 'react';
import {AppState} from 'react-native';

import {catalogFor, subscribeCatalog} from '@/shared/utils/operatorCatalogCache';
import {usePreference} from '@/shared/hooks/usePreference';
import {
  OperatorEntry,
  iconUrl,
  splitPlmn,
} from '@/shared/utils/operatorCatalog';

/**
 * The operator's logo for a profile, from the icon catalog.
 *
 * A profile's own icon (SGP.22 tags 93/94) is preferred wherever a card
 * carries one, but most do not — a real card's profile list is a list of
 * unmarked rows, with the operator identified only by a PLMN. This resolves
 * that PLMN through the catalog described in `operatorCatalog`.
 *
 * Returns undefined until the country's catalog has been read, and whenever
 * there is no entry for the operator, so a row simply stays as it was rather
 * than reserving space for an icon that may never arrive.
 */

export function useOperatorIcon(mccMnc: string | undefined): string | undefined {
  const enabled = usePreference('operatorIcons', 'on') === 'on';
  const [uri, setUri] = useState<string>();

  useEffect(() => {
    const key = enabled ? splitPlmn(mccMnc) : null;
    if (!key) {
      setUri(undefined);
      return;
    }

    let cancelled = false;
    const update = (mcc: string, catalog: Record<string, OperatorEntry>) => {
      if (!cancelled && mcc === key.mcc) {
        const entry = catalog[key.plmn];
        setUri(entry ? iconUrl(entry) : undefined);
      }
    };
    const refresh = () => { void catalogFor(key.mcc).then(catalog => update(key.mcc, catalog)); };
    const unsubscribe = subscribeCatalog(update);
    refresh();
    const subscription = AppState.addEventListener('change', state => { if (state === 'active') refresh(); });
    return () => {
      cancelled = true;
      unsubscribe();
      subscription.remove();
    };
  }, [mccMnc, enabled]);

  return uri;
}
