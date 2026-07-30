export type ThemeName = 'light' | 'dark';

/** Numeric palette mirrored from the CSS variables, for the Three.js scene. */
export interface SceneTheme {
  stoneLine: number;
  fillLight: number;
  fillMid: number;
  sage: number;
  clay: number;
  slate: number;
  grass: number;
  grassEdge: number;
  labelInk: string;
  labelInkSel: string;
  labelFree: string;
  labelFull: string;
}

export const SCENE_THEMES: Record<ThemeName, SceneTheme> = {
  light: {
    stoneLine: 0x475569,
    fillLight: 0xdbe1ea,
    fillMid: 0xc3ccd8,
    sage: 0x10b981,
    clay: 0xd97706,
    slate: 0x4f46e5,
    grass: 0x8fa58c,
    grassEdge: 0x748a71,
    labelInk: '#0f172a',
    labelInkSel: '#4338ca',
    labelFree: '#047857',
    labelFull: '#b45309',
  },
  dark: {
    stoneLine: 0x94a3b8,
    // Lifted well above the night-sky background so slabs stay readable.
    fillLight: 0x4a5670,
    fillMid: 0x5f6f96,
    sage: 0x34d399,
    clay: 0xfbbf24,
    slate: 0x818cf8,
    grass: 0x2f3d33,
    grassEdge: 0x415041,
    labelInk: '#e2e8f0',
    labelInkSel: '#c7d2fe',
    labelFree: '#6ee7b7',
    labelFull: '#fcd34d',
  },
};
