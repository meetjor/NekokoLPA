import React from 'react';
import {Text, XStack, YStack} from 'tamagui';
import {useTranslation} from 'react-i18next';
import QianLeLogo from '@/shared/ui/QianLeLogo';

export default function AppHeader() {
  const {t} = useTranslation('main');
  return (
    <XStack alignItems="center" gap={12} minWidth={0}>
      <QianLeLogo size={42} />
      <YStack gap={3} flex={1} minWidth={0}>
        <Text color="$textDefault" fontSize={24} fontWeight="700" numberOfLines={1}>
          QianLesim
        </Text>
        <Text color="$color6" fontSize={13}>
          {t('ui_manager')}
        </Text>
      </YStack>
    </XStack>
  );
}
