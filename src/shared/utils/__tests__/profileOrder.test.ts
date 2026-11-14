import {profileOrderKey, parseProfileOrder, orderProfiles, moveProfile, profileOrderLabel} from '../profileOrder';

const a = {iccid: 'a', profileState: 1}, b = {iccid: 'b', profileState: 0}, c = {iccid: 'c', profileState: 0};
test('order follows eUICC identity rather than a reused reader/slot identity', () => {
  expect(profileOrderKey(undefined)).toBeNull();
  expect(profileOrderKey('reader-1')).toBeNull();
  expect(profileOrderKey('1'.repeat(32))).not.toEqual(profileOrderKey('2'.repeat(32)));
  expect(profileOrderKey('1'.repeat(32))).toEqual(profileOrderKey('1'.repeat(32)));
});
test('damaged stored preferences fall back without dropping profiles', () => {
  for (const value of ['oops', '{}', 'null', '1']) expect(parseProfileOrder(value)).toEqual([]);
  expect(parseProfileOrder('["b",null,1,"a","b",""]')).toEqual(['b', 'a']);
  expect(orderProfiles([a, b], [])).toEqual([a, b]);
});
test('saved order survives chip refresh, app restart serialization and enabled-state changes', () => {
  const stored = JSON.stringify(['b', 'a']);
  const nextA = {...a, profileState: 0}, nextB = {...b, profileState: 1};
  const source = Object.freeze([Object.freeze(nextA), Object.freeze(nextB)]);
  const result = orderProfiles(source, parseProfileOrder(stored));
  expect(result).toEqual([nextB, nextA]);
  expect(result[0]).toBe(nextB);
  expect(source).toEqual([nextA, nextB]);
});
test('new profiles append and deleted profiles are not resurrected by old saved or dragged IDs', () => {
  expect(orderProfiles([a, b, c], ['b', 'a'])).toEqual([b, a, c]);
  expect(orderProfiles([b, c], ['a', 'b', 'b'])).toEqual([b, c]);
  expect(orderProfiles([], ['a', 'b'])).toEqual([]);
});
test('accessible arrows obey list boundaries without changing the input', () => {
  const ids = Object.freeze(['a', 'b', 'c']);
  expect(moveProfile(ids, 'a', -1)).toEqual(ids);
  expect(moveProfile(ids, 'c', 1)).toEqual(ids);
  expect(moveProfile(ids, 'absent', 1)).toEqual(ids);
  expect(moveProfile(ids, 'b', -1)).toEqual(['b', 'a', 'c']);
  expect(moveProfile(ids, 'b', 1)).toEqual(['a', 'c', 'b']);
  expect(ids).toEqual(['a', 'b', 'c']);
});

test('sort labels remove legacy nickname metadata without changing the card nickname', () => {
  const profile = {...a, profileNickname: 'My card t:private_tag d:270101 ^abc', profileName: 'Card',
    serviceProviderName: 'Provider', profileOwnerMccMnc: '23410'};
  expect(profileOrderLabel(profile, 'none', 'Profile')).toBe('My card');
  expect(profile.profileNickname).toContain('^abc');
});

test('sort names and accessibility labels follow strict privacy and hide phone digits', () => {
  const profile = {...a, profileNickname: 'Private Alice +447700900123', profileName: 'Card',
    serviceProviderName: 'Provider', profileOwnerMccMnc: '23410'};
  expect(profileOrderLabel(profile, 'hard', 'Profile')).toBe('Provider');
  expect(profileOrderLabel(profile, 'medium', 'Profile')).not.toContain('447700900123');
  expect(profileOrderLabel(profile, 'block', 'Profile')).not.toMatch(/Alice|Provider|447700900123/);
});
