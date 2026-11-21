/**
 * Akira Theme — NeoLoop CLI
 *
 * Crimson Protocol aesthetic inspired by neo-Tokyo cyberpunk:
 * Pitch-dark obsidian canvas, intense laser crimson typography,
 * cascading molten amber-gold digital rain, and electric cyan accents.
 */

import { ThemeTokens } from '../types.js';

export const akira: ThemeTokens = {
  id: 'akira',
  name: 'Akira',
  description: 'Crimson protocol with laser gold rain and electric cyan accents',

  // Deep dark obsidian surfaces (dark terminal look, no glare)
  background: '#070509',
  surface: '#0E0B12',
  surfaceElevated: '#17121F',
  border: '#2B1736',

  // Warm readable high-contrast text
  text: '#F5EBE6',
  textMuted: '#8C7A91',

  // Molten Gold prompt, Crimson Red accent, Electric Cyan secondary
  accent: '#FFB800',
  accentStrong: '#FF1E44',
  secondary: '#00E5FF',

  // Menacing Crimson Red 3D Logo with blood-shadow bevels
  logo: '#FF1E44',
  logoGlow: '#990B22',

  // Cascading Molten Amber digital rain with star-white drop heads
  matrixRain: '#FFB800',
  matrixRainHead: '#FFF8E7',

  // Electric Cyan tagline sweeping to pure diamond white
  tagline: '#00E5FF',
  shimmer: '#FFFFFF',

  // Input & Cursor
  inputText: '#F5EBE6',
  inputPlaceholder: '#5C4A63',
  cursor: '#FF1E44',

  // Dark wine red selection
  selection: '#420E1E',

  // Semantic feedback
  success: '#00E5FF',
  warning: '#FFB800',
  error: '#FF1E44',
};

export default akira;
