import React, {useEffect} from 'react';
import {AppState, Platform, TouchableOpacity} from 'react-native';
import {Text} from 'tamagui';
import {useTranslation} from 'react-i18next';
import {useNavigation} from '@react-navigation/native';
import type {StackNavigationProp} from '@react-navigation/stack';
import type {RootStackParamList} from '@/app/navigation/types';
import {AppVersion, AppSupportsUpdates} from '@/shared/config/app';
import {usePreference} from '@/shared/hooks/usePreference';
import {useAppUpdate, checkAppUpdate} from '@/shared/hooks/useAppUpdate';
import {isNewerVersion, shouldAutomaticallyCheck} from '@/shared/utils/appUpdates';

export default function UpdateNotice() {
  const {t} = useTranslation('main');
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const automatic = usePreference('automaticAppUpdates', 'on') === 'on';
  const state = useAppUpdate();
  useEffect(() => {
    if (!automatic || Platform.OS !== 'android' || !AppSupportsUpdates) return;
    const check = () => {
      if (AppState.currentState === 'active' && state.status !== 'checking' &&
        shouldAutomaticallyCheck(Date.now(), state.checkedAt)) void checkAppUpdate();
    };
    check();
    const listener = AppState.addEventListener('change', check);
    return () => listener.remove();
  }, [automatic, state.status, state.checkedAt]);
  if (!automatic || Platform.OS !== 'android' || !AppSupportsUpdates || !state.release || !isNewerVersion(state.release.version, AppVersion)) return null;
  return <TouchableOpacity accessibilityRole="button" onPress={() => navigation.navigate('Settings', {})}
    style={{minHeight: 48, justifyContent: 'center'}}>
    <Text color="$primaryColor">{t('ui_update_available', {version: state.release.version})}</Text>
  </TouchableOpacity>;
}
