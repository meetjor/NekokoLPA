import type {Adapter} from '@/lpa/adapters/Adapter';

/** Acknowledgement, removal and re-read are separate outcomes. Never remove an unsent item. */
export async function deliverNotification(
  adapter: Pick<Adapter, 'sendNotification' | 'deleteNotification'>,
  sequence: number,
  remove: boolean,
): Promise<{sent: boolean; cleanupWarning?: boolean; refreshWarning?: boolean}> {
  const result = await adapter.sendNotification(sequence);
  if (result.result !== 0) return {sent: false};
  if (!remove) return {sent: true};
  // Adapter distinguishes a failed removal from a failed subsequent list read.
  try {
    const cleanup = await adapter.deleteNotification(sequence);
    return {sent: true, refreshWarning: cleanup.refreshWarning};
  } catch {
    return {sent: true, cleanupWarning: true};
  }
}
