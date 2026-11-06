import {toggleProfile, isDisableProtected} from '../profileActions';
import {preferences} from '@/shared/storage';
import type {Adapter} from '@/lpa/adapters/Adapter';
import {Alert} from 'react-native';
jest.mock('react-native', () => ({Alert: {alert: jest.fn()}}));
jest.mock('@/i18n', () => ({t: (key: string) => key}));
jest.mock('@/shared/storage', () => ({preferences: {getString: jest.fn()}}));

beforeEach(() => jest.clearAllMocks());
test.each([undefined, 'on', 'unexpected'])('OMAPI protection defaults on for %s', setting => {
  expect(isDisableProtected('omapi', setting, false)).toBe(true);
});
test('explicit opt-out works outside simplified mode, and external readers remain supported', () => {
  expect(isDisableProtected('omapi', 'off', false)).toBe(false);
  expect(isDisableProtected('omapi', 'off', true)).toBe(true);
  expect(isDisableProtected('ccid', undefined, true)).toBe(false);
});
test('shared list/detail action blocks direct disable but still enables a target', async () => {
  (preferences.getString as jest.Mock).mockReturnValue(undefined);
  const adapter = {device: {type: 'omapi'}, disableProfileByIccId: jest.fn(), enableProfileByIccId: jest.fn()} as unknown as Adapter;
  await toggleProfile(adapter, 'synthetic', true);
  expect(adapter.disableProfileByIccId).not.toHaveBeenCalled();
  expect(Alert.alert).toHaveBeenCalledTimes(1);
  await toggleProfile(adapter, 'target', false);
  expect(adapter.enableProfileByIccId).toHaveBeenCalledWith('target');
});
