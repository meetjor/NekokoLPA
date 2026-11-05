/**
 * Surface and text ramps for the 2026 redesign.
 *
 * Transcribed from the `lpa-redesign` prototype (Claude Design project
 * `NekokoLPA 1`, `templates/lpa-redesign/LpaRedesign.dc.html`), which defines
 * the two schemes as CSS custom properties on the device frame. These are the
 * neutral ramps only — the accent is still user-selectable and comes from
 * `presetColors`, so anything derived from it lives in `generateThemes`.
 *
 * The ramp is deliberately four steps of neutral (`bg` → `surface` →
 * `surface2` → `line`) plus three of text (`fg` → `fg2` → `fg3`). Screens are
 * built by stacking those, not by inventing intermediate greys: a list is a
 * `line`-coloured block with `surface` rows separated by 1px gaps, which is how
 * the prototype gets hairline dividers without per-row borders.
 */
export interface Ramp {
  /** Page background, behind everything. */
  bg: string;
  /** Cards, rows, headers, sheets. */
  surface: string;
  /** Recessed fills: segmented controls, tag chips, flag tiles, off switches. */
  surface2: string;
  /** Hairlines, and the gap colour behind 1px-separated row groups. */
  line: string;
  /** Diagonal hatch on placeholder areas, e.g. the camera preview. */
  stripe: string;
  /** Primary text. */
  fg: string;
  /** Secondary text: subtitles, row labels, body copy. */
  fg2: string;
  /** Tertiary text: mono micro-labels, metadata, disabled glyphs. */
  fg3: string;
  /** Success — completed install steps, "enabled" status dot. */
  ok: string;
  /** Destructive — delete actions, `delete` notification badges. */
  danger: string;
}

export const lightRamp: Ramp = {
  bg: '#f2f3f6',
  surface: '#ffffff',
  surface2: '#eceef2',
  line: '#e3e5ea',
  stripe: '#dfe2e8',
  fg: '#0d0e11',
  fg2: '#5f636b',
  fg3: '#93979f',
  ok: '#17a05c',
  danger: '#e0484d',
};

export const darkRamp: Ramp = {
  bg: '#101820',
  surface: '#1B2632',
  surface2: '#253341',
  line: '#344252',
  stripe: '#2C3B49',
  fg: '#F1F5F9',
  fg2: '#A7B3C0',
  fg3: '#8C9BAA',
  ok: '#43CD88',
  danger: '#E97880',
};

export function rampFor(scheme: 'light' | 'dark'): Ramp {
  return scheme === 'dark' ? darkRamp : lightRamp;
}
