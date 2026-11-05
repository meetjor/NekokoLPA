import React from 'react';
import {TouchableOpacity, View} from 'react-native';
import {useTheme} from 'tamagui';

/** A controlled switch with a full 48 dp touch target. State comes from the caller. */
export default function Toggle({
  value,
  onPress,
  disabled = false,
  label,
}: {
  value: boolean;
  onPress: () => void;
  disabled?: boolean;
  label?: string;
}) {
  const theme = useTheme();
  return (
    <TouchableOpacity
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{checked: value, disabled}}
      activeOpacity={0.8}
      disabled={disabled}
      onPress={onPress}
      style={{
        minWidth: 56,
        minHeight: 48,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: disabled ? 0.5 : 1,
        flexShrink: 0,
      }}>
      <View
        style={{
          width: 48,
          height: 28,
          borderRadius: 20,
          padding: 3,
          alignItems: value ? 'flex-end' : 'flex-start',
          backgroundColor: value ? theme.primaryColor?.val : theme.outlineDisabledHeavy?.val,
        }}>
        <View
          style={{width: 22, height: 22, borderRadius: 11, backgroundColor: theme.onFilled?.val}}
        />
      </View>
    </TouchableOpacity>
  );
}
