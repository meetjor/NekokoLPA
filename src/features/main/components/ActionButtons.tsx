import React, {useCallback, useState} from 'react';
import {TouchableOpacity} from 'react-native';
import {Eye, EyeOff, RefreshCcw, Settings} from '@tamagui/lucide-icons';
import {Text, XStack, YStack} from 'tamagui';
import {preferences} from '@/shared/storage';
import {isRedactMode, RedactMode} from '@/shared/utils/redact';

export default function ActionButtons({
  navigation,
  onRefresh,
}: {
  navigation: any;
  onRefresh: () => void;
}) {
  const [redact, setRedact] = useState<RedactMode>(() => {
    const stored = preferences.getString('redactMode');
    return isRedactMode(stored) ? stored : 'none';
  });

  const toggleRedact = useCallback(() => {
    const next: RedactMode = redact === 'none' ? 'medium' : 'none';
    preferences.set('redactMode', next);
    setRedact(next);
  }, [redact]);

  const controls = [
    {key: 'privacy', label: '隐私', Icon: redact === 'none' ? Eye : EyeOff, onPress: toggleRedact},
    {key: 'refresh', label: '刷新', Icon: RefreshCcw, onPress: onRefresh},
    {key: 'settings', label: '设置', Icon: Settings, onPress: () => navigation.navigate('Settings', {})},
  ];

  return (
    <XStack gap={24} paddingTop={16} paddingBottom={4}>
      {controls.map(({key, label, Icon, onPress}) => (
        <TouchableOpacity
          key={key}
          accessibilityRole="button"
          accessibilityLabel={label}
          activeOpacity={0.7}
          onPress={onPress}
          style={{alignItems: 'center', minWidth: 52}}>
          <YStack
            width={45}
            height={45}
            borderRadius={24}
            borderWidth={1}
            borderColor="#344471"
            backgroundColor="#1C2850"
            alignItems="center"
            justifyContent="center">
            <Icon size={23} color={key === 'refresh' ? '#58D6FF' : '#EEF0FF'} />
          </YStack>
          <Text fontSize={12} color="#D4D8F4" paddingTop={5}>
            {label}
          </Text>
        </TouchableOpacity>
      ))}
    </XStack>
  );
}
