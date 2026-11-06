import {Alert} from 'react-native';
import i18n from '@/i18n';

export function reportOperationError(): void {
  // Do not expose activation codes, URLs or card identifiers from native errors.
  Alert.alert(i18n.t('main:ui_operation_error_title'), i18n.t('main:ui_operation_error'));
}

/** Prevent duplicate taps before React has rendered the blocking indicator. */
const pending = new WeakSet<(v: boolean) => void>();
export async function makeLoading(setLoading: (v: boolean) => void, exec: () => Promise<unknown>): Promise<void> {
  if (pending.has(setLoading)) return;
  pending.add(setLoading);
  setLoading(true);
  try {
    await exec();
  } catch {
    reportOperationError();
  } finally {
    pending.delete(setLoading);
    setLoading(false);
  }
}
