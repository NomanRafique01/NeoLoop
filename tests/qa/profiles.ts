/**
 * NeoLoop QA - Terminal Environment Matrix Profiles
 */

export interface Profile {
  id: string;
  name: string;
  cols: number;
  rows: number;
  env?: Record<string, string>;
}

export const PROFILES: Record<string, Profile> = {
  standard: {
    id: 'standard',
    name: 'Standard 120x30 (Modern WT / PowerShell 7)',
    cols: 120,
    rows: 30,
  },
  classic: {
    id: 'classic',
    name: 'Classic 80x24 (Legacy ConHost / PowerShell 5.1)',
    cols: 80,
    rows: 24,
  },
  narrow: {
    id: 'narrow',
    name: 'Narrow 60x20 Split Pane',
    cols: 60,
    rows: 20,
  },
  compact: {
    id: 'compact',
    name: 'Compact 40x12 Small Console',
    cols: 40,
    rows: 12,
  },
  large: {
    id: 'large',
    name: 'Large 200x60 Ultra-wide',
    cols: 200,
    rows: 60,
  },
  tiny: {
    id: 'tiny',
    name: 'Extreme Tiny 20x8 (Fallback Mode)',
    cols: 20,
    rows: 8,
  },
  noColor: {
    id: 'noColor',
    name: 'NO_COLOR Environment',
    cols: 80,
    rows: 24,
    env: { NO_COLOR: '1' },
  },
  dumbTerm: {
    id: 'dumbTerm',
    name: 'TERM=dumb Host',
    cols: 80,
    rows: 24,
    env: { TERM: 'dumb' },
  },
};
