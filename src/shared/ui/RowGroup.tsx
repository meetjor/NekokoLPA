import React from 'react';
import {YStack} from 'tamagui';

/** Deep-indigo grouped setting rows with hairline separators. */
export default function RowGroup({children}: {children: React.ReactNode}) {
  const items = React.Children.toArray(children).filter(Boolean);
  return (
    <YStack
      backgroundColor="$surfaceRow"
      borderWidth={1}
      borderColor="$borderColor"
      borderRadius={18}
      overflow="hidden">
      {items.map((child, index) => (
        <YStack
          key={index}
          borderBottomWidth={index === items.length - 1 ? 0 : 1}
          borderBottomColor="$borderColor">
          {child}
        </YStack>
      ))}
    </YStack>
  );
}

export function Row({
  children,
  paddingVertical = 14,
  paddingHorizontal = 14,
}: {
  children: React.ReactNode;
  paddingVertical?: number;
  paddingHorizontal?: number;
}) {
  return <YStack paddingVertical={paddingVertical} paddingHorizontal={paddingHorizontal}>{children}</YStack>;
}
