/**
 * NeoLoop CLI — Unified Theme Engine & Palette Definitions
 *
 * Single source of truth for color themes across the terminal CLI.
 * Uses the rich ThemeTokens specifications from src/theme/.
 */

import fs from 'fs';
import os from 'os';
import path from 'path';
import type { ThemeTokens } from '../theme/types.js';
import { listThemes, findTheme, DEFAULT_THEME_ID, defaultTheme } from '../theme/themes.js';
import {
  parseHex,
  rgbToHex,
  lerp,
  lerpColor,
  generateMultiRainPalettes,
  generateShimmerColor,
} from '../theme/manager.js';

export type Theme = ThemeTokens;
export { ThemeTokens };

export const THEMES: ThemeTokens[] = listThemes();
export { DEFAULT_THEME_ID };

/**
 * Find a theme by id or case-insensitive name, falling back to default theme.
 */
export function getTheme(idOrName: string): ThemeTokens {
  return findTheme(idOrName) || findTheme(DEFAULT_THEME_ID) || defaultTheme;
}

/**
 * Returns true if the color is too dark to read against dark #0a0a0a terminal canvas.
 */
export function isTooDarkOnDark(hexColor: string): boolean {
  const rgb = parseHex(hexColor);
  const lum = 0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b;
  return lum < 60;
}

/**
 * Pick the readable color for theme name text in picker: falls back to tagline if logo is too dark.
 */
export function getThemeDisplayNameColor(theme: ThemeTokens): string {
  if (isTooDarkOnDark(theme.logo)) {
    return theme.tagline;
  }
  return theme.logo;
}

// ---------------------------------------------------------------------------
// Theme Persistence (~/.neoloop/config.json)
// ---------------------------------------------------------------------------

export function loadSavedThemeId(): string {
  try {
    const configDir = path.join(os.homedir(), '.neoloop');
    const configFile = path.join(configDir, 'config.json');
    if (fs.existsSync(configFile)) {
      const data = JSON.parse(fs.readFileSync(configFile, 'utf8'));
      if (typeof data.theme === 'string' && data.theme) {
        const found = findTheme(data.theme);
        if (found) {
          return found.id;
        }
      }
    }
  } catch {
    // Ignore corrupt or unreadable file, return default
  }
  return DEFAULT_THEME_ID;
}

export function saveThemeId(themeId: string): void {
  try {
    const configDir = path.join(os.homedir(), '.neoloop');
    const configFile = path.join(configDir, 'config.json');
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }
    fs.writeFileSync(configFile, JSON.stringify({ theme: themeId }, null, 2), 'utf8');
  } catch {
    // Ignore file write errors
  }
}

export {
  parseHex,
  rgbToHex,
  lerp,
  lerpColor,
  generateMultiRainPalettes,
  generateShimmerColor,
};
