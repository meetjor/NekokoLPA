/// <reference types="jest" />
import {
  DEFAULT_THEME_COLOR,
  isPresetColor,
  LEGACY_DEFAULT_THEME_COLOR,
  migrateLegacyDefaultColor,
  PRESET_COLORS,
} from '../presetColors';

describe('accent presets', () => {
  it('defaults to azure, and azure is offered in the palette', () => {
    expect(DEFAULT_THEME_COLOR).toBe('#2889E8');
    expect(isPresetColor(DEFAULT_THEME_COLOR)).toBe(true);
    expect(PRESET_COLORS[0]).toEqual({value: '#2889E8', label: 'Tech Blue'});
  });

  it('offers distinct colours', () => {
    expect(PRESET_COLORS).toHaveLength(13);
    expect(new Set(PRESET_COLORS.map(c => c.value.toLowerCase())).size).toBe(13);
  });
});

describe('migrateLegacyDefaultColor', () => {
  it('clears a stored value that is only the old default', () => {
    expect(migrateLegacyDefaultColor(LEGACY_DEFAULT_THEME_COLOR)).toBeUndefined();
    expect(migrateLegacyDefaultColor('#813ff3')).toBeUndefined();
  });

  it('keeps a colour the user actually chose', () => {
    expect(migrateLegacyDefaultColor('#DC2626')).toBe('#DC2626');
    expect(migrateLegacyDefaultColor('my')).toBe('my');
  });

  it('leaves an unset preference unset', () => {
    expect(migrateLegacyDefaultColor(undefined)).toBeUndefined();
  });
});
