import React, {useCallback} from 'react';
import {useDispatch} from 'react-redux';
import {YStack} from 'tamagui';

import SafeScreen from '@/shared/ui/SafeScreen';
import SIMSelector from '@/features/main/SIMSelector';
import type {RootScreenProps} from '@/app/navigation/types';
import {setupDevices} from '@/lpa/deviceManager';
import AppHeader from '@/features/main/components/AppHeader';
import ActionButtons from '@/features/main/components/ActionButtons';
import Nightscape from '@/shared/ui/Nightscape';

function Main({navigation}: RootScreenProps<'Main'>) {
  const dispatch = useDispatch();

  const handleRefresh = useCallback(async () => {
    try {
      await setupDevices(dispatch);
    } catch (error) {
      console.warn('[QianLesim] Manual refresh failed', error);
    }
  }, [dispatch]);

  return (
    <SafeScreen>
      <YStack flex={1} minHeight={0} backgroundColor="#0B1227">
        <YStack position="relative" backgroundColor="#111936" overflow="hidden">
          <YStack position="absolute" left={0} right={0} bottom={0} opacity={0.9}>
            <Nightscape height={134} />
          </YStack>
          <YStack paddingHorizontal={20} paddingTop={16} paddingBottom={15}>
            <AppHeader navigation={navigation} />
            <ActionButtons navigation={navigation} onRefresh={handleRefresh} />
          </YStack>
        </YStack>
        <SIMSelector />
        <YStack position="absolute" bottom={0} left={0} right={0} pointerEvents="none" opacity={0.36}>
          <Nightscape height={64} footer />
        </YStack>
      </YStack>
    </SafeScreen>
  );
}

export default Main;
