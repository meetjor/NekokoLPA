import type {Adapter} from '@/lpa/adapters/Adapter';
import {preferences} from '@/shared/storage';
import {isSimplifiedMode} from '@/shared/config/features';
import {Alert} from 'react-native';
import i18n from '@/i18n';

export function isDisableProtected(type: string, setting: string | undefined, simplified: boolean): boolean {
  return type === 'omapi' && (simplified || setting !== 'off');
}

/** Shared by the list and detail page; never blocks enabling another profile. */
export async function toggleProfile(adapter: Adapter, iccid: string, enabled: boolean): Promise<void> {
  if (enabled && isDisableProtected(adapter.device.type, preferences.getString('disableProtection'), isSimplifiedMode())) {
    Alert.alert(i18n.t('main:ui_disable_protected_title'), i18n.t('main:ui_disable_protected'));
    return;
  }
  if (enabled) await adapter.disableProfileByIccId(iccid);
  else await adapter.enableProfileByIccId(iccid);
}
