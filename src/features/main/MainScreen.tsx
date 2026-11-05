import React, {useCallback} from 'react';
import {useDispatch} from 'react-redux';
import {YStack} from 'tamagui';
import SafeScreen from '@/shared/ui/SafeScreen';
import SIMSelector from '@/features/main/SIMSelector';
import type {RootScreenProps} from '@/app/navigation/types';
import {setupDevices} from '@/lpa/deviceManager';
import AppHeader from '@/features/main/components/AppHeader';
import ActionButtons from '@/features/main/components/ActionButtons';

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
      <YStack
        flex={1}
        minHeight={0}
        backgroundColor="$background"
        width="100%"
        maxWidth={800}
        alignSelf="center">
        <YStack paddingHorizontal={20} paddingTop={16} paddingBottom={8} gap={16}>
          <AppHeader />
          <ActionButtons navigation={navigation} onRefresh={handleRefresh} />
        </YStack>
        <SIMSelector />
      </YStack>
    </SafeScreen>
  );
}
export default Main;
