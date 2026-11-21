/**
 * NeoLoop CLI — Theme Manager & Color Math Engine
 *
 * Manages active theme state, broadcasts change notifications to active
 * render loops (ANSI raw engine & React tree), and provides mathematical
 * color interpolation for matrix rain cascades and continuous shimmers.
 */

import { ThemeTokens, ThemeListener } from './types.js';
import { defaultTheme, findTheme } from './themes.js';

// ---------------------------------------------------------------------------
// Color Math Helpers
// ---------------------------------------------------------------------------

export interface Rgb {
  r: number;
  g: number;
  b: number;
}

export function parseHex(hexStr: string): Rgb {
  const clean = hexStr.replace('#', '').trim();
  if (clean.length === 3) {
    return {
      r: parseInt(clean[0]! + clean[0]!, 16),
      g: parseInt(clean[1]! + clean[1]!, 16),
      b: parseInt(clean[2]! + clean[2]!, 16),
    };
  }
  return {
    r: parseInt(clean.slice(0, 2) || '0', 16),
    g: parseInt(clean.slice(2, 4) || '0', 16),
    b: parseInt(clean.slice(4, 6) || '0', 16),
  };
}

export function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  return (
    '#' +
    [clamp(r), clamp(g), clamp(b)]
      .map(v => v.toString(16).padStart(2, '0'))
      .join('')
  );
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function lerpColor(c1: string, c2: string, t: number): string {
  const rgb1 = parseHex(c1);
  const rgb2 = parseHex(c2);
  const ct = Math.max(0, Math.min(1, t));
  return rgbToHex(
    lerp(rgb1.r, rgb2.r, ct),
    lerp(rgb1.g, rgb2.g, ct),
    lerp(rgb1.b, rgb2.b, ct)
  );
}

// ---------------------------------------------------------------------------
// Dynamic Palettes for Rain & Shimmer
// ---------------------------------------------------------------------------

export interface RainPalette {
  head: string;
  shades: string[];
  splashColors: string[];
}

/**
 * Generate 21 smooth shading levels from ambient darkness up to full theme matrixRain color.
 */
export function generateMatrixRainPalette(theme: ThemeTokens, levels = 20): RainPalette {
  const rainRgb = parseHex(theme.matrixRain);
  const bgRgb = parseHex(theme.background);

  const shades: string[] = [];
  for (let i = 0; i <= levels; i++) {
    const t = i / levels;
    // Ambient blend at bottom of trail (subtle glow rather than pure black)
    const factor = 0.08 + 0.92 * Math.pow(t, 1.4);
    const r = lerp(bgRgb.r * 0.4, rainRgb.r, factor);
    const g = lerp(bgRgb.g * 0.4, rainRgb.g, factor);
    const b = lerp(bgRgb.b * 0.4, rainRgb.b, factor);
    shades.push(rgbToHex(r, g, b));
  }

  const head = theme.matrixRainHead || theme.shimmer || '#FFFFFF';
  const s17 = shades[Math.min(shades.length - 1, Math.round(levels * 0.85))]!;
  const s11 = shades[Math.min(shades.length - 1, Math.round(levels * 0.55))]!;
  const s5 = shades[Math.min(shades.length - 1, Math.round(levels * 0.25))]!;

  return {
    head,
    shades,
    splashColors: [head, s17, s11, s5],
  };
}

/**
 * Build one RainPalette per colour in theme.rainColors.
 * Falls back to a single palette from theme.matrixRain when rainColors is absent.
 * Each palette has its own gradient shades + a brightened head flash.
 */
export function generateMultiRainPalettes(theme: ThemeTokens, levels = 20): RainPalette[] {
  const colors =
    theme.rainColors && theme.rainColors.length > 0
      ? theme.rainColors
      : [theme.matrixRain];

  const bgRgb = parseHex(theme.background);

  return colors.map(color => {
    const rainRgb = parseHex(color);

    // Build gradient: bg dark → full colour
    const shades: string[] = [];
    for (let i = 0; i <= levels; i++) {
      const t = i / levels;
      const factor = 0.08 + 0.92 * Math.pow(t, 1.4);
      const r = lerp(bgRgb.r * 0.4, rainRgb.r, factor);
      const g = lerp(bgRgb.g * 0.4, rainRgb.g, factor);
      const b = lerp(bgRgb.b * 0.4, rainRgb.b, factor);
      shades.push(rgbToHex(r, g, b));
    }

    // Head = exact logo colour (no bleaching) — user asked for exact colours
    const head = color;

    const s17 = shades[Math.min(shades.length - 1, Math.round(levels * 0.85))]!;
    const s11 = shades[Math.min(shades.length - 1, Math.round(levels * 0.55))]!;
    const s5  = shades[Math.min(shades.length - 1, Math.round(levels * 0.25))]!;

    return { head, shades, splashColors: [head, s17, s11, s5] };
  });
}

/**
 * Compute the color of a character in the tagline during the continuous sweep shimmer.
 */
export function generateShimmerColor(theme: ThemeTokens, t: number): string {
  if (t <= 0) {
    return theme.tagline;
  }
  // Smooth cosine wave passing over:
  // 0.0 -> theme.tagline
  // 0.5 -> theme.accent
  // 0.8 -> theme.accentStrong
  // 1.0 -> theme.shimmer
  if (t < 0.5) {
    const u = t / 0.5;
    return lerpColor(theme.tagline, theme.accent, u);
  } else if (t < 0.8) {
    const u = (t - 0.5) / 0.3;
    return lerpColor(theme.accent, theme.accentStrong, u);
  } else {
    const u = (t - 0.8) / 0.2;
    return lerpColor(theme.accentStrong, theme.shimmer, u);
  }
}

// ---------------------------------------------------------------------------
// ANSI Formatter Helpers
// ---------------------------------------------------------------------------

export function ansiRgb(hexStr: string, bold = false): string {
  const { r, g, b } = parseHex(hexStr);
  return `\x1b[${bold ? '1;' : '0;'}38;2;${r};${g};${b}m`;
}

export function ansiBgRgb(hexStr: string): string {
  const { r, g, b } = parseHex(hexStr);
  return `\x1b[48;2;${r};${g};${b}m`;
}

// ---------------------------------------------------------------------------
// Active Theme State & Subscription Manager
// ---------------------------------------------------------------------------

let activeTheme: ThemeTokens = defaultTheme;
const listeners = new Set<ThemeListener>();

/**
 * Get the currently active theme.
 */
export function getCurrentTheme(): ThemeTokens {
  return activeTheme;
}

/**
 * Set the active theme by token object or name/id.
 * Immediately notifies all subscribers.
 */
export function setCurrentTheme(themeOrId: ThemeTokens | string): ThemeTokens {
  const resolved = typeof themeOrId === 'string' ? findTheme(themeOrId) : themeOrId;
  if (!resolved) {
    throw new Error(`Theme not found: "${themeOrId}"`);
  }
  activeTheme = resolved;
  for (const listener of listeners) {
    try {
      listener(activeTheme);
    } catch {
      /* ignore listener errors */
    }
  }
  return activeTheme;
}

/**
 * Subscribe to theme changes. Returns an unsubscribe function.
 */
export function onThemeChange(listener: ThemeListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
