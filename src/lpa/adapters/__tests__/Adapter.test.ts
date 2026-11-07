import type {LpaCommand, LpaExecutor} from '@/lpa/types/commands';
import {Adapter, Device} from '../Adapter';
import {Adapters} from '../registry';

jest.mock('@/lpa/bridge/runtime', () => ({setupDevice: async (a: Adapter) => a._execute}));

function create() {
  const device: Device = {
    available: true,
    channel: '1',
    type: 'test',
    deviceId: 'test',
    deviceName: 'test',
    displayName: 'test',
    explicitConnectionRequired: false,
    connect: jest.fn(async () => true),
    disconnect: jest.fn(async () => true),
    reconnect: jest.fn(async () => true),
    refresh: jest.fn(async () => true),
    transmit: jest.fn(async () => '9000'),
  };
  const dispatch = jest.fn();
  const adapter = new Adapter(device, dispatch);
  adapter._execute = jest.fn(async () => []) as unknown as LpaExecutor;
  return {adapter, device, dispatch};
}
beforeEach(() => {
  for (const id of Object.keys(Adapters)) delete Adapters[id];
});

test('connect is idempotent', async () => {
  const {adapter, device} = create();
  expect(await adapter.connect()).toBe(true);
  expect(await adapter.connect()).toBe(true);
  expect(device.connect).toHaveBeenCalledTimes(1);
  expect(adapter.connected).toBe(true);
});
test('failed refresh rejects and marks retained state unconfirmed', async () => {
  const {adapter, dispatch} = create();
  adapter.connected = true;
  adapter._execute = jest.fn(async () => {
    throw Error('offline');
  });
  await expect(adapter.refresh()).rejects.toThrow('offline');
  expect(dispatch.mock.calls.at(-1)?.[0].payload[0]).toEqual({refreshError: true});
  expect(adapter.isLocked).toBe(false);
});
test('read-only failure can recover once', async () => {
  const {adapter, device} = create();
  adapter._execute = jest.fn().mockRejectedValueOnce(Error('reset')).mockResolvedValueOnce([]);
  await expect(adapter.getProfiles()).resolves.toEqual([]);
  expect(adapter._execute).toHaveBeenCalledTimes(2);
  expect(device.connect).toHaveBeenCalledTimes(1);
});
test.each<LpaCommand>([
  'delete_profile',
  'rename_profile',
  'download_profile',
  'authenticate_profile',
  'process_notifications',
  'enable_profile',
  'disable_profile',
])('%s is not replayed after ambiguous response loss', async command => {
  const {adapter} = create();
  adapter._execute = jest.fn(async () => {
    throw Error('lost response');
  });
  await expect(adapter.execute(command, [])).rejects.toThrow('lost response');
  expect(adapter._execute).toHaveBeenCalledTimes(1);
  expect(adapter.isLocked).toBe(false);
});
test('installation success survives failed follow-up reads', async () => {
  const {adapter} = create();
  adapter._execute = jest.fn(async (command: LpaCommand) => {
    if (command === 'download_profile') return {success: true};
    throw Error('refresh failed');
  }) as unknown as LpaExecutor;
  await expect(adapter.downloadProfile('session', '', () => {})).resolves.toEqual({
    success: true,
    refreshWarning: true,
  });
});
test('dispose suppresses old writes and new commands', async () => {
  const {adapter, dispatch} = create();
  await adapter.dispose();
  adapter.setState({eid: 'synthetic'});
  expect(dispatch).not.toHaveBeenCalled();
  await expect(adapter.getProfiles()).rejects.toThrow('disconnected');
});
test('busy switch does not publish an unexecuted expected state', async () => {
  const {adapter, dispatch} = create();
  adapter.isLocked = true;
  await expect(adapter.enableProfileByIccId('synthetic')).rejects.toThrow('busy');
  expect(dispatch).not.toHaveBeenCalled();
});
test('invalid profile response is not a valid empty card', async () => {
  const {adapter} = create();
  adapter._execute = jest.fn(async () => null) as unknown as LpaExecutor;
  await expect(adapter.getProfiles()).rejects.toThrow('Invalid profile response');
});

test('notification removal success survives subsequent list failure', async () => {
  const {adapter} = create();
  adapter._execute = jest.fn(async (command: LpaCommand) => {
    if (command === 'delete_notification_single') return {result: 0};
    throw Error('read failed');
  }) as unknown as LpaExecutor;
  expect(await adapter.deleteNotification(7)).toEqual({refreshWarning: true});
  expect(
    (adapter._execute as jest.Mock).mock.calls.filter(
      ([command]) => command === 'delete_notification_single',
    ),
  ).toHaveLength(1);
});
