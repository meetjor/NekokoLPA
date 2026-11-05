import React from 'react';
import {Platform, TouchableOpacity, ToastAndroid} from 'react-native';
import {useTranslation} from 'react-i18next';
import {Text, XStack, YStack, useTheme} from 'tamagui';
import {Copy, Cpu} from '@tamagui/lucide-icons';
import Clipboard from '@react-native-clipboard/clipboard';
import Screen from '@/shared/ui/Screen';
import RowGroup, {Row} from '@/shared/ui/RowGroup';
import {fontFamily} from '@/shared/theme/tokens';
import SectionLabel from '@/shared/ui/SectionLabel';
import type {RootScreenProps} from '@/app/navigation/types';
import {useAppSelector, selectDeviceState} from '@/store';
import {useFormatSize} from '@/shared/hooks/useFormatSize';
import {usePreference} from '@/shared/hooks/usePreference';
import {group, isRedactMode, maskEid} from '@/shared/utils/redact';

interface InfoRow {
  key: string;
  value?: string;
  raw?: string;
}

export default function EuiccInfo({route}: RootScreenProps<'EuiccInfo'>) {
  const state = useAppSelector(selectDeviceState(route.params.deviceId));
  const {t} = useTranslation('main');
  const theme = useTheme();
  const formatSize = useFormatSize();
  const preference = usePreference('redactMode', 'medium');
  const redact = isRedactMode(preference) ? preference : 'medium';
  const {eid, euiccInfo2: info, euiccAddress: address} = state;
  const memory = info?.extCardResource;
  const size = (n: number | undefined) => (n == null ? undefined : formatSize(n));
  const sections: {title: string; rows: InfoRow[]}[] = [
    {
      title: t('ui_device_identity'),
      rows: [
        {key: 'eid', value: eid ? group(maskEid(eid, redact)) : undefined, raw: eid},
        {key: 'sasAcreditationNumber', value: info?.sasAcreditationNumber},
        {key: 'svn', value: info?.svn},
      ],
    },
    {
      title: t('ui_device_storage'),
      rows: [
        {key: 'freeNonVolatileMemory', value: size(memory?.freeNonVolatileMemory)},
        {key: 'freeVolatileMemory', value: size(memory?.freeVolatileMemory)},
      ],
    },
    {
      title: t('ui_device_technical'),
      rows: [
        {key: 'defaultDpAddress', value: address?.defaultDpAddress},
        {key: 'rootDsAddress', value: address?.rootDsAddress},
        {
          key: 'euiccCiPKIdListForSigning',
          value: info?.euiccCiPKIdListForSigning?.map(x => x.slice(0, 16)).join(', '),
          raw: info?.euiccCiPKIdListForSigning?.join('\n'),
        },
        {
          key: 'euiccCiPKIdListForVerification',
          value: info?.euiccCiPKIdListForVerification?.map(x => x.slice(0, 16)).join(', '),
          raw: info?.euiccCiPKIdListForVerification?.join('\n'),
        },
        {key: 'profileVersion', value: info?.profileVersion},
        {key: 'globalplatformVersion', value: info?.globalplatformVersion},
        {key: 'euiccFirmwareVer', value: info?.euiccFirmwareVer},
      ],
    },
  ];
  return (
    <Screen
      title={t('ui_device_details')}
      subtitle={t('ui_device_info_hint')}
      keyboardAvoiding={false}>
      <XStack alignItems="center" gap={12} marginBottom={24}>
        <Cpu size={28} color={theme.primaryColor?.val} />
        <YStack gap={4}>
          <Text color="$textDefault" fontSize={18} fontWeight="600">
            eUICC
          </Text>
          <Text color="$color6" fontSize={14}>
            {t('ui_profile_count', {count: state.profiles?.length ?? 0})}
          </Text>
        </YStack>
      </XStack>
      {sections.map(section => (
        <YStack key={section.title} gap={10} marginBottom={24}>
          <SectionLabel>{section.title}</SectionLabel>
          <RowGroup>
            {section.rows.map(row => (
              <TouchableOpacity
                key={row.key}
                accessibilityRole="button"
                accessibilityLabel={`${t('euiccInfo_' + row.key)}: ${row.value || t('ui_unknown')}`}
                disabled={!row.raw && !row.value}
                onPress={() => {
                  Clipboard.setString(row.raw ?? row.value ?? '');
                  if (Platform.OS === 'android')
                    ToastAndroid.show(t('ui_copied'), ToastAndroid.SHORT);
                }}>
                <Row paddingVertical={16}>
                  <XStack alignItems="center" gap={12}>
                    <YStack flex={1} gap={7}>
                      <Text color="$color6" fontSize={13}>
                        {t('euiccInfo_' + row.key)}
                      </Text>
                      <Text color="$textDefault" fontSize={15} fontFamily={fontFamily.mono as any}>
                        {row.value || t('ui_unknown')}
                      </Text>
                    </YStack>
                    {(row.raw || row.value) && <Copy size={17} color={theme.color6?.val} />}
                  </XStack>
                </Row>
              </TouchableOpacity>
            ))}
          </RowGroup>
        </YStack>
      ))}
    </Screen>
  );
}
