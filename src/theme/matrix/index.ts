/**
 * Matrix Theme — NeoLoop CLI
 *
 * Iconic cyberpunk terminal green phosphor matrix.
 */

import { ThemeTokens } from '../types.js';

export const matrix: ThemeTokens = {
  id: 'matrix',
  name: 'Matrix',
  description: 'Iconic cyberpunk terminal green phosphor matrix',

  background: '#030D06',
  surface: '#081B0E',
  surfaceElevated: '#0F2C17',
  border: '#1F9E47',

  text: '#D7FFE1',
  textMuted: '#6FBF8C',

  accent: '#39FF6A',
  accentStrong: '#1F9E47',
  secondary: '#39FF88',

  logo: '#39FF6A',
  logoGlow: '#1F9E47',

  matrixRain: '#39FF6A',
  matrixRainHead: '#D7FFE1',

  tagline: '#39FF88',
  shimmer: '#FFFFFF',

  inputText: '#39FF88',
  inputPlaceholder: '#1F9E47',
  cursor: '#D7FFE1',

  selection: '#1F9E47',

  success: '#39FF6A',
  warning: '#FFD078',
  error: '#FF7185',
};

export default matrix;
