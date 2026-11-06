import React, {useEffect} from 'react';
import {useTranslation} from 'react-i18next';
import {Platform, ScrollView, ToastAndroid, TouchableOpacity} from 'react-native';
import {Adapters} from '@/lpa/adapters/registry';
import {Text as TText, useTheme, XStack, YStack, View as TView} from 'tamagui';
import {Bluetooth} from '@tamagui/lucide-icons';
import SlotTabs from '@/features/main/components/SlotTabs';
import BluetoothSheet from '@/features/bluetooth/BluetoothSheet';
import Clipboard from '@react-native-clipboard/clipboard';
import {usePreference} from '@/shared/hooks/usePreference';

import {useAppDispatch, useAppSelector, selectDeviceList} from '@/store';
import {setTargetDevice} from '@/store/slices';
import ProfileSelector from '@/features/main/ProfileSelector';
import {OMAPIBridge} from '@/lpa/bridge/nativeModules';
import {fontSize, iconSize, radius} from '@/shared/theme/tokens';

export default function SIMSelector() {
  const [bluetoothOpen, setBluetoothOpen] = React.useState(false);
  const theme = useTheme();
  const {deviceList: allDevices, targetDevice} = useAppSelector(selectDeviceList);
  const dispatch = useAppDispatch();
  const {t} = useTranslation(['main']);
  const showSlots = usePreference('showSlots', 'all');

  let deviceList = allDevices.filter(id => !!Adapters[id]);

  if (showSlots === 'possible') {
    deviceList = deviceList.filter(
      x => Adapters[x].device.available || Adapters[x].device.slotAvailable,
    );
  } else if (showSlots === 'available') {
    deviceList = deviceList.filter(x => Adapters[x].device.available);
  }

  const firstAvailable = deviceList.map(x => Adapters[x].device.available).indexOf(true);
  const [currentTab, setCurrentTab] = React.useState<string | undefined>(
    firstAvailable < 0 ? deviceList[0] : deviceList[firstAvailable],
  );

  const selected = currentTab;
  const adapter = selected ? Adapters[selected] : null;

  useEffect(() => {
    if ((!currentTab || !deviceList.includes(currentTab)) && deviceList.length > 0) {
      const firstAvailable = deviceList.map(x => Adapters[x].device.available).indexOf(true);
      setCurrentTab(firstAvailable < 0 ? deviceList[0] : deviceList[firstAvailable]);
    }
  }, [deviceList, currentTab]);

  useEffect(() => {
    if (targetDevice) {
      if (deviceList.indexOf(targetDevice) !== -1) {
        setCurrentTab(targetDevice);
        dispatch(setTargetDevice(null));
      }
    }
  }, [targetDevice, deviceList, dispatch]);

  return (
    <TView flex={1} minHeight={0} backgroundColor="$background">
      {/* Mounted once for the whole screen, outside the branch below.
          Rendering a sheet inside each branch means the Modal is unmounted and
          a different one mounted the instant the first reader connects — and
          iOS silently drops a presentation that begins while another is still
          in flight, leaving a modal nothing can dismiss. Every later sheet
          then fails to appear, including on other screens. */}
      <BluetoothSheet open={bluetoothOpen} onOpenChange={setBluetoothOpen} />

      {deviceList.length === 0 ? (
        <ScrollView style={{flex: 1}} bounces alwaysBounceVertical overScrollMode="always">
          <YStack flex={1} paddingTop={28} paddingHorizontal={16} gap={16} alignItems="center">
            <YStack gap={6} alignItems="center">
              <TText color="$textDefault" fontSize={fontSize.xl} textAlign="center">
                {t('main:no_device')}
              </TText>
              <TText color="$color6" fontSize={fontSize.md} textAlign="center">
                {t('main:no_device_hint')}
              </TText>
            </YStack>
            <TouchableOpacity
              onPress={() => setBluetoothOpen(true)}
              style={{
                backgroundColor: theme.primaryColor?.val,
                borderRadius: radius.md,
                paddingVertical: 13,
                paddingHorizontal: 22,
              }}>
              <XStack alignItems="center" gap={9}>
                <Bluetooth size={iconSize.sm} color={theme.onFilled?.val as string} />
                <TText color={theme.onFilled?.val} fontSize={fontSize.lg} fontWeight={'600' as any}>
                  {t('main:bluetooth_scan')}
                </TText>
              </XStack>
            </TouchableOpacity>
          </YStack>
        </ScrollView>
      ) : (
        <TView flex={1} minHeight={0} key={deviceList.length} backgroundColor="$background">
          <SlotTabs
            tabs={deviceList.map(name => ({
              key: name,
              label: Adapters[name].device.displayName,
              available: Adapters[name].device.available,
            }))}
            selected={currentTab ?? ''}
            onSelect={setCurrentTab}
            onBluetooth={() => setBluetoothOpen(true)}
            bluetoothActive={deviceList.some(name => Adapters[name].device.type.startsWith('ble'))}
            emptyLabel={t('main:no_chip_detected')}
          />
          {selected && adapter != null && (
            <YStack key={selected} flex={1} minHeight={0} opacity={1} x={0}>
              {adapter.device.available ? (
                // The gutters live here rather than in a PageContainer: the tab
                // strip above must run edge to edge, so padding cannot wrap both.
                <YStack flex={1} minHeight={0} key={selected} paddingHorizontal={20} paddingTop={4}>
                  <ProfileSelector deviceId={selected} />
                  {/* Footnotes to the list, not a call to action above it. */}
                </YStack>
              ) : (
                <ScrollView bounces alwaysBounceVertical overScrollMode="always">
                  <YStack flex={1} paddingTop={20} gap={10}>
                    <TText color="$textDefault" fontSize={fontSize.xl} textAlign="center">
                      {t('main:error_device')}
                    </TText>
                    <TText
                      color="$color"
                      fontSize={fontSize.xxl}
                      textAlign="center"
                      marginBottom={40}>
                      {adapter.device.description}
                    </TText>
                    {Platform.OS === 'android' && adapter.device.signatures && (
                      <>
                        <TText color="$textDefault" fontSize={fontSize.xl} textAlign="center">
                          {t('main:android_aram')}
                        </TText>
                        <YStack flex={1} paddingBottom={40} gap={10}>
                          {adapter.device.signatures.split(',').map((s: string) => (
                            <TText
                              color="$textDefault"
                              fontSize={fontSize.md}
                              textAlign="center"
                              key={s}
                              onPress={() => {
                                ToastAndroid.show(`ARA-M ${s} Copied`, ToastAndroid.SHORT);
                                Clipboard.setString(s);
                              }}>
                              {s}
                            </TText>
                          ))}
                        </YStack>
                      </>
                    )}
                    {/* The STK menu is an OMAPI slot's own applet browser, opened
                    by the Android telephony stack. A reader reached over
                    Bluetooth or CCID has no such menu to open. */}
                    {Platform.OS === 'android' && selected.startsWith('omapi') && (
                      <TText
                        color="$textDefault"
                        textDecorationLine="underline"
                        fontSize={fontSize.xxl}
                        textAlign="center"
                        marginTop={40}
                        onPress={() => {
                          OMAPIBridge.openSTK(adapter.device.deviceName);
                        }}>
                        {t('main:open_stk_menu')}
                      </TText>
                    )}
                  </YStack>
                </ScrollView>
              )}
            </YStack>
          )}
        </TView>
      )}
    </TView>
  );
}
