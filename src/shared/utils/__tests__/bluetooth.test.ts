import {PermissionsAndroid, Platform} from 'react-native';
import {requestBluetoothPermission} from '../bluetooth';
jest.mock('react-native-ble-plx', () => ({BleManager: jest.fn()}));
jest.mock('react-native', () => ({
  Platform: {OS: 'android', Version: 31},
  PermissionsAndroid: {
    PERMISSIONS: {
      ACCESS_FINE_LOCATION: 'location',
      BLUETOOTH_SCAN: 'scan',
      BLUETOOTH_CONNECT: 'connect',
    },
    RESULTS: {GRANTED: 'granted'},
    request: jest.fn(),
    requestMultiple: jest.fn(),
  },
}));
beforeEach(() => jest.clearAllMocks());
test('Android 12+ requests nearby-device permissions without location', async () => {
  Object.assign(Platform, {OS: 'android', Version: 31});
  (PermissionsAndroid.requestMultiple as jest.Mock).mockResolvedValue({
    scan: 'granted',
    connect: 'granted',
  });
  expect(await requestBluetoothPermission()).toBe(true);
  expect(PermissionsAndroid.requestMultiple).toHaveBeenCalledWith(['scan', 'connect']);
  expect(PermissionsAndroid.request).not.toHaveBeenCalled();
});
test('denied connect permission prevents Bluetooth access', async () => {
  Object.assign(Platform, {OS: 'android', Version: 35});
  (PermissionsAndroid.requestMultiple as jest.Mock).mockResolvedValue({
    scan: 'granted',
    connect: 'denied',
  });
  expect(await requestBluetoothPermission()).toBe(false);
});
test('older Android still requires location for BLE scanning', async () => {
  Object.assign(Platform, {OS: 'android', Version: 30});
  (PermissionsAndroid.request as jest.Mock)
    .mockResolvedValueOnce('denied')
    .mockResolvedValueOnce('granted');
  expect(await requestBluetoothPermission()).toBe(false);
  expect(await requestBluetoothPermission()).toBe(true);
  expect(PermissionsAndroid.request).toHaveBeenCalledWith('location');
  expect(PermissionsAndroid.requestMultiple).not.toHaveBeenCalled();
});
