import React from 'react';
import {Text as TText, XStack, YStack} from 'tamagui';

import {AppVersion} from '@/shared/config/app';
import QianLeLogo from '@/shared/ui/QianLeLogo';

export default function AppHeader(_props: {navigation?: unknown}) {
  return (
    <XStack alignItems="center" gap={12} flex={1} minWidth={0}>
      <QianLeLogo size={52} />
      <YStack gap={4} flex={1} minWidth={0}>
        <TText color="#F8F9FF" fontSize={23} fontWeight={'700' as any} numberOfLines={1}>
          QianLesim
        </TText>
        <TText color="#B5BBF3" fontSize={13} numberOfLines={1}>
          v{AppVersion} · 定制版
        </TText>
      </YStack>
    </XStack>
  );
}
