/**
 * NeoLoop CLI — Built-in Themes Registry
 *
 * Imports individual themes from their dedicated modular directories
 * and registers them for lookup, listing, and live switching.
 */

import { ThemeTokens } from './types.js';
import { redEclipse } from './red-eclipse/index.js';
import { duskCircuit } from './dusk-circuit/index.js';
import { cyberpunk } from './cyberpunk/index.js';
import { neonTokyo } from './neon-tokyo/index.js';
import { arcticGold } from './arctic-gold/index.js';
import { auroraMint } from './aurora-mint/index.js';
import { royalSunset } from './royal-sunset/index.js';
import { ghostProtocol } from './ghost-protocol/index.js';
import { roseSignature } from './rose-signature/index.js';
import { deepSpace } from './deep-space/index.js';

// Export individual theme modules
export * from './red-eclipse/index.js';
export * from './dusk-circuit/index.js';
export * from './cyberpunk/index.js';
export * from './neon-tokyo/index.js';
export * from './arctic-gold/index.js';
export * from './aurora-mint/index.js';
export * from './royal-sunset/index.js';
export * from './ghost-protocol/index.js';
export * from './rose-signature/index.js';
export * from './deep-space/index.js';

export const themes: Record<string, ThemeTokens> = {
  'red-eclipse':    redEclipse,
  'dusk-circuit':   duskCircuit,
  cyberpunk,
  'neon-tokyo':     neonTokyo,
  'arctic-gold':    arcticGold,
  'aurora-mint':    auroraMint,
  'royal-sunset':   royalSunset,
  'ghost-protocol': ghostProtocol,
  'rose-signature': roseSignature,
  'deep-space':     deepSpace,
};

export const DEFAULT_THEME_ID = 'red-eclipse';
export const defaultTheme: ThemeTokens = redEclipse;

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
