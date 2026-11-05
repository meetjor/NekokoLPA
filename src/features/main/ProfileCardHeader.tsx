import React, {useState} from 'react';
import {Platform, ToastAndroid, TouchableOpacity} from 'react-native';
import {useSelector} from 'react-redux';
import {useNavigation} from '@react-navigation/native';
import {useTranslation} from 'react-i18next';
import {Text, useTheme, XStack, YStack} from 'tamagui';
import {
  Bell,
  ChevronRight,
  Copy,
  Cpu,
  Info,
  Menu,
  MoreHorizontal,
  Send,
} from '@tamagui/lucide-icons';
import Clipboard from '@react-native-clipboard/clipboard';
import AppSheet from '@/shared/ui/AppSheet';
import {Adapters} from '@/lpa/adapters/registry';
import {useFormatSize} from '@/shared/hooks/useFormatSize';
import {makeLoading} from '@/shared/utils/loading';
import {useLoading} from '@/app/providers/LoadingProvider';
import {selectDeviceState} from '@/store';
import {OMAPIBridge} from '@/lpa/bridge/nativeModules';
import {group, maskEid} from '@/shared/utils/redact';

/** A compact device summary; technical details and maintenance live one level down. */
export default function ProfileCardHeader({deviceId}: {deviceId: string}) {
  const theme = useTheme();
  const {t} = useTranslation('main');
  const formatSize = useFormatSize();
  const navigation = useNavigation<any>();
  const [open, setOpen] = useState(false);
  const state = useSelector(selectDeviceState(deviceId));
  const adapter = Adapters[deviceId];
  const {setLoading, isLoading} = useLoading();
  const details = () => navigation.navigate('EuiccInfo', {deviceId});
  const actions = [
    {label: t('ui_device_details'), Icon: Info, action: details},
    {
      label: t('eid_copy'),
      Icon: Copy,
      action: () => {
        if (!state.eid) return;
        Clipboard.setString(state.eid);
        if (Platform.OS === 'android') ToastAndroid.show(t('ui_copied'), ToastAndroid.SHORT);
      },
    },
    {
      label: t('manage_notifications'),
      Icon: Bell,
      action: () => navigation.navigate('Notifications', {deviceId}),
    },
    {
      label: t('notifications_send'),
      Icon: Send,
      action: () => {
        makeLoading(setLoading, () => adapter.processNotifications(''));
      },
    },
    ...(Platform.OS === 'android' && deviceId.startsWith('omapi:')
      ? [
          {
            label: t('open_stk_menu'),
            Icon: Menu,
            action: () => OMAPIBridge.openSTK(adapter.device.deviceName),
          },
        ]
      : []),
  ];
  return (
    <>
      <XStack
        backgroundColor="$surfaceRow"
        borderRadius={16}
        borderWidth={1}
        borderColor="$borderColor"
        alignItems="center"
        marginTop={4}
        marginBottom={16}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={t('ui_device_details')}
          onPress={details}
          style={{flex: 1, padding: 16, minHeight: 88}}>
          <XStack alignItems="center" gap={12}>
            <YStack
              backgroundColor="$surfaceSpecial"
              width={42}
              height={42}
              borderRadius={12}
              alignItems="center"
              justifyContent="center">
              <Cpu size={23} color={theme.primaryColor?.val} />
            </YStack>
            <YStack flex={1} minWidth={0} gap={5}>
              <Text color="$textDefault" fontSize={17} fontWeight="600" numberOfLines={1}>
                {adapter.device.displayName} · eUICC
              </Text>
              <Text color="$color6" fontSize={13}>
                {t('ui_profile_count', {count: state.profiles?.length ?? 0})}
                {state.bytesFree != null
                  ? ` · ${t('ui_free_space', {size: formatSize(state.bytesFree)})}`
                  : ''}
              </Text>
            </YStack>
            <ChevronRight size={18} color={theme.color6?.val} />
          </XStack>
        </TouchableOpacity>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={t('ui_device_actions')}
          onPress={() => setOpen(true)}
          disabled={isLoading}
          style={{width: 48, minHeight: 64, alignItems: 'center', justifyContent: 'center'}}>
          <MoreHorizontal size={23} color={theme.color6?.val} />
        </TouchableOpacity>
      </XStack>
      <AppSheet open={open} onOpenChange={setOpen} title={t('ui_device_actions')}>
        <YStack gap={4} paddingBottom={20}>
          <Text color="$color6" fontSize={12} paddingBottom={12}>
            EID · {state.eid ? group(maskEid(state.eid, 'medium')) : t('ui_unknown')}
          </Text>
          {actions.map(({label, Icon, action}) => (
            <TouchableOpacity
              key={label}
              accessibilityRole="button"
              disabled={isLoading}
              onPress={() => {
                setOpen(false);
                action();
              }}>
              <XStack gap={12} paddingVertical={16} alignItems="center">
                <Icon size={22} color={theme.color6?.val} />
                <Text color="$textDefault" fontSize={16} flex={1}>
                  {label}
                </Text>
                <ChevronRight size={18} color={theme.color6?.val} />
              </XStack>
            </TouchableOpacity>
          ))}
        </YStack>
      </AppSheet>
    </>
  );
}
