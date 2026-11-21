/**
 * NeoLoop CLI — Built-in Themes Registry
 *
 * Imports individual themes from their dedicated modular directories
 * and registers them for lookup, listing, and live switching.
 */

import { ThemeTokens } from './types.js';
import { phantom } from './phantom/index.js';
import { akira } from './akira/index.js';
import { matrix } from './matrix/index.js';
import { cyberpunk } from './cyberpunk/index.js';
import { dracula } from './dracula/index.js';

// Export individual theme modules
export * from './phantom/index.js';
export * from './akira/index.js';
export * from './matrix/index.js';
export * from './cyberpunk/index.js';
export * from './dracula/index.js';

export const themes: Record<string, ThemeTokens> = {
  phantom,
  akira,
  matrix,
  cyberpunk,
  dracula,
};

export const DEFAULT_THEME_ID = 'cyberpunk';
export const defaultTheme: ThemeTokens = cyberpunk;

/**
 * Find a theme by id or case-insensitive name.
 */
export function findTheme(idOrName: string): ThemeTokens | undefined {
  const query = idOrName.trim().toLowerCase();
  if (themes[query]) return themes[query];
  return Object.values(themes).find(
    t => t.name.toLowerCase() === query || t.id.toLowerCase() === query
  );
}

/**
 * List all registered themes.
 */
export function listThemes(): ThemeTokens[] {
  return Object.values(themes);
}
