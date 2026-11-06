import {connectDevice, disconnectDevice, reconnectDevice} from '../connection';
import {Adapters, ConnectedBluetoothDevices} from '@/lpa/adapters/registry';
import {setupDevices} from '@/lpa/deviceManager';
jest.mock('@/lpa/deviceManager', () => ({setupDevices: jest.fn(async () => {})}));
beforeEach(() => {
  jest.clearAllMocks();
  ConnectedBluetoothDevices.length = 0;
  for (const key of Object.keys(Adapters)) delete Adapters[key];
});
test('explicit reconnect uses the adapter lifecycle, not an unsynchronized device call', async () => {
  const reconnect = jest.fn(async () => true);
  const raw = jest.fn();
  Adapters['ble:test'] = {reconnect, device: {reconnect: raw}} as any;
  expect(await reconnectDevice('test', jest.fn())).toBe(true);
  expect(reconnect).toHaveBeenCalledTimes(1);
  expect(raw).not.toHaveBeenCalled();
});
test('disconnect disposes old tasks and clears registry/state even if subsequent discovery fails', async () => {
  const dispose = jest.fn(async () => {});
  Adapters['ble:test'] = {dispose} as any;
  ConnectedBluetoothDevices.push({id: 'test'} as any);
  (setupDevices as jest.Mock).mockRejectedValueOnce(Error('discovery failed'));
  const dispatch = jest.fn();
  await expect(disconnectDevice('test', dispatch)).rejects.toThrow('discovery failed');
  expect(dispose).toHaveBeenCalledTimes(1);
  expect(Adapters['ble:test']).toBeUndefined();
  expect(ConnectedBluetoothDevices).toEqual([]);
  expect(dispatch).toHaveBeenCalledWith(
    expect.objectContaining({type: 'deviceState/removeDeviceState', payload: 'ble:test'}),
  );
});
test('active reader operations cannot be disconnected or reconnected by the sheet', async () => {
  Adapters['ble:test'] = {isLocked: true} as any;
  await expect(disconnectDevice('test', jest.fn())).rejects.toThrow('in progress');
  await expect(reconnectDevice('test', jest.fn())).rejects.toThrow('in progress');
  expect(setupDevices).not.toHaveBeenCalled();
});
test('rescanning an existing id retains the new BLE transport object', async () => {
  await connectDevice({id: 'test', name: 'old'} as any);
  const fresh = {id: 'test', name: 'fresh'} as any;
  await connectDevice(fresh);
  expect(ConnectedBluetoothDevices).toEqual([fresh]);
  expect(ConnectedBluetoothDevices[0]).toBe(fresh);
});
