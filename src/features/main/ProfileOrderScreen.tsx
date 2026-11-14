import React, {useMemo, useState} from 'react';
import {Alert, TouchableOpacity} from 'react-native';
import {Text, XStack, YStack, useTheme} from 'tamagui';
import {ArrowDown, ArrowUp, GripVertical} from '@tamagui/lucide-icons';
import DraggableFlatList from 'react-native-draggable-flatlist';
import {useSelector} from 'react-redux';
import {useTranslation} from 'react-i18next';
import type {RootScreenProps} from '@/app/navigation/types';
import {selectDeviceState, store} from '@/store';
import {Adapters} from '@/lpa/adapters/registry';
import {useProfileOrder} from '@/shared/hooks/useProfileOrder';
import {usePreference} from '@/shared/hooks/usePreference';
import {preferences} from '@/shared/storage';
import {orderProfiles, moveProfile, profileOrderLabel} from '@/shared/utils/profileOrder';
import {isRedactMode} from '@/shared/utils/redact';
import Screen from '@/shared/ui/Screen';

export default function ProfileOrderScreen({route, navigation}: RootScreenProps<'ProfileOrder'>) {
  const {deviceId, eid} = route.params;
  const {t} = useTranslation('main');
  const theme = useTheme();
  const state = useSelector(selectDeviceState(deviceId));
  const {key, order} = useProfileOrder(eid);
  const [draft, setDraft] = useState<string[] | null>(null);
  const [dragging, setDragging] = useState(false);
  const redact = usePreference('redactMode', 'none');
  const profiles = useMemo(() => orderProfiles(state.profiles || [], draft ?? order), [state.profiles, draft, order]);
  const valid = key && state.eid === eid && state.available === true && !state.refreshError &&
    !state.switchSyncing && Adapters[deviceId] && !Adapters[deviceId].obsolete;
  const ids = profiles.map(profile => profile.iccid);
  const save = () => {
    // Re-read at commit time: a card can be unplugged/replaced during a drag.
    const current = selectDeviceState(deviceId)(store.getState());
    if (!key || current.eid !== eid || !current.available || current.refreshError || current.switchSyncing ||
      !Adapters[deviceId] || Adapters[deviceId].obsolete) {
      Alert.alert(t('ui_sort_unavailable'));
      return;
    }
    try {
      preferences.set(key, JSON.stringify(orderProfiles(current.profiles || [], draft ?? order).map(p => p.iccid)));
      navigation.goBack();
    } catch { Alert.alert(t('ui_sort_save_failed')); }
  };
  return <Screen title={t('ui_sort_profiles')} subtitle={t('ui_sort_hint')} keyboardAvoiding={false} scrollViewProps={{scrollEnabled: false}}>
    {!valid ? <Text color="$statusWarning">{t('ui_sort_unavailable')}</Text> : null}
    <DraggableFlatList containerStyle={{flex: 1}} data={profiles} keyExtractor={item => item.iccid}
      activationDistance={6} onDragBegin={() => setDragging(true)}
      onDragEnd={({data}) => { setDraft(data.map(p => p.iccid)); setDragging(false); }}
      renderItem={({item, drag, isActive}) => {
        const index = ids.indexOf(item.iccid);
        const label = profileOrderLabel(item, isRedactMode(redact) ? redact : 'none', t('ui_profile'));
        return <YStack testID={`sort-row-${index}`} marginBottom={10} padding={12} borderRadius={14}
          backgroundColor="$surfaceRow" borderWidth={1} borderColor={isActive ? '$primaryColor' : '$borderColor'}>
          <XStack alignItems="center" gap={8}>
            <Text color="$color6">{index + 1}</Text>
            <Text testID={`sort-name-${index}`} color="$textDefault" fontSize={16} flex={1} numberOfLines={2}>{label}</Text>
            <TouchableOpacity testID={`sort-handle-${index}`} accessibilityRole="button"
              accessibilityLabel={t('ui_sort_drag', {name: label})} disabled={!valid || isActive}
              onLongPress={drag} delayLongPress={200} style={{width: 48, height: 48, alignItems: 'center', justifyContent: 'center'}}>
              <GripVertical size={24} color={theme.color6?.val} />
            </TouchableOpacity>
          </XStack>
          <XStack justifyContent="flex-end">
            {([-1, 1] as const).map(direction => <TouchableOpacity key={direction}
              testID={`sort-${direction === -1 ? 'up' : 'down'}-${index}`} accessibilityRole="button"
              accessibilityLabel={t(direction === -1 ? 'ui_sort_up' : 'ui_sort_down', {name: label})}
              disabled={!valid || dragging || index + direction < 0 || index + direction >= ids.length}
              onPress={() => setDraft(moveProfile(ids, item.iccid, direction))}
              style={{width: 48, height: 48, alignItems: 'center', justifyContent: 'center',
                opacity: !valid || dragging || index + direction < 0 || index + direction >= ids.length ? 0.35 : 1}}>
              {direction === -1 ? <ArrowUp size={20} color={theme.primaryColor?.val} /> : <ArrowDown size={20} color={theme.primaryColor?.val} />}
            </TouchableOpacity>)}
          </XStack>
        </YStack>;
      }} />
    <TouchableOpacity testID="sort-save" accessibilityRole="button" disabled={!valid || dragging}
      onPress={save} style={{minHeight: 48, alignItems: 'center', justifyContent: 'center', opacity: valid && !dragging ? 1 : 0.4}}>
      <Text color="$primaryColor" fontSize={17} fontWeight="600">{t('ui_sort_done')}</Text>
    </TouchableOpacity>
  </Screen>;
}
