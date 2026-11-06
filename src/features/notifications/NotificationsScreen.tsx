import React, {useEffect, useState} from 'react';
import {Alert, Image, TouchableOpacity} from 'react-native';
import {useTranslation} from 'react-i18next';
import {Text, useTheme, XStack, YStack} from 'tamagui';
import {useSelector} from 'react-redux';
import {Send, Trash2} from '@tamagui/lucide-icons';
import Screen from '@/shared/ui/Screen';
import type {RootScreenProps} from '@/app/navigation/types';
import {selectDeviceState} from '@/store';
import {Adapters} from '@/lpa/adapters/registry';
import type {Notification} from '@/lpa/types/euicc';
import type {NotificationResult} from '@/lpa/types/operations';
import {parseMetadataOnly} from '@/shared/utils/parser';
import {Flags} from '@/assets/flags';
import {useToast} from '@/app/providers/ToastProvider';
import {useLoading} from '@/app/providers/LoadingProvider';
import {makeLoading} from '@/shared/utils/loading';
import {fontFamily, fontSize, radius} from '@/shared/theme/tokens';
import Pill from '@/shared/ui/Pill';
import {usePreference} from '@/shared/hooks/usePreference';
import {group, isRedactMode, maskIccid, maskProfileText} from '@/shared/utils/redact';
import {deliverNotification} from './notificationActions';

const OPERATION_KEYS: Record<number, string> = {
  0x10: 'notifications_operation_delete',
  0x20: 'notifications_operation_disable',
  0x40: 'notifications_operation_enable',
  0x80: 'notifications_operation_install',
};

