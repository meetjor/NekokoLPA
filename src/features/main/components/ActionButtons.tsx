import React, {useCallback, useState} from 'react';
import {TouchableOpacity} from 'react-native';
import {Eye, EyeOff, RefreshCcw, Settings} from '@tamagui/lucide-icons';
import {Text, XStack, useTheme} from 'tamagui';
import {useTranslation} from 'react-i18next';
import {preferences} from '@/shared/storage';
import {usePreference} from '@/shared/hooks/usePreference';
import {useLoading} from '@/app/providers/LoadingProvider';

export default function ActionButtons({
  navigation,
  onRefresh,
}: {
  navigation: any;
  onRefresh: () => Promise<void>;
}) {
  const theme = useTheme();
  const {t} = useTranslation('main');
  const {isLoading} = useLoading();
  const [refreshing, setRefreshing] = useState(false);
  const redact = usePreference('redactMode', 'none');
  const refresh = useCallback(async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  }, [onRefresh, refreshing]);
  const controls = [
    {
      key: 'privacy',
      label: t('ui_privacy'),
      Icon: redact === 'none' ? Eye : EyeOff,
      onPress: () => preferences.set('redactMode', redact === 'none' ? 'medium' : 'none'),
    },
    {
      key: 'refresh',
      label: t(refreshing ? 'ui_refreshing' : 'ui_refresh'),
      Icon: RefreshCcw,
      onPress: refresh,
    },
    {
      key: 'settings',
      label: t('ui_settings'),
      Icon: Settings,
      onPress: () => navigation.navigate('Settings', {}),
    },
  ];
  return (
    <XStack gap={8}>
      {controls.map(({key, label, Icon, onPress}) => (
        <TouchableOpacity
          key={key}
          accessibilityRole="button"
          accessibilityLabel={label}
          disabled={key === 'refresh' && (refreshing || isLoading)}
          onPress={onPress}
          style={{
            flex: 1,
            minHeight: 48,
            borderRadius: 12,
            justifyContent: 'center',
            backgroundColor: theme.surfaceRow?.val,
            opacity: key === 'refresh' && refreshing ? 0.5 : 1,
          }}>
          <XStack alignItems="center" justifyContent="center" gap={7} padding={8} flexWrap="wrap">
            <Icon size={19} color={theme.color6?.val} />
            <Text color="$textDefault" fontSize={13}>
              {label}
            </Text>
          </XStack>
        </TouchableOpacity>
      ))}
    </XStack>
  );
}
