import {setupDevice} from '../runtime';
import {Adapter, Device} from '@/lpa/adapters/Adapter';
import {Adapters} from '@/lpa/adapters/registry';

jest.mock('@/lpa/bridge/nativeModules', () => ({CustomHttp: {sendHttpRequest: jest.fn()}}));
jest.mock('@/lpa/core', () => ({
  CLA_PROPRIETARY: 128, channelClaHex: () => '81',
  LpaDispatcher: class {
    private options: any;
    constructor(options: any) { this.options = options; }
    setChannel() {}
    execute() { return this.options.transmit('80CA000000'); }
  },
}));

test('reader ID reuse binds transmission to the new adapter, not the removed instance', async () => {
  const oldTransmit = jest.fn(async () => '9000');
  const freshTransmit = jest.fn(async () => '9000');
  const device = (transmit: typeof oldTransmit) => ({deviceId: 'reader', channel: '1', transmit} as unknown as Device);
  const old = new Adapter(device(oldTransmit), jest.fn());
  await (await setupDevice(old))('get_eid', []);
  await old.dispose(); delete Adapters.reader;
  const fresh = new Adapter(device(freshTransmit), jest.fn());
  await (await setupDevice(fresh))('get_eid', []);
  expect(oldTransmit).toHaveBeenCalledTimes(1);
  expect(freshTransmit).toHaveBeenCalledTimes(1);
  delete Adapters.reader;
});
