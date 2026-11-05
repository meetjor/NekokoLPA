import {View as TView} from 'tamagui';
import {radius} from '@/shared/theme/tokens';
import {useSelector} from 'react-redux';
import {Profile} from '@/lpa/types/profile';
import {RefreshControl} from 'react-native-gesture-handler';
import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {Adapters} from '@/lpa/adapters/registry';
import {selectDeviceState} from '@/store';
import {ProfileRow} from '@/features/main/ProfileRow';
import {FlatList} from 'react-native-gesture-handler';
import {useLoading} from '@/app/providers/LoadingProvider';

export default function ProfileSelector({deviceId}: {deviceId: string}) {
  const DeviceState = useSelector(selectDeviceState(deviceId));
  const [refreshing, setRefreshing] = useState(false);
  const {setLoading} = useLoading();
  const adapter = Adapters[deviceId];

  const profiles = useMemo(() => {
    const profileList = DeviceState.profiles;
    if (!profileList?.map) return [];

    return profileList.map((profile: Profile) => ({
      ...profile,
      selected: profile.profileState === 1,
    }));
  }, [DeviceState.profiles]);

  // Automatically remove legacy sorting suffixes (e.g., " ^abc")
  useEffect(() => {
    const toCleanup = profiles.filter(p =>
      /\s?\^[a-z]{3}$/i.test(
        p.profileNickname || p.profileName || (p as any).serviceProviderName || '',
      ),
    );

    if (toCleanup.length > 0) {
      (async () => {
        setLoading(true);
        try {
          for (const p of toCleanup) {
            const current =
              p.profileNickname || p.profileName || (p as any).serviceProviderName || '';
            const cleaned = current.replace(/\s?\^[a-z]{3}$/i, '').trim();
            if (p.iccid) await adapter.setNicknameByIccId(p.iccid, cleaned);
          }
          await adapter.refresh();
        } finally {
          setLoading(false);
        }
      })();
    }
  }, [profiles, adapter, setLoading]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await adapter.refresh();
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
          borderWidth: item.selected ? 1.8 : 1,
          borderColor: item.selected ? '#54C8FF' : '#3E4A76',
          backgroundColor: item.selected ? '#1B2C54' : '#1C2442',
          overflow: 'hidden',
          shadowColor: item.selected ? '#428CFF' : '#000000',
          shadowOpacity: item.selected ? 0.32 : 0.08,
          shadowRadius: item.selected ? 14 : 3,
          elevation: item.selected ? 7 : 1,
        }}>
        <ProfileRow deviceId={deviceId} profile={item} syncing={DeviceState.switchSyncing === true} syncError={DeviceState.switchSyncError === true} />
      </TView>
    ),
    [deviceId, DeviceState.switchSyncing, DeviceState.switchSyncError],
  );

  return (
    <FlatList
      style={{
        // Individual cards sit on the page instead of one solid list panel.
        flexGrow: 0,
        flexShrink: 1,
      }}
      contentContainerStyle={{paddingBottom: 18}}
      data={profiles}
      keyExtractor={item => item.iccid || String(item)}
      renderItem={renderItem}
      bounces
      alwaysBounceVertical
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator
      removeClippedSubviews
      maxToRenderPerBatch={10}
      windowSize={10}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
    />
  );
}
