import {makeLoading} from '../loading';
import {Alert} from 'react-native';
jest.mock('react-native', () => ({Alert: {alert: jest.fn()}}));
jest.mock('@/i18n', () => ({t: (key: string) => key}));
test('duplicate taps do not run overlapping operations', async () => {
  const setLoading = jest.fn();
  let finish!: () => void;
  const exec = jest.fn(() => new Promise<void>(resolve => { finish = resolve; }));
  const first = makeLoading(setLoading, exec);
  await makeLoading(setLoading, exec);
  expect(exec).toHaveBeenCalledTimes(1);
  finish(); await first;
  expect(setLoading.mock.calls).toEqual([[true], [false]]);
});
test('errors produce a privacy-safe message and always clear loading', async () => {
  const setLoading = jest.fn();
  await makeLoading(setLoading, async () => { throw Error('SECRET activation'); });
  expect(Alert.alert).toHaveBeenCalledWith('main:ui_operation_error_title', 'main:ui_operation_error');
  expect(setLoading).toHaveBeenLastCalledWith(false);
});
