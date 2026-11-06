import {setupDevices} from '../deviceManager';
import {Adapters, ConnectedBluetoothDevices} from '../adapters/registry';
import {OMAPIBridge, CCIDPlugin} from '../bridge/nativeModules';
import {Adapter} from '../adapters/Adapter';
jest.mock('react-native', () => ({Platform: {OS: 'android'}}));
jest.mock('@/shared/utils/aid', () => ({getAIDList: () => ''}));
jest.mock('@/lpa/bridge/nativeModules', () => ({
  OMAPIBridge: {listDevices: jest.fn()},
  CCIDPlugin: {listReaders: jest.fn(async () => [])},
}));
jest.mock('@/lpa/bridge/runtime', () => ({
  setupDevice: async () => async (command: string) =>
    command === 'get_profiles' ? [] : {eidValue: 'synthetic'},
}));
jest.mock('@/lpa/adapters/CcidDevice', () => ({
  CcidDevice: class {
    type = 'ccid';
    available = false;
    channel = '1';
    deviceId: string;
    constructor(name: string) {
      this.deviceId = 'ccid:' + name;
    }
    connect = jest.fn(async () => {
      this.available = true;
      return true;
    });
    disconnect = jest.fn(async () => true);
  },
}));
jest.mock('@/lpa/adapters/EstkMeRedDevice', () => ({
  EstkMeRed: class {
    type = 'ble';
    available = false;
    channel = '1';
    deviceId: string;
    constructor(device: {id: string}) {
      this.deviceId = 'ble:' + device.id;
    }
    connect = jest.fn(async () => {
      this.available = true;
      return true;
    });
    disconnect = jest.fn(async () => true);
  },
}));
jest.mock('@/lpa/adapters/EstkMeRed2Device', () => ({EstkMeRed2: class {}}));
jest.mock('@/lpa/adapters/BeeSimDevice', () => ({BeeSimDevice: class {}}));
jest.mock('@/lpa/adapters/SimLinkDevice', () => ({SimLinkDevice: class {}}));
const slots = (available: boolean) =>
  JSON.stringify([{name: 'SIM1', available: String(available)}]);
beforeEach(() => {
  for (const id of Object.keys(Adapters)) delete Adapters[id];
  jest.clearAllMocks();
  ConnectedBluetoothDevices.length = 0;
  (CCIDPlugin.listReaders as jest.Mock).mockResolvedValue([]);
});
test('rediscovery updates availability and reads profiles of the existing adapter', async () => {
  (OMAPIBridge.listDevices as jest.Mock).mockResolvedValue(slots(false));
  await setupDevices(jest.fn());
  const original = Adapters['omapi:SIM1'];
  const initialize = jest.spyOn(original, 'initialize');
  (OMAPIBridge.listDevices as jest.Mock).mockResolvedValue(slots(true));
  await setupDevices(jest.fn());
  expect(Adapters['omapi:SIM1']).toBe(original);
  expect(original.device.available).toBe(true);
  expect(initialize).toHaveBeenCalledTimes(1);
  expect(original.profiles).toEqual([]);
});
test('removal invalidates adapter and clears Redux state', async () => {
  (OMAPIBridge.listDevices as jest.Mock).mockResolvedValue(slots(true));
  await setupDevices(jest.fn());
  const original = Adapters['omapi:SIM1'];
  (OMAPIBridge.listDevices as jest.Mock).mockResolvedValue('[]');
  const dispatch = jest.fn();
  await setupDevices(dispatch);
  expect(original.obsolete).toBe(true);
  expect(Adapters['omapi:SIM1']).toBeUndefined();
  expect(
    dispatch.mock.calls.some(([action]) => action.type === 'deviceState/removeDeviceState'),
  ).toBe(true);
});
test('enumeration failure keeps registry and finishes initial discovery state', async () => {
  (OMAPIBridge.listDevices as jest.Mock).mockRejectedValue(Error('service unavailable'));
  const dispatch = jest.fn();
  await expect(setupDevices(dispatch)).rejects.toThrow('service unavailable');
  expect(dispatch).toHaveBeenCalledWith(
    expect.objectContaining({type: 'deviceList/setInternalDevices', payload: []}),
  );
});
test('active command prevents enumeration from disturbing its channel', async () => {
  const adapter = new Adapter({deviceId: 'busy'} as any, jest.fn());
  adapter.isLocked = true;
  await expect(setupDevices(jest.fn())).rejects.toThrow('operation in progress');
  expect(OMAPIBridge.listDevices).not.toHaveBeenCalled();
});
test('discovery calls are serialized', async () => {
  let finish!: () => void;
  (OMAPIBridge.listDevices as jest.Mock)
    .mockImplementationOnce(
      () =>
        new Promise<string>(resolve => {
          finish = () => resolve('[]');
        }),
    )
    .mockResolvedValue('[]');
  const a = setupDevices(jest.fn());
  const b = setupDevices(jest.fn());
  await Promise.resolve();
  await Promise.resolve();
  expect(OMAPIBridge.listDevices).toHaveBeenCalledTimes(1);
  finish();
  await Promise.all([a, b]);
  expect(OMAPIBridge.listDevices).toHaveBeenCalledTimes(2);
});

test('USB discovery initializes a reader even when its constructor starts unavailable', async () => {
  (OMAPIBridge.listDevices as jest.Mock).mockResolvedValue('[]');
  (CCIDPlugin.listReaders as jest.Mock).mockResolvedValue(['reader']);
  await setupDevices(jest.fn());
  const a = Adapters['ccid:reader'];
  expect(a.connected).toBe(true);
  expect(a.device.available).toBe(true);
  expect(a.device.connect).toHaveBeenCalledTimes(1);
  const refresh = jest.spyOn(a, 'refresh');
  await setupDevices(jest.fn());
  expect(Adapters['ccid:reader']).toBe(a);
  expect(refresh).toHaveBeenCalledTimes(1);
  expect(a.device.disconnect).not.toHaveBeenCalled();
});
test('same BLE id with a new transport disposes the old session without needing a missing-device scan', async () => {
  (OMAPIBridge.listDevices as jest.Mock).mockResolvedValue('[]');
  ConnectedBluetoothDevices.push({id: 'reader', name: 'ESTKme-RED'} as any);
  await setupDevices(jest.fn());
  const old = Adapters['ble:reader'];
  expect(old.connected).toBe(true);
  const oldWrites = jest.spyOn(old, 'setState');
  ConnectedBluetoothDevices[0] = {id: 'reader', name: 'ESTKme-RED'} as any;
  await setupDevices(jest.fn());
  const fresh = Adapters['ble:reader'];
  expect(fresh).not.toBe(old);
  expect(old.obsolete).toBe(true);
  expect(old.device.disconnect).toHaveBeenCalledTimes(1);
  expect(fresh.connected).toBe(true);
  expect(fresh.device.transportIdentity).toBe(ConnectedBluetoothDevices[0]);
  expect(oldWrites).not.toHaveBeenCalled();
});
