/**
 * Phantom Theme — NeoLoop CLI
 *
 * Spectral Ghost Protocol aesthetic:
 * Abyssal void-black canvas, hyper-luminous spectral mint typography,
 * cascading ultraviolet digital rain, and solar amber highlights.
 * Engineered for the highest contrast and modern dark terminal elegance.
 */

import { ThemeTokens } from '../types.js';

export const phantom: ThemeTokens = {
  id: 'phantom',
  name: 'Phantom',
  description: 'Spectral ghost mint typography with ultraviolet matrix rain and solar amber accents',

  // True pitch abyssal void (ultra-deep dark terminal, zero eye glare)
  background: '#05060A',
  surface: '#0B0D14',
  surfaceElevated: '#121624',
  border: '#202738',

  // Crisp ghost platinum white (ultra-readable 23:1 contrast)
  text: '#EDF2F7',
  textMuted: '#7989A0',

  // Spectral Mint prompt, Ultraviolet accent, Solar Amber secondary
  accent: '#00FFA3',
  accentStrong: '#A855F7',
  secondary: '#FFB703',

  // Razor-sharp Spectral Mint 3D ASCII logo with deep jade shadow bevels
  logo: '#00FFA3',
  logoGlow: '#007A4D',

  // Cascading Ultraviolet / Electric Purple rain with lilac-white drop heads
  matrixRain: '#A855F7',
  matrixRainHead: '#F3E8FF',

  // Solar Amber tagline with pure diamond white sweep
  tagline: '#FFB703',
  shimmer: '#FFFFFF',

  // Live input & cursor
  inputBorder: '#A855F7',
  inputText: '#00FFA3',
  inputPlaceholder: '#4A576D',
  cursor: '#00FFA3',

  // Deep royal ultraviolet selection
  selection: '#2D154B',

  // Conversation talk styling
  userTalk: {
    prompt: '#00FFA3',
    text: '#00FFA3',
    border: '#A855F7',
  },
  agentTalk: {
    badge: '#A855F7',
    text: '#EDF2F7',
    dim: '#7989A0',
  },

  // Semantic status tokens
  success: '#00FFA3',
  warning: '#FFB703',
  error: '#FF2A6D',
};

export default phantom;
