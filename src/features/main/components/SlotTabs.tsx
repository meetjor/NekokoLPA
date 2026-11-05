import React from 'react';
import {ScrollView, TouchableOpacity} from 'react-native';
import {Text, XStack, YStack} from 'tamagui';
import {Bluetooth} from '@tamagui/lucide-icons';

export interface SlotTab {
  key: string;
  label: string;
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
  const scrolls = tabs.length > 3;
  const renderTab = (tab: SlotTab) => {
    const active = tab.key === selected;
    return (
      <TouchableOpacity
        key={tab.key}
        onPress={() => onSelect(tab.key)}
        accessibilityRole="tab"
        accessibilityState={{selected: active}}
        style={{
          flex: scrolls ? undefined : 1,
          minWidth: scrolls ? 115 : 0,
          paddingHorizontal: 13,
          paddingTop: 18,
          paddingBottom: 15,
          alignItems: 'center',
          borderBottomWidth: 3,
          borderBottomColor: active ? '#59CEFF' : 'transparent',
        }}>
        <Text
          color={active ? '#68D5FF' : '#9AA5C8'}
          numberOfLines={1}
          fontSize={15}
          fontWeight={(active ? '700' : '500') as any}>
          {tab.label.replace(' · unavailable', ' · 不可用')}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <XStack
      marginHorizontal={14}
      marginTop={10}
      marginBottom={10}
      backgroundColor="#192343"
      borderWidth={1}
      borderColor="#374872"
      borderRadius={15}
      overflow="hidden"
      alignItems="stretch">
      <YStack flex={1} minWidth={0}>
        {tabs.length === 0 ? (
          <Text color="#AAB4D4" padding={16}>{emptyLabel}</Text>
        ) : scrolls ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {tabs.map(renderTab)}
          </ScrollView>
        ) : (
          <XStack flex={1}>{tabs.map(renderTab)}</XStack>
        )}
      </YStack>
      {onBluetooth && (
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Bluetooth readers"
          onPress={onBluetooth}
          style={{
            width: 55,
            alignItems: 'center',
            justifyContent: 'center',
            borderLeftWidth: 1,
            borderLeftColor: '#34456E',
          }}>
          <Bluetooth size={23} color={bluetoothActive ? '#69CDFF' : '#AAB4DB'} />
        </TouchableOpacity>
      )}
    </XStack>
  );
}
