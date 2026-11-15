import React from 'react';
import {ScrollView, TouchableOpacity} from 'react-native';
import {Text, XStack, useTheme} from 'tamagui';
import {Bluetooth, ChevronDown} from '@tamagui/lucide-icons';
import {useTranslation} from 'react-i18next';

export interface SlotTab {
  key: string;
  label: string;
  available?: boolean;
}

export default function SlotTabs({
  tabs,
  selected,
  onSelect,
  onBluetooth,
  bluetoothActive = false,
  emptyLabel,
}: {
  tabs: SlotTab[];
  selected: string;
  onSelect: (key: string) => void;
  onBluetooth?: () => void;
  bluetoothActive?: boolean;
  emptyLabel: string;
}) {
  const theme = useTheme();
  const {t} = useTranslation('main');
  return (
    <XStack marginHorizontal={20} marginVertical={6} alignItems="center" gap={8}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{flex: 1}}
        contentContainerStyle={{gap: 8, alignItems: 'center'}}>
        {tabs.length === 0 && <Text color="$color6">{emptyLabel}</Text>}
        {tabs.map(tab => {
          const active = tab.key === selected;
          return (
            <TouchableOpacity
              key={tab.key}
              onPress={() => onSelect(tab.key)}
              accessibilityRole="tab"
              accessibilityState={{selected: active}}
              accessibilityLabel={`${tab.label}${
                tab.available === false ? ` · ${t('ui_unavailable')}` : ''
              }`}
              style={{
                minHeight: 44,
                maxWidth: 240,
                paddingHorizontal: 14,
                paddingVertical: 10,
                justifyContent: 'center',
                borderRadius: 12,
                borderWidth: 1,
                backgroundColor: active ? theme.surfaceSpecial?.val : theme.background?.val,
                borderColor: active ? theme.primaryColor?.val : theme.borderColor?.val,
              }}>
              <XStack alignItems="center" gap={8}>
                <Text
                  numberOfLines={1}
                  fontSize={14}
                  fontWeight={active ? '600' : '400'}
                  color={
                    tab.available === false ? '$color9' : active ? '$primaryColor' : '$textDefault'
                  }>
                  {tab.label}
                  {tab.available === false ? ` · ${t('ui_unavailable')}` : ''}
                </Text>
                {active && tabs.length > 1 && <ChevronDown size={17} color={theme.color6?.val} />}
              </XStack>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      {onBluetooth && (
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={t('bluetooth_scan')}
          onPress={onBluetooth}
          style={{
            width: 44,
            height: 44,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 12,
            backgroundColor: theme.surfaceRow?.val,
          }}>
          <Bluetooth
            size={19}
            color={bluetoothActive ? theme.primaryColor?.val : theme.color6?.val}
          />
        </TouchableOpacity>
      )}
    </XStack>
  );
}
