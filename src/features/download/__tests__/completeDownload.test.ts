import {completeDownload} from '../completeDownload';
import type {DownloadResult, NotificationResult} from '@/lpa/types/operations';
function adapter() {
  return {
    downloadProfile: jest.fn(
      async (): Promise<DownloadResult> => ({success: true, refreshWarning: true}),
    ),
    processNotifications: jest.fn(
      async (): Promise<NotificationResult> => ({
        result: 0,
        total: 1,
        sent: 1,
        failed: 0,
        retained: 0,
        removed: 1,
      }),
    ),
  };
}
test('installed result survives both refresh failure and notification exception', async () => {
  const a = adapter();
  a.processNotifications.mockRejectedValue(Error('offline'));
  expect(await completeDownload(a, 'session', '', 'synthetic', () => {})).toEqual({
    success: true,
    refreshWarning: true,
    notificationWarning: true,
  });
  expect(a.downloadProfile).toHaveBeenCalledTimes(1);
});
test('failed delivery is a sync warning, not installation failure', async () => {
  const a = adapter();
  a.processNotifications.mockResolvedValue({
    result: -1,
    total: 1,
    sent: 0,
    failed: 1,
    retained: 1,
    removed: 0,
  });
  expect(
    (await completeDownload(a, 'session', '', 'synthetic', () => {})).notificationWarning,
  ).toBe(true);
});
test('failed download never triggers follow-up delivery', async () => {
  const a = adapter();
  a.downloadProfile.mockResolvedValue({success: false});
  expect(await completeDownload(a, 'session', '', 'synthetic', () => {})).toEqual({success: false});
  expect(a.processNotifications).not.toHaveBeenCalled();
});
