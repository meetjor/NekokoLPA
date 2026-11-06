import {LpaDispatcher} from '../dispatcher';

function dispatcher(failSend: number[], failRemove: number[] = []) {
  const bridge = new LpaDispatcher({transmit: async () => '9000', http: async () => '{}'});
  const card = {
    listNotifications: async () => [3, 1, 2].map(seqNumber => ({seqNumber, profileManagementOperation: 128, iccid: 'synthetic'})),
    retrieveNotification: async (seqNumber: number) => ({seqNumber}),
    sendNotification: jest.fn(async ({seqNumber}) => { if (failSend.includes(seqNumber)) throw Error('offline'); }),
    removeNotification: jest.fn(async (seqNumber: number) => { if (failRemove.includes(seqNumber)) throw Error('card removed'); }),
  };
  (bridge as any).lpa = card;
  return {bridge, card};
}
test('all failed deliveries report failure and are retained', async () => {
  const {bridge, card} = dispatcher([1, 2, 3]);
  expect(await bridge.execute('process_notifications', ['', 128, 1])).toEqual({result: -1, total: 3, sent: 0, failed: 3, removed: 0, retained: 3});
  expect(card.removeNotification).not.toHaveBeenCalled();
});
test('partial batch continues in sequence order and removes only sent notifications', async () => {
  const {bridge, card} = dispatcher([2]);
  expect(await bridge.execute('process_notifications', ['', 128, 1])).toEqual({result: -1, total: 3, sent: 2, failed: 1, removed: 2, retained: 1});
  expect(card.sendNotification.mock.calls.map(([n]) => n.seqNumber)).toEqual([1, 2, 3]);
  expect(card.removeNotification.mock.calls).toEqual([[1], [3]]);
});
test('sent but failed cleanup is retained and not reported as complete', async () => {
  const {bridge} = dispatcher([], [2]);
  expect(await bridge.execute('process_notifications', ['', 128, 1])).toEqual({result: -1, total: 3, sent: 3, failed: 1, removed: 2, retained: 1});
});
test('keep flag retains successfully delivered notifications without a false failure', async () => {
  const {bridge, card} = dispatcher([]);
  expect(await bridge.execute('process_notifications', ['', 128, 0])).toEqual({result: 0, total: 3, sent: 3, failed: 0, removed: 0, retained: 3});
  expect(card.removeNotification).not.toHaveBeenCalled();
});
