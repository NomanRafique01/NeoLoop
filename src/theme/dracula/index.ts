/**
 * Dracula Theme — NeoLoop CLI
 *
 * Gothic vampire purple with neon lilac and cyan accents.
 */

import { ThemeTokens } from '../types.js';

export const dracula: ThemeTokens = {
  id: 'dracula',
  name: 'Dracula',
  description: 'Gothic vampire purple with neon lilac and cyan accents',

  background: '#0D0D17',
  surface: '#191A2E',
  surfaceElevated: '#282A4A',
  border: '#44477A',

  text: '#F8F8F2',
  textMuted: '#9B9EB8',

  accent: '#BD93F9',
  accentStrong: '#FF79C6',
  secondary: '#8BE9FD',

  logo: '#BD93F9',
  logoGlow: '#6272A4',

  matrixRain: '#BD93F9',
  matrixRainHead: '#F8F8F2',

  tagline: '#8BE9FD',
  shimmer: '#FFFFFF',

  inputBorder: '#FF79C6',
  inputText: '#BD93F9',
  inputPlaceholder: '#6272A4',
  cursor: '#BD93F9',

  selection: '#44477A',

  // Conversation talk styling
  userTalk: {
    prompt: '#BD93F9',
    text: '#BD93F9',
    border: '#FF79C6',
  },
  agentTalk: {
    badge: '#FF79C6',
    text: '#8BE9FD',
    dim: '#9B9EB8',
  },

  success: '#50FA7B',
  warning: '#F1FA8C',
  error: '#FF5555',
};

export default dracula;