export default function Notifications({route}: RootScreenProps<'Notifications'>) {
  const {deviceId} = route.params;
  const {profiles = [], notifications} = useSelector(selectDeviceState(deviceId));
  const {showToast} = useToast();
  const {t} = useTranslation('main');
  const {isLoading, setLoading} = useLoading();
  const [readFailed, setReadFailed] = useState(false);
  const [lastBatch, setLastBatch] = useState<NotificationResult>();
  const theme = useTheme();
  const adapter = Adapters[deviceId];
  const unavailable = !adapter || adapter.obsolete;
  const stored = usePreference('redactMode', 'none');
  const redactMode = isRedactMode(stored) ? stored : 'none';
  const disabled = isLoading || unavailable;

  const refresh = async () => {
    try {
      await adapter.getNotifications();
      setReadFailed(false);
    } catch (error) {
      setReadFailed(true);
      throw error;
    }
  };
  useEffect(() => {
    if (!adapter || adapter.obsolete) return;
    void makeLoading(setLoading, async () => {
      try {
        await adapter.getNotifications();
        setReadFailed(false);
      } catch (error) {
        setReadFailed(true);
        throw error;
      }
    });
  }, [adapter, setLoading]);

  const send = (row: Notification, remove: boolean) =>
    makeLoading(setLoading, async () => {
      const result = await deliverNotification(adapter, row.seqNumber, remove);
      if (!result.sent) {
        Alert.alert(t('notifications_send_failed'), t('notifications_send_failed_alert'));
        return;
      }
      if (result.cleanupWarning) {
        setReadFailed(true);
        Alert.alert(t('notifications_cleanup_warning_title'), t('notifications_cleanup_warning'));
        return;
      }
      if (result.refreshWarning) {
        setReadFailed(true);
        Alert.alert(t('notifications_refresh_warning_title'), t('notifications_refresh_warning'));
        return;
      }
      showToast(t(remove ? 'notifications_removed' : 'notifications_send_success'), 'success');
    });
  const confirmRemove = (row: Notification) =>
    Alert.alert(t('notifications_send_remove'), t('notifications_delete_alert'), [
      {text: t('notifications_delete_cancel'), style: 'cancel'},
      {
        text: t('notifications_send_remove'),
        style: 'destructive',
        onPress: () => {
          void send(row, true);
        },
      },
    ]);

  const sorted = Array.isArray(notifications)
    ? [...notifications].sort((a, b) => b.seqNumber - a.seqNumber)
    : [];
  const groups = new Map<string, Notification[]>();
  for (const row of sorted) {
    const host = row.notificationAddress || t('notifications_unknown_host');
    groups.set(host, [...(groups.get(host) ?? []), row]);
  }

  return (
    <Screen title={t('notifications_notifications')}>
      <YStack gap={18}>
        <Text color="$color6" fontSize={fontSize.sm}>
          {t('notifications_subtitle')}
        </Text>
        {(unavailable || readFailed) && (
          <YStack gap={10} padding={14} borderRadius={radius.lg} backgroundColor="$surfaceRow">
            <Text color="$statusWarning">
              {t(unavailable ? 'notifications_device_unavailable' : 'notifications_read_failed')}
            </Text>
            {!unavailable && (
              <TouchableOpacity
                accessibilityRole="button"
                disabled={isLoading}
                onPress={() => {
                  void makeLoading(setLoading, refresh);
                }}
                style={{minHeight: 48, justifyContent: 'center'}}>
                <Text color="$primaryColor">{t('ui_retry_sync')}</Text>
              </TouchableOpacity>
            )}
          </YStack>
        )}
        {!unavailable && notifications && sorted.length === 0 && !readFailed && (
          <YStack padding={24} backgroundColor="$surfaceRow" borderRadius={radius.lg}>
            <Text color="$color6" fontSize={fontSize.md}>
              {t('ui_no_notifications')}
            </Text>
          </YStack>
        )}
        {Array.from(groups, ([host, items]) => (
          <YStack key={host} gap={10}>
            <YStack gap={4} paddingHorizontal={4}>
              <Text
                color="$color6"
                style={{fontFamily: fontFamily.mono}}
                fontSize={fontSize.xs}
                numberOfLines={2}>
                {host}
              </Text>
              <Text color="$color6" fontSize={fontSize.sm}>
                {t('notifications_pending', {count: items.length})}
              </Text>
            </YStack>
            {items.map(row => {
              const metadata = profiles.find(p => p.iccid === row.iccid);
              const {name, country} = metadata
                ? parseMetadataOnly(metadata)
                : {name: t('notifications_unknown_profile'), country: 'WW'};
              return (
                <YStack
                  key={row.seqNumber}
                  testID={`notification-${row.seqNumber}`}
                  padding={14}
                  gap={12}
                  borderWidth={1}
                  borderColor="$borderColor"
                  backgroundColor="$surfaceRow"
                  borderRadius={radius.lg}>
                  <XStack alignItems="center" gap={10}>
                    <Image
                      accessible={false}
                      style={{width: 26, height: 18, borderRadius: 3}}
                      source={Flags[country] || Flags.UN}
                    />
                    <Text
                      testID={`name-${row.seqNumber}`}
                      color="$textDefault"
                      fontSize={fontSize.lg}
                      fontWeight="600"
                      flex={1}
                      minWidth={0}
                      numberOfLines={2}>
                      {maskProfileText(name, redactMode)}
                    </Text>
                  </XStack>
                  <XStack
                    alignItems="center"
                    justifyContent="space-between"
                    gap={8}
                    flexWrap="wrap">
                    <Pill tone={row.profileManagementOperation === 0x10 ? 'danger' : 'neutral'}>
                      {t(
                        OPERATION_KEYS[row.profileManagementOperation] ??
                          'notifications_operation_unknown',
                      )}
                    </Pill>
                    <Text
                      color="$color6"
                      style={{fontFamily: fontFamily.mono}}
                      fontSize={fontSize.xs}>
                      #{row.seqNumber}
                    </Text>
                  </XStack>
                  <Text
                    testID={`iccid-${row.seqNumber}`}
                    color="$color6"
                    style={{fontFamily: fontFamily.mono}}
                    fontSize={fontSize.sm}>
                    {group(maskIccid(row.iccid, redactMode))}
                  </Text>
                  <XStack gap={8}>
                    <TouchableOpacity
                      accessibilityRole="button"
                      accessibilityLabel={`${t('notifications_send_single')} #${row.seqNumber}`}
                      testID={`send-${row.seqNumber}`}
                      disabled={disabled}
                      onPress={() => {
                        void send(row, false);
                      }}
                      style={{
                        flex: 1,
                        minHeight: 48,
                        padding: 10,
                        borderRadius: radius.md,
                        backgroundColor: theme.colorFocus?.val,
                        opacity: disabled ? 0.5 : 1,
                      }}>
                      <XStack gap={6} alignItems="center" justifyContent="center" flex={1}>
                        <Send size={17} color={theme.primaryColor?.val} />
                        <Text
                          color="$primaryColor"
                          fontSize={fontSize.sm}
                          flexShrink={1}
                          textAlign="center">
                          {t('notifications_send_single')}
                        </Text>
                      </XStack>
                    </TouchableOpacity>
                    <TouchableOpacity
                      accessibilityRole="button"
                      accessibilityLabel={`${t('notifications_send_remove')} #${row.seqNumber}`}
                      testID={`remove-${row.seqNumber}`}
                      disabled={disabled}
                      onPress={() => confirmRemove(row)}
                      style={{
                        flex: 1,
                        minHeight: 48,
                        padding: 10,
                        borderRadius: radius.md,
                        borderWidth: 1,
                        borderColor: theme.borderColor?.val,
                        opacity: disabled ? 0.5 : 1,
                      }}>
                      <XStack gap={6} alignItems="center" justifyContent="center" flex={1}>
                        <Trash2 size={17} color={theme.color6?.val} />
                        <Text
                          color="$color6"
                          fontSize={fontSize.sm}
                          flexShrink={1}
                          textAlign="center">
                          {t('notifications_send_remove')}
                        </Text>
                      </XStack>
                    </TouchableOpacity>
                  </XStack>
                </YStack>
              );
            })}
          </YStack>
        ))}
        {lastBatch && (
          <Text
            testID="notification-result"
            color={lastBatch.failed || lastBatch.refreshWarning ? '$statusWarning' : '$color6'}>
            {t('ui_notification_result', {...lastBatch})}
          </Text>
        )}
        {sorted.length > 0 && (
          <TouchableOpacity
            testID="send-all"
            accessibilityRole="button"
            disabled={disabled}
            onPress={() => {
              void makeLoading(setLoading, async () => {
                const result = await adapter.processNotifications('');
                setLastBatch(result);
                showToast(
                  t('ui_notification_result', {...result}),
                  result.failed || result.refreshWarning ? 'error' : 'success',
                );
                if (result.refreshWarning) setReadFailed(true);
              });
            }}
            style={{
              backgroundColor: theme.primaryColor?.val,
              borderRadius: radius.md,
              minHeight: 48,
              padding: 14,
              alignItems: 'center',
              opacity: disabled ? 0.5 : 1,
            }}>
            <Text color={theme.onFilled?.val} fontSize={fontSize.lg} fontWeight="600">
              {t('notifications_send_all', {count: sorted.length})}
            </Text>
          </TouchableOpacity>
        )}
      </YStack>
    </Screen>
  );
}
