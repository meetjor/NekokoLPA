import React from 'react';
import {Alert, Platform, TouchableOpacity} from 'react-native';
import {Text, XStack, YStack} from 'tamagui';
import {useTranslation} from 'react-i18next';
import {AppVersion} from '@/shared/config/app';
import {usePreference} from '@/shared/hooks/usePreference';
import {useAppUpdate, checkAppUpdate} from '@/shared/hooks/useAppUpdate';
import {preferences} from '@/shared/storage';
import {isNewerVersion, RELEASES_PAGE} from '@/shared/utils/appUpdates';
import {openUpdateBrowser} from '@/shared/utils/updateBrowser';
import Toggle from '@/shared/ui/Toggle';
import {Row} from '@/shared/ui/RowGroup';

export default function AppUpdateSection() {
  const {t} = useTranslation('main');
  const automatic = usePreference('automaticAppUpdates', 'on') === 'on';
  const state = useAppUpdate();
  if (Platform.OS !== 'android') return null;
  const release = state.release;
  const newer = release && isNewerVersion(release.version, AppVersion);
  const open = async (url: string) => {
    try { await openUpdateBrowser(url); }
    catch { Alert.alert(t('ui_browser_failed'), t('ui_browser_failed_hint')); }
  };
  return <>
    <Row>
      <TouchableOpacity testID="check-app-update" accessibilityRole="button"
        disabled={state.status === 'checking'} onPress={() => { void checkAppUpdate(); }}
        style={{minHeight: 48, justifyContent: 'center'}}>
        <Text color="$primaryColor" fontSize={16}>{t(state.status === 'checking' ? 'ui_update_checking' : 'ui_check_updates')}</Text>
      </TouchableOpacity>
      {state.status === 'error' && <YStack gap={8}>
        <Text color="$statusWarning">{t('ui_update_failed')}</Text>
        <TouchableOpacity accessibilityRole="button" onPress={() => { void open(RELEASES_PAGE); }} style={{minHeight: 48, justifyContent: 'center'}}>
          <Text color="$primaryColor">{t('ui_open_releases')}</Text>
        </TouchableOpacity>
      </YStack>}
      {state.status === 'ready' && !newer && <Text color="$color6">{t('ui_update_latest')}</Text>}
      {newer && <YStack gap={10} paddingTop={8}>
        <Text color="$textDefault" fontSize={17} fontWeight="600">{t('ui_update_available', {version: release.version})}</Text>
        {release.prerelease && <Text color="$color6">{t('ui_update_prerelease')}</Text>}
        <Text color="$color6">{t('ui_update_install_hint')}</Text>
        {release.notes ? <Text selectable color="$textDefault" fontSize={14}>{release.notes}</Text> : null}
        <TouchableOpacity testID="download-app-update" accessibilityRole="button" onPress={() => { void open(release.downloadUrl); }}
          style={{minHeight: 48, justifyContent: 'center'}}>
          <Text color="$primaryColor" fontSize={16} fontWeight="600">{t('ui_browser_download')}</Text>
        </TouchableOpacity>
      </YStack>}
    </Row>
    <Row><XStack alignItems="center" gap={12}>
      <YStack flex={1} gap={4}><Text color="$textDefault" fontSize={16}>{t('ui_auto_check_updates')}</Text>
        <Text color="$color6" fontSize={13}>{t('ui_auto_check_updates_hint')}</Text></YStack>
      <Toggle label={t('ui_auto_check_updates')} value={automatic}
        onPress={() => preferences.set('automaticAppUpdates', automatic ? 'off' : 'on')} />
    </XStack></Row>
  </>;
}
