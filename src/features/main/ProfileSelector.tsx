import {Text, XStack, YStack, View as TView, useTheme} from 'tamagui';
import {TouchableOpacity} from 'react-native';
import {Plus} from '@tamagui/lucide-icons';
import {useNavigation} from '@react-navigation/native';
import {useTranslation} from 'react-i18next';
import ProfileCardHeader from './ProfileCardHeader';
import {reportOperationError} from '@/shared/utils/loading';
import {radius} from '@/shared/theme/tokens';
import {useSelector} from 'react-redux';
import {Profile} from '@/lpa/types/profile';
import {RefreshControl} from 'react-native-gesture-handler';
import React, {useCallback, useMemo, useState} from 'react';
import {Adapters} from '@/lpa/adapters/registry';
import {selectDeviceState} from '@/store';
import {ProfileRow} from '@/features/main/ProfileRow';
import {FlatList} from 'react-native-gesture-handler';
import {useLoading} from '@/app/providers/LoadingProvider';

export default function ProfileSelector({deviceId}: {deviceId: string}) {
  const theme = useTheme();
  const navigation = useNavigation<any>();
  const {t} = useTranslation('main');
  const DeviceState = useSelector(selectDeviceState(deviceId));
  const [refreshing, setRefreshing] = useState(false);
  const {isLoading} = useLoading();
  const adapter = Adapters[deviceId];

  const profiles = useMemo(() => {
    const profileList = DeviceState.profiles;
    if (!profileList?.map) return [];

    return profileList.map((profile: Profile) => ({
      ...profile,
      selected: profile.profileState === 1,
    }));
  }, [DeviceState.profiles]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await adapter.refresh();
    } catch {
      reportOperationError();
    } finally {
      setRefreshing(false);
    }
  }, [adapter]);

  // Separate profile cards make the currently selected line easier to
  // recognise at a glance, without needing to inspect the switch position.
  const renderItem = useCallback(
    ({item}: {item: Profile & {selected: boolean}}) => (
      <TView
        style={{
          marginBottom: 10,
          borderRadius: radius.lg,
          borderWidth: 1,
          borderColor: item.selected ? theme.primaryColor?.val : theme.borderColor?.val,
          backgroundColor: theme.surfaceRow?.val,
          overflow: 'hidden',
        }}>
        <ProfileRow
          deviceId={deviceId}
          profile={item}
          syncing={
            DeviceState.switchSyncing === true && DeviceState.switchTargetIccid === item.iccid
          }
          syncError={
            DeviceState.refreshError === true || (DeviceState.switchSyncError === true && DeviceState.switchTargetIccid === item.iccid)
          }
        />
      </TView>
    ),
    [
      theme,
      deviceId,
      DeviceState.switchSyncing,
      DeviceState.switchSyncError,
      DeviceState.refreshError,
      DeviceState.switchTargetIccid,
    ],
  );

  return (
    <FlatList
      style={{
        // Individual cards sit on the page instead of one solid list panel.
        flexGrow: 1,
        flexShrink: 1,
      }}
      contentContainerStyle={{paddingBottom: 18}}
      ListHeaderComponent={
        <>
          <ProfileCardHeader deviceId={deviceId} />
          {DeviceState.refreshError && <Text color="$statusWarning" marginBottom={12}>{t('ui_refresh_failed')}</Text>}
          <XStack alignItems="center" justifyContent="space-between" gap={8} marginBottom={12}>
            <Text color="$textDefault" fontSize={18} fontWeight="600" flex={1}>
              {t('ui_installed_profiles', {count: profiles.length})}
            </Text>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={t('ui_add_profile')}
              disabled={isLoading}
              onPress={() => navigation.navigate('Scanner', {deviceId})}
              style={{
                minHeight: 48,
                paddingHorizontal: 12,
                borderRadius: 12,
                backgroundColor: theme.primaryColor?.val,
                justifyContent: 'center',
              }}>
              <XStack alignItems="center" gap={6}>
                <Plus size={19} color={theme.btnForeground?.val} />
                <Text fontSize={14} color="$btnForeground" fontWeight="600">
                  {t('ui_add')}
                </Text>
              </XStack>
            </TouchableOpacity>
          </XStack>
        </>
      }
      ListEmptyComponent={
        <YStack padding={24} gap={8} backgroundColor="$surfaceRow" borderRadius={14}>
          <Text color="$textDefault" fontSize={16}>
            {t('ui_empty_profiles')}
          </Text>
          <Text color="$color6" fontSize={14}>
            {t('ui_empty_profiles_hint')}
          </Text>
        </YStack>
      }
      extraData={DeviceState}
      data={profiles}
      keyExtractor={item => item.iccid || String(item)}
      renderItem={renderItem}
      bounces
      alwaysBounceVertical
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator
      maxToRenderPerBatch={10}
      windowSize={10}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
    />
  );
}
