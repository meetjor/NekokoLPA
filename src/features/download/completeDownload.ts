import type {Adapter} from '@/lpa/adapters/Adapter';
import type {ProgressUpdate} from '@/lpa/types/euicc';
import type {DownloadResult} from '@/lpa/types/operations';

/** Never turn an installed profile into a failed download because follow-up sync failed. */
export async function completeDownload(
  adapter: Pick<Adapter, 'downloadProfile' | 'processNotifications'>,
  session: string,
  confirmationCode: string,
  iccid: string,
  onProgress: (update: ProgressUpdate) => void,
): Promise<DownloadResult> {
  const result = await adapter.downloadProfile(session, confirmationCode, onProgress);
  if (!result.success) return result;
  try {
    const notifications = await adapter.processNotifications(iccid);
    return {
      ...result,
      notificationWarning: notifications.failed > 0 || !!notifications.refreshWarning,
    };
  } catch {
    return {...result, notificationWarning: true};
  }
}
