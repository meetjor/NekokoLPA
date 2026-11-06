import {setupDevices} from '../deviceManager';
import {Adapters} from '../adapters/registry';
import {OMAPIBridge} from '../bridge/nativeModules';
import {Adapter} from '../adapters/Adapter';
jest.mock('react-native', () => ({Platform: {OS: 'android'}}));
jest.mock('@/shared/utils/aid', () => ({getAIDList: () => ''}));
jest.mock('@/lpa/bridge/nativeModules', () => ({OMAPIBridge: {listDevices: jest.fn()}, CCIDPlugin: {listReaders: async () => []}}));
jest.mock('@/lpa/bridge/runtime', () => ({setupDevice: async () => async (command: string) => command === 'get_profiles' ? [] : {eidValue: 'synthetic'}}));
jest.mock('@/lpa/adapters/CcidDevice', () => ({CcidDevice: class {}}));
jest.mock('@/lpa/adapters/EstkMeRedDevice', () => ({EstkMeRed: class {}}));
jest.mock('@/lpa/adapters/EstkMeRed2Device', () => ({EstkMeRed2: class {}}));
jest.mock('@/lpa/adapters/BeeSimDevice', () => ({BeeSimDevice: class {}}));
jest.mock('@/lpa/adapters/SimLinkDevice', () => ({SimLinkDevice: class {}}));
const slots = (available: boolean) => JSON.stringify([{name: 'SIM1', available: String(available)}]);
beforeEach(() => { for (const id of Object.keys(Adapters)) delete Adapters[id]; jest.clearAllMocks(); });
test('rediscovery updates availability and reads profiles of the existing adapter', async () => {
  (OMAPIBridge.listDevices as jest.Mock).mockResolvedValue(slots(false));
  await setupDevices(jest.fn());
  const original = Adapters['omapi:SIM1'];
  const refresh = jest.spyOn(original, 'refresh');
  (OMAPIBridge.listDevices as jest.Mock).mockResolvedValue(slots(true));
  await setupDevices(jest.fn());
  expect(Adapters['omapi:SIM1']).toBe(original);
  expect(original.device.available).toBe(true);
  expect(refresh).toHaveBeenCalledTimes(1);
  expect(original.profiles).toEqual([]);
});
test('removal invalidates adapter and clears Redux state', async () => {
  (OMAPIBridge.listDevices as jest.Mock).mockResolvedValue(slots(true));
  await setupDevices(jest.fn());
  const original = Adapters['omapi:SIM1'];
  (OMAPIBridge.listDevices as jest.Mock).mockResolvedValue('[]');
  const dispatch = jest.fn(); await setupDevices(dispatch);
  expect(original.obsolete).toBe(true);
  expect(Adapters['omapi:SIM1']).toBeUndefined();
  expect(dispatch.mock.calls.some(([action]) => action.type === 'deviceState/removeDeviceState')).toBe(true);
});
test('enumeration failure keeps registry and finishes initial discovery state', async () => {
  (OMAPIBridge.listDevices as jest.Mock).mockRejectedValue(Error('service unavailable'));
  const dispatch = jest.fn();
  await expect(setupDevices(dispatch)).rejects.toThrow('service unavailable');
  expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({type: 'deviceList/setInternalDevices', payload: []}));
});
test('active command prevents enumeration from disturbing its channel', async () => {
  const adapter = new Adapter({deviceId: 'busy'} as any, jest.fn()); adapter.isLocked = true;
  await expect(setupDevices(jest.fn())).rejects.toThrow('operation in progress');
  expect(OMAPIBridge.listDevices).not.toHaveBeenCalled();
});
test('discovery calls are serialized', async () => {
  let finish!: () => void;
  (OMAPIBridge.listDevices as jest.Mock).mockImplementationOnce(() => new Promise<string>(resolve => {finish = () => resolve('[]');})).mockResolvedValue('[]');
  const a = setupDevices(jest.fn()); const b = setupDevices(jest.fn());
  await Promise.resolve(); await Promise.resolve();
  expect(OMAPIBridge.listDevices).toHaveBeenCalledTimes(1);
  finish(); await Promise.all([a, b]);
  expect(OMAPIBridge.listDevices).toHaveBeenCalledTimes(2);
});
