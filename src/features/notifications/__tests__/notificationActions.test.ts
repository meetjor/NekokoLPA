import {deliverNotification} from '../notificationActions';

function adapter() {
  return {
    sendNotification: jest.fn(async () => ({result: 0})),
    deleteNotification: jest.fn(async (): Promise<{refreshWarning?: boolean}> => ({})),
  };
}
test('failed delivery never removes a notification', async () => {
  const a = adapter();
  a.sendNotification.mockResolvedValue({result: -1});
  expect(await deliverNotification(a, 7, true)).toEqual({sent: false});
  expect(a.deleteNotification).not.toHaveBeenCalled();
});
test('send-only keeps the acknowledged notification', async () => {
  const a = adapter();
  expect(await deliverNotification(a, 7, false)).toEqual({sent: true});
  expect(a.deleteNotification).not.toHaveBeenCalled();
});
test('send and remove preserves ordering', async () => {
  const a = adapter();
  await deliverNotification(a, 7, true);
  expect(a.sendNotification).toHaveBeenCalledWith(7);
  expect(a.deleteNotification).toHaveBeenCalledWith(7);
  expect(a.sendNotification.mock.invocationCallOrder[0]).toBeLessThan(
    a.deleteNotification.mock.invocationCallOrder[0],
  );
});
test('cleanup failure does not falsely say delivery failed', async () => {
  const a = adapter();
  a.deleteNotification.mockRejectedValue(Error('removed reader'));
  expect(await deliverNotification(a, 7, true)).toEqual({sent: true, cleanupWarning: true});
});
test('failed list read after removal requests refresh, not resend', async () => {
  const a = adapter();
  a.deleteNotification.mockResolvedValue({refreshWarning: true});
  expect(await deliverNotification(a, 7, true)).toEqual({sent: true, refreshWarning: true});
});
